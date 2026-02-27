-- Intranet Base - hardening de audit_logs: bloquear insert directo y habilitar RPC confiable

drop policy if exists audit_logs_insert_authenticated on public.audit_logs;

revoke insert on public.audit_logs from anon;
revoke insert on public.audit_logs from authenticated;

create or replace function public.insert_audit_log(
  p_actor_user_id uuid,
  p_actor_role public.app_role,
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_uid uuid;
  v_effective_role public.app_role;
  v_action text;
  v_metadata jsonb;
  v_inserted_id bigint;
begin
  v_auth_uid := auth.uid();
  if v_auth_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_actor_user_id is distinct from v_auth_uid then
    raise exception 'ACTOR_MISMATCH';
  end if;

  v_action := trim(coalesce(p_action, ''));
  if length(v_action) = 0 then
    raise exception 'ACTION_REQUIRED';
  end if;

  v_effective_role := public.current_app_role();
  if p_actor_role is distinct from v_effective_role then
    raise exception 'ROLE_MISMATCH';
  end if;

  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    v_metadata := '{}'::jsonb;
  else
    v_metadata := p_metadata;
  end if;

  insert into public.audit_logs (
    actor_user_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    metadata,
    ip_address,
    user_agent
  )
  values (
    v_auth_uid,
    v_effective_role,
    v_action,
    nullif(trim(coalesce(p_entity_type, '')), ''),
    p_entity_id,
    v_metadata,
    p_ip_address,
    nullif(trim(coalesce(p_user_agent, '')), '')
  )
  returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

revoke all on function public.insert_audit_log(
  uuid,
  public.app_role,
  text,
  text,
  uuid,
  jsonb,
  inet,
  text
) from public;

grant execute on function public.insert_audit_log(
  uuid,
  public.app_role,
  text,
  text,
  uuid,
  jsonb,
  inet,
  text
) to authenticated;

grant execute on function public.insert_audit_log(
  uuid,
  public.app_role,
  text,
  text,
  uuid,
  jsonb,
  inet,
  text
) to service_role;
