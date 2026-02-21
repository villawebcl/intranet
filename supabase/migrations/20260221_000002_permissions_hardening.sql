-- Intranet Anagami - Permissions hardening (MVP)

-- Documents: visitante without access; contabilidad read-only.
drop policy if exists documents_select_authenticated on public.documents;
drop policy if exists documents_select_privileged on public.documents;
create policy documents_select_privileged
on public.documents
for select
using (
  public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role,
    'contabilidad'::public.app_role
  )
);

drop policy if exists documents_insert_privileged on public.documents;
create policy documents_insert_privileged
on public.documents
for insert
with check (
  public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role
  )
);

drop policy if exists documents_update_privileged on public.documents;
create policy documents_update_privileged
on public.documents
for update
using (
  public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role
  )
)
with check (
  public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role
  )
);

-- Notifications: inserts only from document operators.
drop policy if exists notifications_insert_privileged on public.notifications;
create policy notifications_insert_privileged
on public.notifications
for insert
with check (
  public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role
  )
);

-- Storage: private document objects only for roles with documentary access.
drop policy if exists storage_documents_select_authenticated on storage.objects;
drop policy if exists storage_documents_select_privileged on storage.objects;
create policy storage_documents_select_privileged
on storage.objects
for select
using (
  bucket_id = 'documents'
  and public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role,
    'contabilidad'::public.app_role
  )
  and exists (
    select 1
    from public.documents d
    where d.file_path = name
  )
);

drop policy if exists storage_documents_insert_privileged on storage.objects;
create policy storage_documents_insert_privileged
on storage.objects
for insert
with check (
  bucket_id = 'documents'
  and public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role
  )
);
