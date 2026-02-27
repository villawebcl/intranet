-- Intranet Base - solicitudes de descarga con aprobacion y hardening de storage select

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'download_request_status'
  ) then
    create type public.download_request_status as enum ('pendiente', 'aprobado', 'rechazado');
  end if;
end
$$;

create table if not exists public.download_requests (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete cascade,
  reason text not null check (length(trim(reason)) between 3 and 500),
  status public.download_request_status not null default 'pendiente',
  decision_note text,
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  rejected_by uuid references auth.users (id),
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint download_requests_status_consistency check (
    (
      status = 'pendiente'::public.download_request_status
      and approved_by is null
      and approved_at is null
      and rejected_by is null
      and rejected_at is null
    )
    or (
      status = 'aprobado'::public.download_request_status
      and approved_by is not null
      and approved_at is not null
      and rejected_by is null
      and rejected_at is null
    )
    or (
      status = 'rechazado'::public.download_request_status
      and rejected_by is not null
      and rejected_at is not null
      and approved_by is null
      and approved_at is null
    )
  )
);

create index if not exists idx_download_requests_worker on public.download_requests (worker_id);
create index if not exists idx_download_requests_document on public.download_requests (document_id);
create index if not exists idx_download_requests_requested_by on public.download_requests (requested_by);
create index if not exists idx_download_requests_status on public.download_requests (status);

create unique index if not exists uniq_download_requests_pending
on public.download_requests (document_id, requested_by)
where status = 'pendiente'::public.download_request_status;

drop trigger if exists trg_download_requests_updated_at on public.download_requests;
create trigger trg_download_requests_updated_at
before update on public.download_requests
for each row
execute function public.set_updated_at();

alter table public.download_requests enable row level security;

drop policy if exists download_requests_select_scoped on public.download_requests;
create policy download_requests_select_scoped
on public.download_requests
for select
using (
  requested_by = auth.uid()
  or public.current_app_role() in ('admin'::public.app_role, 'rrhh'::public.app_role)
);

drop policy if exists download_requests_insert_visitante on public.download_requests;
create policy download_requests_insert_visitante
on public.download_requests
for insert
with check (
  requested_by = auth.uid()
  and public.current_app_role() = 'visitante'::public.app_role
  and exists (
    select 1
    from public.documents d
    where d.id = document_id
      and d.worker_id = worker_id
  )
);

drop policy if exists download_requests_update_reviewers on public.download_requests;
create policy download_requests_update_reviewers
on public.download_requests
for update
using (public.current_app_role() in ('admin'::public.app_role, 'rrhh'::public.app_role))
with check (public.current_app_role() in ('admin'::public.app_role, 'rrhh'::public.app_role));

-- Storage: visitante no puede leer archivos directamente
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
          'contabilidad'::public.app_role
        )
        or (
          public.current_app_role() = 'trabajador'::public.app_role
          and d.worker_id = public.current_profile_worker_id()
        )
      )
  )
);
