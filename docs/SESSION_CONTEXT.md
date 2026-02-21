# SESSION_CONTEXT.md — Estado rapido del proyecto

## Objetivo de este archivo

Resumen operativo para retomar trabajo sin releer toda la documentacion.
Leer este archivo primero, luego revisar solo el ticket que se implementara.

## Estado actual implementado

- Auth con Supabase (login por email/password) en `/login`.
- Proteccion de rutas privadas con `proxy.ts` para `/dashboard`.
- Dashboard protegido en server y boton de cierre de sesion.
- Timeout por inactividad en cliente (`INACTIVITY_TIMEOUT_MINUTES`).
- Modulo de trabajadores:
  - Listado + busqueda por RUT/nombre.
  - Crear trabajador.
  - Editar trabajador.
  - Activar/Desactivar trabajador.
  - Vista detalle de trabajador con las 12 carpetas fijas.
- Registro de auditoria para crear/editar/cambiar estado de trabajador.

## Rutas clave

- `/login`
- `/dashboard`
- `/dashboard/workers`
- `/dashboard/workers/new`
- `/dashboard/workers/[workerId]`
- `/dashboard/workers/[workerId]/edit`

## Reglas vigentes importantes

- Roles con gestion de trabajadores: `admin`, `rrhh`.
- Rol sin gestion: `contabilidad`, `visitante` (solo lectura o sin acceso de edicion).
- Carpetas son fijas por enum (`folder_01` ... `folder_12`), no dinamicas.
- Seguridad real por RLS (no confiar solo en frontend).

## Estado de infraestructura

- Migracion base creada en `supabase/migrations/20260220_000001_init_schema.sql`.
- Variables de entorno en `.env.local`.
- Proyecto Supabase ya creado y usuario admin configurado en `profiles`.

## Proximo bloque recomendado (MVP)

1. Subida de PDF a Storage `documents` (solo PDF, max 5MB).
2. Asociar documento a trabajador + carpeta fija + metadatos minimos.
3. Estado inicial del documento en `pendiente`.
4. Flujo de revision `pendiente -> aprobado/rechazado` (con motivo rechazo).
5. Vista/listado de documentos por trabajador y carpeta.

## Checklist de arranque por sesion

1. Leer este archivo (`docs/SESSION_CONTEXT.md`).
2. Validar variables de entorno y sesion de Supabase.
3. Ejecutar `npm run lint` y `npm run typecheck` antes de cambios grandes.
4. Implementar ticket pequeño y validar.
5. Actualizar este archivo al cerrar cada bloque relevante.
