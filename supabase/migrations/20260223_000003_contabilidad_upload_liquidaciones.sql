-- Intranet Anagami - contabilidad puede subir solo liquidaciones (folder_10)

-- Documents: permitir insert a contabilidad solo para folder_10
drop policy if exists documents_insert_privileged on public.documents;
create policy documents_insert_privileged
on public.documents
for insert
with check (
  public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role
  )
  or (
    public.current_app_role() = 'contabilidad'::public.app_role
    and folder_type = 'folder_10'::public.folder_type
  )
);

-- Notifications: permitir registro interno de upload de liquidaciones por contabilidad
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

-- Storage: permitir insert de objetos solo si la ruta corresponde a workerId/folder_10/*
drop policy if exists storage_documents_insert_privileged on storage.objects;
create policy storage_documents_insert_privileged
on storage.objects
for insert
with check (
  bucket_id = 'documents'
  and (
    public.current_app_role() in (
      'admin'::public.app_role,
      'rrhh'::public.app_role
    )
    or (
      public.current_app_role() = 'contabilidad'::public.app_role
      and split_part(name, '/', 2) = 'folder_10'
    )
  )
);
