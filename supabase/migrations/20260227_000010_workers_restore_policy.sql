-- Intranet Base - permitir desarchivar workers solo para admin

drop policy if exists workers_restore_admin on public.workers;
create policy workers_restore_admin
on public.workers
for update
using (
  public.current_app_role() = 'admin'::public.app_role
  and is_active = false
)
with check (
  public.current_app_role() = 'admin'::public.app_role
  and is_active = true
  and deleted_at is null
  and deleted_by is null
);
