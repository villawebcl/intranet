-- Intranet Base - denormalizar banned_until en profiles para eliminar round-trip
-- a Auth API en el listado de trabajadores.
--
-- Problema previo: workers/page.tsx llamaba adminClient.auth.admin.listUsers()
-- en cada render para determinar el estado de acceso. Esto rompe con >1000 usuarios
-- (la API devuelve max 1000 por pagina) y es innecesariamente lento.
--
-- Solucion: almacenar banned_until en profiles. El servicio lo actualiza
-- al suspender/activar accesos. La pagina lee directamente desde profiles.

alter table public.profiles
  add column if not exists banned_until timestamptz default null;

comment on column public.profiles.banned_until is
  'Espejo de auth.users.banned_until. Actualizado por el servicio al suspender/activar acceso de trabajador.';

-- Indice para filtrar rapido por estado de suspension si se necesita en el futuro.
create index if not exists idx_profiles_banned_until
  on public.profiles (banned_until)
  where banned_until is not null;

-- BACKFILL: si ya existen cuentas suspendidas antes de esta migracion,
-- ejecutar manualmente desde Supabase Dashboard o con service_role:
--
-- update public.profiles p
-- set banned_until = u.banned_until
-- from auth.users u
-- where p.id = u.id
--   and u.banned_until is not null
--   and u.banned_until > now();
