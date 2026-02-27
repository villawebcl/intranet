-- Intranet Base - garantizar asignacion unica de profiles.worker_id

do $$
begin
  if exists (
    select 1
    from public.profiles p
    where p.worker_id is not null
    group by p.worker_id
    having count(*) > 1
  ) then
    raise exception 'NO_SE_PUEDE_APLICAR_UNICIDAD_WORKER_ID: hay trabajadores asignados a multiples usuarios';
  end if;
end
$$;

create unique index if not exists idx_profiles_worker_id_unique
on public.profiles (worker_id)
where worker_id is not null;
