-- Intranet Base - ruta controlada para RRHH/Admin: asignar worker a perfil sin writes directos

create or replace function public.assign_worker_to_user(
  profile_user_id uuid,
  target_worker_id uuid
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
begin
  v_actor_user_id := auth.uid();
  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_actor_role := public.current_app_role();
  if v_actor_role not in ('admin'::public.app_role, 'rrhh'::public.app_role) then
    raise exception 'FORBIDDEN';
  end if;

  if profile_user_id is null then
    raise exception 'PROFILE_USER_ID_REQUIRED';
  end if;

  if target_worker_id is null then
    raise exception 'WORKER_ID_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.workers w
    where w.id = target_worker_id
  ) then
    raise exception 'WORKER_NOT_FOUND';
  end if;

  select p.role, p.worker_id
  into v_previous_role, v_previous_worker_id
  from public.profiles p
  where p.id = profile_user_id;

  if found and v_previous_role = 'admin'::public.app_role then
    raise exception 'ADMIN_PROFILE_PROTECTED';
  end if;

  begin
    insert into public.profiles as p (id, role, worker_id)
    values (profile_user_id, 'trabajador'::public.app_role, target_worker_id)
    on conflict (id) do update
    set
      role = excluded.role,
      worker_id = excluded.worker_id,
      updated_at = now();
  exception
    when unique_violation then
      raise exception 'WORKER_ALREADY_ASSIGNED';
  end;

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
      'newRole', 'trabajador',
      'previousWorkerId', v_previous_worker_id,
      'newWorkerId', target_worker_id,
      'source', 'assign_worker_to_user'
    )
  );
end;
$$;

revoke all on function public.assign_worker_to_user(uuid, uuid) from public;
revoke execute on function public.assign_worker_to_user(uuid, uuid) from anon;
grant execute on function public.assign_worker_to_user(uuid, uuid) to authenticated;
