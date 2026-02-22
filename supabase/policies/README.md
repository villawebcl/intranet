# Policies

Este directorio documenta el enfoque RLS por tabla.

Regla base del proyecto:

- Seguridad real en backend con RLS.
- No confiar solo en validaciones de UI.
- Cada tabla nueva requiere politicas explicitas.

## Matriz de permisos vigente (MVP)

- `admin`: acceso total.
- `rrhh`: gestiona trabajadores y documentos (subir/revisar/descargar).
- `contabilidad`: solo lectura documental (ver/descargar), sin subir/revisar.
- `visitante`: acceso limitado al modulo de trabajadores, sin acceso documental.

## Migraciones relacionadas

- `supabase/migrations/20260220_000001_init_schema.sql`: esquema base + RLS inicial.
- `supabase/migrations/20260221_000002_permissions_hardening.sql`: endurecimiento de permisos por rol.
