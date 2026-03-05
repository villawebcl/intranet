-- Intranet Base - denormalizar email en profiles para eliminar N requests
-- a la Auth Admin API al enviar notificaciones por correo.
--
-- Problema previo: getUserEmailsByIds() llamaba getUserEmailById() una vez
-- por destinatario (N requests HTTP a Supabase Auth Admin API).
--
-- Solucion: almacenar email en profiles. Un trigger lo sincroniza
-- automaticamente desde auth.users en cada insert/update de profiles.

alter table public.profiles
  add column if not exists email text;

comment on column public.profiles.email is
  'Espejo de auth.users.email. Sincronizado por trigger en insert/update de profiles.';

-- Trigger function: copia el email de auth.users al perfil correspondiente.
-- SECURITY DEFINER para poder leer auth.users desde el contexto del trigger.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.email := (select u.email from auth.users u where u.id = new.id);
  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_email on public.profiles;
create trigger trg_profiles_sync_email
  before insert or update on public.profiles
  for each row
  execute function public.sync_profile_email();

-- Backfill: sincronizar email para perfiles existentes.
update public.profiles
set email = (select u.email from auth.users u where u.id = profiles.id)
where email is null;

-- Indice para lookups por email (usado en busqueda de usuarios y notificaciones).
create index if not exists idx_profiles_email on public.profiles (email)
  where email is not null;
