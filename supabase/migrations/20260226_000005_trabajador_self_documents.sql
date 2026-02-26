-- Intranet Base - agregar rol trabajador (enum) y columna de vinculo en profiles

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
      and e.enumlabel = 'trabajador'
  ) then
    alter type public.app_role add value 'trabajador';
  end if;
end
$$;

alter table public.profiles
add column if not exists worker_id uuid references public.workers (id) on delete set null;
