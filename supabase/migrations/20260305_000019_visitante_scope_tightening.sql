-- Intranet Base - tighten visitante read scope to reduce metadata exposure

-- workers: visitante can only see active workers (still required for document navigation UX)
drop policy if exists workers_select_scoped on public.workers;
create policy workers_select_scoped
on public.workers
for select
using (
  auth.role() = 'authenticated'
  and (
    public.current_app_role() in (
      'admin'::public.app_role,
      'rrhh'::public.app_role,
      'contabilidad'::public.app_role
    )
    or (
      public.current_app_role() = 'trabajador'::public.app_role
      and id = public.current_profile_worker_id()
    )
    or (
      public.current_app_role() = 'visitante'::public.app_role
      and is_active = true
    )
  )
);

-- documents: visitante only sees approved documents for active workers
drop policy if exists documents_select_scoped on public.documents;
create policy documents_select_scoped
on public.documents
for select
using (
  public.current_app_role() in (
    'admin'::public.app_role,
    'rrhh'::public.app_role,
    'contabilidad'::public.app_role
  )
  or (
    public.current_app_role() = 'trabajador'::public.app_role
    and worker_id = public.current_profile_worker_id()
  )
  or (
    public.current_app_role() = 'visitante'::public.app_role
    and status = 'aprobado'::public.document_status
    and exists (
      select 1
      from public.workers w
      where w.id = documents.worker_id
        and w.is_active = true
    )
  )
);
