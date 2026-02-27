-- Performance hardening for paginated dashboards (no RLS/policy changes)

create extension if not exists pg_trgm;

-- Workers listing: archive/status filters + alphabetical order
create index if not exists idx_workers_is_active_status_last_first
on public.workers (is_active, status, last_name, first_name);

-- Documents listing by worker with sorting and optional filters
create index if not exists idx_documents_worker_created_at_desc
on public.documents (worker_id, created_at desc);

create index if not exists idx_documents_worker_folder_status_created_at_desc
on public.documents (worker_id, folder_type, status, created_at desc);

-- Download requests lookups in worker documents page
create index if not exists idx_download_requests_worker_document_created_at_desc
on public.download_requests (worker_id, document_id, created_at desc);

create index if not exists idx_download_requests_requested_by_created_at_desc
on public.download_requests (requested_by, created_at desc);

-- Notifications dashboard filters + sort
create index if not exists idx_notifications_created_at_desc
on public.notifications (created_at desc);

create index if not exists idx_notifications_event_created_at_desc
on public.notifications (event_type, created_at desc);

create index if not exists idx_notifications_pending_created_at_desc
on public.notifications (created_at desc)
where sent_at is null;

create index if not exists idx_notifications_sent_created_at_desc
on public.notifications (created_at desc)
where sent_at is not null;

-- Audit dashboard sort + substring filters (ilike '%term%')
create index if not exists idx_audit_logs_created_at_desc
on public.audit_logs (created_at desc);

create index if not exists idx_audit_logs_action_trgm
on public.audit_logs using gin (action gin_trgm_ops);

create index if not exists idx_audit_logs_entity_type_trgm
on public.audit_logs using gin (entity_type gin_trgm_ops);
