-- Intranet Base - distributed auth rate limiter in Postgres

create table if not exists public.auth_rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auth_rate_limits_count_positive check (count >= 0),
  constraint auth_rate_limits_key_length check (length(key) between 3 and 200)
);

create index if not exists idx_auth_rate_limits_reset_at
on public.auth_rate_limits (reset_at);

create or replace function public.check_auth_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_now timestamptz;
  v_limit integer;
  v_window_seconds integer;
  v_entry public.auth_rate_limits%rowtype;
  v_retry_after_seconds integer;
begin
  v_now := now();
  v_key := lower(trim(coalesce(p_key, '')));
  v_limit := greatest(coalesce(p_limit, 0), 1);
  v_window_seconds := greatest(coalesce(p_window_seconds, 0), 1);

  if length(v_key) < 3 or length(v_key) > 200 then
    raise exception 'INVALID_KEY';
  end if;

  if left(v_key, 3) not in ('ip:', 'em:') then
    raise exception 'INVALID_KEY_PREFIX';
  end if;

  -- purge stale entries opportunistically
  delete from public.auth_rate_limits
  where reset_at <= (v_now - interval '5 minutes');

  insert into public.auth_rate_limits (key, count, reset_at)
  values (v_key, 1, v_now + make_interval(secs => v_window_seconds))
  on conflict (key) do nothing;

  select *
  into v_entry
  from public.auth_rate_limits
  where key = v_key
  for update;

  if not found then
    return jsonb_build_object('ok', true, 'retry_after_seconds', 0);
  end if;

  if v_now >= v_entry.reset_at then
    update public.auth_rate_limits
    set count = 1,
        reset_at = v_now + make_interval(secs => v_window_seconds),
        updated_at = v_now
    where key = v_key;

    return jsonb_build_object('ok', true, 'retry_after_seconds', 0);
  end if;

  if v_entry.count >= v_limit then
    v_retry_after_seconds := greatest(1, ceil(extract(epoch from (v_entry.reset_at - v_now)))::integer);
    return jsonb_build_object('ok', false, 'retry_after_seconds', v_retry_after_seconds);
  end if;

  update public.auth_rate_limits
  set count = v_entry.count + 1,
      updated_at = v_now
  where key = v_key;

  return jsonb_build_object('ok', true, 'retry_after_seconds', 0);
end;
$$;

create or replace function public.clear_auth_rate_limit(
  p_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
begin
  v_key := lower(trim(coalesce(p_key, '')));
  if length(v_key) < 3 or length(v_key) > 200 then
    return;
  end if;

  delete from public.auth_rate_limits
  where key = v_key;
end;
$$;

revoke all on table public.auth_rate_limits from public;
revoke all on table public.auth_rate_limits from anon;
revoke all on table public.auth_rate_limits from authenticated;

revoke all on function public.check_auth_rate_limit(text, integer, integer) from public;
revoke all on function public.clear_auth_rate_limit(text) from public;

grant execute on function public.check_auth_rate_limit(text, integer, integer) to anon;
grant execute on function public.check_auth_rate_limit(text, integer, integer) to authenticated;
grant execute on function public.check_auth_rate_limit(text, integer, integer) to service_role;

grant execute on function public.clear_auth_rate_limit(text) to anon;
grant execute on function public.clear_auth_rate_limit(text) to authenticated;
grant execute on function public.clear_auth_rate_limit(text) to service_role;
