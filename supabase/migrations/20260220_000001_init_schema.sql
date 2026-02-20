-- Intranet Anagami - Base schema (MVP Fase 1)

create extension if not exists pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'rrhh', 'contabilidad', 'visitante');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worker_status') THEN
    CREATE TYPE public.worker_status AS ENUM ('activo', 'inactivo');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'folder_type') THEN
    CREATE TYPE public.folder_type AS ENUM (
      'folder_01',
      'folder_02',
      'folder_03',
      'folder_04',
      'folder_05',
      'folder_06',
      'folder_07',
      'folder_08',
      'folder_09',
      'folder_10',
      'folder_11',
      'folder_12'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
    CREATE TYPE public.document_status AS ENUM ('pendiente', 'aprobado', 'rechazado');
  END IF;
END
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'visitante',
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  rut text not null unique,
  first_name text not null,
  last_name text not null,
  position text,
  area text,
  email text,
  phone text,
  status public.worker_status not null default 'activo',
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id) on delete cascade,
  folder_type public.folder_type not null,
  status public.document_status not null default 'pendiente',
  file_name text not null,
  file_path text not null unique,
  file_size_bytes integer not null check (file_size_bytes > 0 and file_size_bytes <= 5242880),
  mime_type text not null check (mime_type = 'application/pdf'),
  uploaded_by uuid references auth.users (id),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_rejection_reason_required check (
    status <> 'rechazado'::public.document_status
    OR (rejection_reason is not null AND length(trim(rejection_reason)) > 0)
  )
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  constraint notifications_event_type_check check (
    event_type in ('document_uploaded', 'document_approved', 'document_rejected')
  )
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users (id),
  actor_role public.app_role,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_workers_status on public.workers (status);
create index if not exists idx_workers_last_name on public.workers (last_name);
create index if not exists idx_documents_worker_id on public.documents (worker_id);
create index if not exists idx_documents_status on public.documents (status);
create index if not exists idx_documents_folder_type on public.documents (folder_type);
create index if not exists idx_notifications_user_id on public.notifications (user_id);
create index if not exists idx_notifications_event_type on public.notifications (event_type);
create index if not exists idx_audit_logs_actor_user_id on public.audit_logs (actor_user_id);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid()),
    'visitante'::public.app_role
  );
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_workers_updated_at on public.workers;
create trigger trg_workers_updated_at
before update on public.workers
for each row
execute function public.set_updated_at();

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.workers enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select
on public.profiles
for select
using (auth.uid() = id OR public.current_app_role() = 'admin'::public.app_role);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert
on public.profiles
for insert
with check (auth.uid() = id OR public.current_app_role() = 'admin'::public.app_role);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
on public.profiles
for update
using (auth.uid() = id OR public.current_app_role() = 'admin'::public.app_role)
with check (auth.uid() = id OR public.current_app_role() = 'admin'::public.app_role);

drop policy if exists workers_select_authenticated on public.workers;
create policy workers_select_authenticated
on public.workers
for select
using (auth.role() = 'authenticated');

drop policy if exists workers_insert_privileged on public.workers;
create policy workers_insert_privileged
on public.workers
for insert
with check (public.current_app_role() in ('admin'::public.app_role, 'rrhh'::public.app_role));

drop policy if exists workers_update_privileged on public.workers;
create policy workers_update_privileged
on public.workers
for update
using (public.current_app_role() in ('admin'::public.app_role, 'rrhh'::public.app_role))
with check (public.current_app_role() in ('admin'::public.app_role, 'rrhh'::public.app_role));

drop policy if exists documents_select_authenticated on public.documents;
create policy documents_select_authenticated
on public.documents
for select
using (auth.role() = 'authenticated');

drop policy if exists documents_insert_privileged on public.documents;
create policy documents_insert_privileged
on public.documents
for insert
with check (
  public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role,
    'contabilidad'::public.app_role
  )
);

drop policy if exists documents_update_privileged on public.documents;
create policy documents_update_privileged
on public.documents
for update
using (
  public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role,
    'contabilidad'::public.app_role
  )
)
with check (
  public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role,
    'contabilidad'::public.app_role
  )
);

drop policy if exists notifications_select_owner_or_admin on public.notifications;
create policy notifications_select_owner_or_admin
on public.notifications
for select
using (auth.uid() = user_id OR public.current_app_role() = 'admin'::public.app_role);

drop policy if exists notifications_insert_privileged on public.notifications;
create policy notifications_insert_privileged
on public.notifications
for insert
with check (
  public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role,
    'contabilidad'::public.app_role
  )
);

drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin
on public.audit_logs
for select
using (public.current_app_role() = 'admin'::public.app_role);

drop policy if exists audit_logs_insert_authenticated on public.audit_logs;
create policy audit_logs_insert_authenticated
on public.audit_logs
for insert
with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 5242880, array['application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists storage_documents_select_authenticated on storage.objects;
create policy storage_documents_select_authenticated
on storage.objects
for select
using (bucket_id = 'documents' and auth.role() = 'authenticated');

drop policy if exists storage_documents_insert_privileged on storage.objects;
create policy storage_documents_insert_privileged
on storage.objects
for insert
with check (
  bucket_id = 'documents'
  and public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role,
    'contabilidad'::public.app_role
  )
);

drop policy if exists storage_documents_update_privileged on storage.objects;
create policy storage_documents_update_privileged
on storage.objects
for update
using (
  bucket_id = 'documents'
  and public.current_app_role() in ('admin'::public.app_role, 'rrhh'::public.app_role)
)
with check (
  bucket_id = 'documents'
  and public.current_app_role() in ('admin'::public.app_role, 'rrhh'::public.app_role)
);

drop policy if exists storage_documents_delete_admin on storage.objects;
create policy storage_documents_delete_admin
on storage.objects
for delete
using (
  bucket_id = 'documents'
  and public.current_app_role() = 'admin'::public.app_role
);
