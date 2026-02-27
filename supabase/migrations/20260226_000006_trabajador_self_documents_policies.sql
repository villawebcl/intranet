-- Intranet Base - politicas para rol trabajador con acceso solo a su documentacion

create index if not exists idx_profiles_worker_id on public.profiles (worker_id);

create or replace function public.current_profile_worker_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.worker_id
  from public.profiles p
  where p.id = auth.uid()
$$;

-- Workers: trabajador solo puede ver su propio registro
drop policy if exists workers_select_authenticated on public.workers;
drop policy if exists workers_select_scoped on public.workers;
create policy workers_select_scoped
on public.workers
for select
using (
  auth.role() = 'authenticated'
  and (
    public.current_app_role() <> 'trabajador'::public.app_role
    or id = public.current_profile_worker_id()
  )
);

-- Documents: trabajador solo puede ver metadata documental de su worker asignado
drop policy if exists documents_select_authenticated on public.documents;
drop policy if exists documents_select_privileged on public.documents;
drop policy if exists documents_select_scoped on public.documents;
create policy documents_select_scoped
on public.documents
for select
using (
  public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role,
    'contabilidad'::public.app_role,
    'visitante'::public.app_role
  )
  or (
    public.current_app_role() = 'trabajador'::public.app_role
    and worker_id = public.current_profile_worker_id()
  )
);

-- Storage: trabajador solo puede leer archivos asociados a documentos de su worker asignado
drop policy if exists storage_documents_select_authenticated on storage.objects;
drop policy if exists storage_documents_select_privileged on storage.objects;
drop policy if exists storage_documents_select_scoped on storage.objects;
create policy storage_documents_select_scoped
on storage.objects
for select
using (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.documents d
    where d.file_path = name
      and (
        public.current_app_role() in (
          'admin'::public.app_role,
          'rrhh'::public.app_role,
          'contabilidad'::public.app_role,
          'visitante'::public.app_role
        )
        or (
          public.current_app_role() = 'trabajador'::public.app_role
          and d.worker_id = public.current_profile_worker_id()
        )
      )
  )
);
