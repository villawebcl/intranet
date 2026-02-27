-- Intranet Base - hardening de notificaciones de solicitud de descarga (anti-spoof visitante)

-- Referencia minima para vincular notificaciones con solicitudes reales
alter table public.notifications
add column if not exists download_request_id uuid references public.download_requests (id) on delete set null;

update public.notifications n
set download_request_id = dr.id
from public.download_requests dr
where n.event_type = 'document_download_requested'
  and n.download_request_id is null
  and (n.payload ? 'requestId')
  and (n.payload->>'requestId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and ((n.payload->>'requestId')::uuid) = dr.id;

with ranked as (
  select
    ctid,
    row_number() over (
      partition by user_id, download_request_id, event_type
      order by created_at desc, id desc
    ) as rn
  from public.notifications
  where event_type = 'document_download_requested'
    and download_request_id is not null
)
delete from public.notifications n
using ranked r
where n.ctid = r.ctid
  and r.rn > 1;

create unique index if not exists idx_notifications_download_request_user_unique
on public.notifications (user_id, download_request_id)
where event_type = 'document_download_requested' and download_request_id is not null;

-- RLS: quitar insercion directa de visitante
drop policy if exists notifications_insert_privileged on public.notifications;
create policy notifications_insert_privileged
on public.notifications
for insert
with check (
  public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role
  )
  or (
    public.current_app_role() = 'contabilidad'::public.app_role
    and event_type = 'document_uploaded'
    and coalesce(payload->>'folderType', '') = 'folder_10'
  )
);

-- RPC verificada: visitante crea notificacion solo a partir de su download_request real
create or replace function public.create_download_request_notifications(
  p_request_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_uid uuid;
  v_auth_role public.app_role;
  v_request record;
  v_inserted_count integer;
begin
  v_auth_uid := auth.uid();
  if v_auth_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_auth_role := public.current_app_role();
  if v_auth_role <> 'visitante'::public.app_role then
    raise exception 'FORBIDDEN';
  end if;

  select
    dr.id,
    dr.worker_id,
    dr.document_id,
    dr.requested_by,
    dr.reason,
    dr.status,
    d.folder_type,
    d.file_name
  into v_request
  from public.download_requests dr
  join public.documents d on d.id = dr.document_id
  where dr.id = p_request_id
    and dr.requested_by = v_auth_uid;

  if not found then
    raise exception 'DOWNLOAD_REQUEST_NOT_FOUND';
  end if;

  if v_request.status <> 'pendiente'::public.download_request_status then
    raise exception 'DOWNLOAD_REQUEST_NOT_PENDING';
  end if;

  insert into public.notifications (
    user_id,
    event_type,
    payload,
    created_by,
    download_request_id
  )
  select
    p.id,
    'document_download_requested',
    jsonb_build_object(
      'workerId', v_request.worker_id,
      'documentId', v_request.document_id,
      'requestId', v_request.id,
      'folderType', v_request.folder_type,
      'fileName', v_request.file_name,
      'requestedBy', v_request.requested_by,
      'requestReason', v_request.reason
    ),
    v_auth_uid,
    v_request.id
  from public.profiles p
  where p.role in ('admin'::public.app_role, 'rrhh'::public.app_role)
  on conflict (user_id, download_request_id)
  where event_type = 'document_download_requested' and download_request_id is not null
  do nothing;

  get diagnostics v_inserted_count = row_count;
  return coalesce(v_inserted_count, 0);
end;
$$;

revoke all on function public.create_download_request_notifications(uuid) from public;
grant execute on function public.create_download_request_notifications(uuid) to authenticated;
grant execute on function public.create_download_request_notifications(uuid) to service_role;
