-- Intranet Base - soft delete para workers (archivado) y hardening de RLS

alter table public.workers
  add column if not exists is_active boolean not null default true,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users (id);

create index if not exists idx_workers_is_active on public.workers (is_active);
create index if not exists idx_workers_active_last_name on public.workers (is_active, last_name);

alter table public.workers
  drop constraint if exists workers_archive_consistency;

alter table public.workers
  add constraint workers_archive_consistency
  check (
    (is_active = true and deleted_at is null and deleted_by is null)
    or
    (is_active = false and deleted_at is not null and deleted_by is not null)
  );

drop policy if exists workers_update_privileged on public.workers;
drop policy if exists workers_update_active_privileged on public.workers;
create policy workers_update_active_privileged
on public.workers
for update
using (
  public.current_app_role() in ('admin'::public.app_role, 'rrhh'::public.app_role)
  and is_active = true
)
with check (
  public.current_app_role() in ('admin'::public.app_role, 'rrhh'::public.app_role)
  and is_active = true
  and deleted_at is null
  and deleted_by is null
);

drop policy if exists workers_archive_admin on public.workers;
create policy workers_archive_admin
on public.workers
for update
using (
  public.current_app_role() = 'admin'::public.app_role
  and is_active = true
)
with check (
  public.current_app_role() = 'admin'::public.app_role
  and (
    (is_active = true and deleted_at is null and deleted_by is null)
    or
    (is_active = false and deleted_at is not null and deleted_by is not null)
  )
);

drop policy if exists workers_delete_admin on public.workers;
drop policy if exists workers_delete_privileged on public.workers;
drop policy if exists workers_delete_authenticated on public.workers;

revoke delete on public.workers from anon;
revoke delete on public.workers from authenticated;
