-- Intranet Base - hardening de profiles: bloquear autoescalado de role/worker_id

-- 1) RLS: insercion/autogestion limitada al propio perfil en modo no sensible
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles
for insert
with check (
  auth.uid() = id
  and role = 'visitante'::public.app_role
  and worker_id is null
);

drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- 2) Privilegios por columna: authenticated no puede escribir role/worker_id
revoke insert on public.profiles from anon;
revoke update on public.profiles from anon;
revoke insert on public.profiles from authenticated;
revoke update on public.profiles from authenticated;

grant insert (id, full_name) on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

-- 3) RPC controlada para admin: asignar role/worker_id de forma segura
create or replace function public.admin_set_profile_role_and_worker(
  profile_user_id uuid,
  new_role public.app_role,
  new_worker_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_actor_role public.app_role;
  v_previous_role public.app_role;
  v_previous_worker_id uuid;
  v_effective_worker_id uuid;
begin
  v_actor_user_id := auth.uid();
  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_actor_role := public.current_app_role();
  if v_actor_role <> 'admin'::public.app_role then
    raise exception 'FORBIDDEN';
  end if;

  if profile_user_id is null then
    raise exception 'PROFILE_USER_ID_REQUIRED';
  end if;

  if new_role = 'trabajador'::public.app_role then
    if new_worker_id is null then
      raise exception 'WORKER_ID_REQUIRED_FOR_TRABAJADOR';
    end if;
    v_effective_worker_id := new_worker_id;
  else
    v_effective_worker_id := null;
  end if;

  if v_effective_worker_id is not null
    and not exists (
      select 1
      from public.workers w
      where w.id = v_effective_worker_id
    ) then
    raise exception 'WORKER_NOT_FOUND';
  end if;

  select p.role, p.worker_id
  into v_previous_role, v_previous_worker_id
  from public.profiles p
  where p.id = profile_user_id;

  insert into public.profiles as p (id, role, worker_id)
  values (profile_user_id, new_role, v_effective_worker_id)
  on conflict (id) do update
  set
    role = excluded.role,
    worker_id = excluded.worker_id,
    updated_at = now();

  insert into public.audit_logs (
    actor_user_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_actor_user_id,
    v_actor_role,
    'profile_role_worker_updated',
    'profile',
    profile_user_id,
    jsonb_build_object(
      'previousRole', v_previous_role,
      'newRole', new_role,
      'previousWorkerId', v_previous_worker_id,
      'newWorkerId', v_effective_worker_id
    )
  );
end;
$$;

revoke all on function public.admin_set_profile_role_and_worker(uuid, public.app_role, uuid) from public;
grant execute on function public.admin_set_profile_role_and_worker(uuid, public.app_role, uuid) to authenticated;
grant execute on function public.admin_set_profile_role_and_worker(uuid, public.app_role, uuid) to service_role;
