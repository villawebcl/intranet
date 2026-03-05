-- Intranet Base - add trigram indexes for ilike substring searches

create extension if not exists pg_trgm;

-- workers search: rut/first_name/last_name with ilike '%term%'
create index if not exists idx_workers_rut_trgm
on public.workers using gin (rut gin_trgm_ops);

create index if not exists idx_workers_first_name_trgm
on public.workers using gin (first_name gin_trgm_ops);

create index if not exists idx_workers_last_name_trgm
on public.workers using gin (last_name gin_trgm_ops);

-- documents search in header-search route
create index if not exists idx_documents_file_name_trgm
on public.documents using gin (file_name gin_trgm_ops);
