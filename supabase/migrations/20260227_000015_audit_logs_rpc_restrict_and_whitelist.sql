-- Intranet Base - endurecer insert_audit_log:
-- - solo invocable por service_role
-- - accion en whitelist (enum)
-- - validacion de actor/perfil para evitar spoofing por payload arbitrario

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'audit_action'
  ) then
    create type public.audit_action as enum ('auth_login');
  end if;
end
$$;

alter type public.audit_action add value if not exists 'auth_login';
alter type public.audit_action add value if not exists 'auth_logout';
alter type public.audit_action add value if not exists 'worker_created';
alter type public.audit_action add value if not exists 'worker_updated';
alter type public.audit_action add value if not exists 'worker_status_changed';
alter type public.audit_action add value if not exists 'worker_archived';
alter type public.audit_action add value if not exists 'worker_deleted';
alter type public.audit_action add value if not exists 'worker_unarchived';
alter type public.audit_action add value if not exists 'worker_access_created';
alter type public.audit_action add value if not exists 'worker_access_bulk_created';
alter type public.audit_action add value if not exists 'worker_access_suspended';
alter type public.audit_action add value if not exists 'worker_access_activated';
alter type public.audit_action add value if not exists 'document_uploaded';
alter type public.audit_action add value if not exists 'document_approved';
alter type public.audit_action add value if not exists 'document_rejected';
alter type public.audit_action add value if not exists 'document_downloaded';
alter type public.audit_action add value if not exists 'document_download_requested';
alter type public.audit_action add value if not exists 'document_download_request_approved';
alter type public.audit_action add value if not exists 'document_download_request_rejected';
alter type public.audit_action add value if not exists 'user_created';
alter type public.audit_action add value if not exists 'user_updated';
alter type public.audit_action add value if not exists 'user_password_reset';
alter type public.audit_action add value if not exists 'user_deleted';
alter type public.audit_action add value if not exists 'profile_role_worker_updated';

drop function if exists public.insert_audit_log(
  uuid,
  public.app_role,
  text,
  text,
  uuid,
  jsonb,
  inet,
  text
);

create or replace function public.insert_audit_log(
  p_actor_user_id uuid,
  p_actor_role public.app_role,
  p_action public.audit_action,
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
  v_request_role text;
  v_profile_role public.app_role;
  v_metadata jsonb;
  v_inserted_id bigint;
begin
  v_request_role := coalesce(auth.role(), '');
  if v_request_role <> 'service_role' then
    raise exception 'FORBIDDEN';
  end if;

  if p_actor_user_id is null then
    raise exception 'ACTOR_REQUIRED';
  end if;

  select p.role
  into v_profile_role
  from public.profiles p
  where p.id = p_actor_user_id;

  if not found then
    raise exception 'ACTOR_PROFILE_NOT_FOUND';
  end if;

  if p_actor_role is distinct from v_profile_role then
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
    p_actor_user_id,
    p_actor_role,
    p_action::text,
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
  public.audit_action,
  text,
  uuid,
  jsonb,
  inet,
  text
) from public;

revoke execute on function public.insert_audit_log(
  uuid,
  public.app_role,
  public.audit_action,
  text,
  uuid,
  jsonb,
  inet,
  text
) from anon;

revoke execute on function public.insert_audit_log(
  uuid,
  public.app_role,
  public.audit_action,
  text,
  uuid,
  jsonb,
  inet,
  text
) from authenticated;

grant execute on function public.insert_audit_log(
  uuid,
  public.app_role,
  public.audit_action,
  text,
  uuid,
  jsonb,
  inet,
  text
) to service_role;
