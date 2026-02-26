-- Intranet Base - visitante con visualizacion documental restringida + solicitud de descarga

-- Permitir nuevo tipo de evento de notificacion para solicitud de descarga
alter table public.notifications
drop constraint if exists notifications_event_type_check;

alter table public.notifications
add constraint notifications_event_type_check
check (
  event_type in (
    'document_uploaded',
    'document_approved',
    'document_rejected',
    'document_download_requested'
  )
);

-- Documents: visitante puede visualizar metadata documental (sin descarga directa; storage select se mantiene restringido)
drop policy if exists documents_select_privileged on public.documents;
create policy documents_select_privileged
on public.documents
for select
using (
  public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role,
    'contabilidad'::public.app_role,
    'visitante'::public.app_role
  )
);

-- Notifications: preservar reglas previas + permitir solicitud de descarga desde visitante
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
  or (
    public.current_app_role() = 'visitante'::public.app_role
    and event_type = 'document_download_requested'
    and created_by = auth.uid()
  )
);
