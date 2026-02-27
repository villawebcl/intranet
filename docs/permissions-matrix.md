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
| Gestion de usuarios (crear/asignar rol/reset password) | Si | No | No | No |
| Eliminar usuario (con confirmacion) | Si* | No | No | No |
| Ver listado trabajadores | Si | Si | Si (lectura) | Limitado*** |
| Crear trabajador | Si | Si | No | No |
| Crear acceso de intranet al crear trabajador | Si | Si | No | No |
| Editar trabajador | Si | Si | No | No |
| Activar/Desactivar trabajador | Si | Si | No | No |
| Archivar/Desarchivar trabajador | Si | No | No | No |
| Eliminar trabajador definitivo (con confirmacion) | Si** | No | No | No |
| Gestion de acceso portal trabajador (crear/suspender/reactivar) | Si | Si | No | No |
| Ver detalle trabajador | Si | Si | Si (lectura) | Limitado*** |
| Ver resumen documental en ficha trabajador | Si | Si | Si | No |
| Ver listado documentos por trabajador | Si | Si | Si | Si (restringido) |
| Subir documento PDF | Si | Si | Si (solo `Liquidaciones`) | No |
| Aprobar/Rechazar documento | Si | Si | No | No |
| Descargar documento | Si | Si | Si | No (solo solicitud) |
| Solicitar descarga de documento | No | No | No | Si |
| Ver panel notificaciones (`/dashboard/notifications`) | Si | No | No | No |
| Ver panel auditoria (`/dashboard/audit`) | Si | No | No | No |

\* En eliminacion de usuarios: las cuentas `admin` estan protegidas (no se pueden eliminar, incluida la cuenta admin actual). El sistema intenta eliminacion fisica y, si no es posible, aplica baja logica.

\** Solo se permite sobre trabajadores previamente archivados.

\*** `visitante` en workers: el alcance documentado indica acceso limitado al modulo de trabajadores; confirmar exactamente que vistas quedan expuestas en UI final.

## Detalle operativo por rol

### `admin`

- Gestion de usuarios (crear usuarios, asignar roles, resetear contrasenas, eliminar con confirmacion).
- Puede ajustar roles desde `Usuarios` y desde `Acceso y roles`.
- Cuentas admin protegidas: no puede autoeliminarse ni eliminar otras cuentas con rol `admin`.
- Gestion de trabajadores (crear/editar/activar/desactivar/archivar/desarchivar).
- Eliminacion definitiva de trabajadores archivados con confirmacion previa.
- Gestion de acceso portal del trabajador (crear/suspender/reactivar).
- Gestion documental completa (ver/subir/revisar/descargar).
- Acceso a panel de auditoria.
- Acceso a panel de notificaciones.

### `rrhh`

- Gestion de trabajadores (crear/editar/activar/desactivar), sin archivar ni eliminar.
- Gestion de acceso portal del trabajador (crear/suspender/reactivar).
- Gestion documental completa (ver/subir/revisar/descargar).
- Sin acceso a panel de auditoria.
- Sin acceso a panel de notificaciones (panel admin).

### `contabilidad`

- Sin gestion de trabajadores (crear/editar/activar/desactivar).
- Puede requerir acceso de lectura a trabajadores para navegar al modulo documental.
- Documentos en modo lectura: ver y descargar.
- Puede subir documentos solo en carpeta `Liquidaciones`.
- Sin revisar (aprobar/rechazar) documentos.
- Sin acceso a auditoria.
- Sin acceso a panel de notificaciones (panel admin).

### `visitante`

- Acceso a dashboard autenticado.
- Acceso al modulo de trabajadores: limitado (sin gestion).
- Acceso documental restringido: visualiza metadata/listado sin descarga directa.
- Puede solicitar descarga de documentos al equipo administrador.
- Sin gestion de trabajadores.
- Sin acceso a auditoria.
- Sin acceso a panel de notificaciones.

## Validacion y enforcement

- UI: oculta acciones y muestra mensajes de permiso.
- Backend (Server Actions): valida rol antes de mutar datos.
- Acciones destructivas: requieren confirmacion explicita y registran auditoria.
- Supabase RLS: control definitivo de acceso a tablas y storage.

## Referencias

- `docs/SESSION_CONTEXT.md`
- `docs/decisions.md` (ADR-007)
- `supabase/migrations/20260220_000001_init_schema.sql`
- `supabase/migrations/20260221_000002_permissions_hardening.sql`
