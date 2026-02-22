# Permissions Matrix (MVP)

## Objetivo de este archivo

Documentar la matriz de permisos vigente del MVP para QA, soporte y futuras features.

## Regla de mantenimiento

- Actualizar este archivo cada vez que cambien permisos en UI, Server Actions o RLS.
- Toda modificacion debe quedar respaldada por pruebas manuales (y tests automatizados cuando existan).

## Roles

- `admin`
- `rrhh`
- `contabilidad`
- `visitante`

## Matriz resumida

| Modulo / Accion | admin | rrhh | contabilidad | visitante |
| --- | --- | --- | --- | --- |
| Login / acceso dashboard | Si | Si | Si | Si |
| Ver listado trabajadores | Si | Si | Si (lectura) | Limitado* |
| Crear trabajador | Si | Si | No | No |
| Editar trabajador | Si | Si | No | No |
| Activar/Desactivar trabajador | Si | Si | No | No |
| Ver detalle trabajador | Si | Si | Si (lectura) | Limitado* |
| Ver resumen documental en ficha trabajador | Si | Si | Si | No |
| Ver listado documentos por trabajador | Si | Si | Si | No |
| Subir documento PDF | Si | Si | No | No |
| Aprobar/Rechazar documento | Si | Si | No | No |
| Descargar documento | Si | Si | Si | No |
| Ver panel notificaciones | Si | Si | Segun configuracion actual** | Segun configuracion actual** |
| Ver panel auditoria (`/dashboard/audit`) | Si | No | No | No |

\* `visitante` en workers: el alcance documentado indica acceso limitado al modulo de trabajadores; confirmar exactamente que vistas quedan expuestas en UI final.

\** El alcance MVP exige panel de notificaciones para "admin o roles definidos"; validar politica final y documentarla en acceptance.

## Detalle operativo por rol

### `admin`

- Gestion completa de trabajadores.
- Gestion documental completa (ver/subir/revisar/descargar).
- Acceso a panel de auditoria.
- Acceso a notificaciones.

### `rrhh`

- Gestion completa de trabajadores.
- Gestion documental completa (ver/subir/revisar/descargar).
- Sin acceso a panel de auditoria.
- Acceso a notificaciones.

### `contabilidad`

- Sin gestion de trabajadores (crear/editar/activar/desactivar).
- Puede requerir acceso de lectura a trabajadores para navegar al modulo documental.
- Documentos en modo lectura: ver y descargar.
- Sin subir ni revisar documentos.
- Sin acceso a auditoria.

### `visitante`

- Acceso a dashboard autenticado.
- Acceso al modulo de trabajadores: limitado (sin gestion).
- Sin acceso al modulo documental.
- Sin gestion de trabajadores.
- Sin acceso a auditoria.

## Validacion y enforcement

- UI: oculta acciones y muestra mensajes de permiso.
- Backend (Server Actions): valida rol antes de mutar datos.
- Supabase RLS: control definitivo de acceso a tablas y storage.

## Referencias

- `docs/SESSION_CONTEXT.md`
- `docs/decisions.md` (ADR-007)
- `supabase/migrations/20260220_000001_init_schema.sql`
- `supabase/migrations/20260221_000002_permissions_hardening.sql`
