# System Overview

## Objetivo de este archivo

Resumen ejecutivo del sistema para retomar contexto rapido sin depender del chat.

## Regla critica (memoria persistente)

- Antes de cambios importantes: leer `docs/system-overview.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/progress.md` y `docs/tasks.md`.
- Despues de cambios importantes: actualizar estos archivos (al menos `progress.md`, `tasks.md` y `decisions.md` si aplica).

## Proposito del sistema

Intranet web para **gestion documental de trabajadores** de Anagami Seguridad.

Permite:

- autenticacion y sesion
- gestion de trabajadores
- carga/revision/descarga de documentos PDF por trabajador
- permisos por rol
- notificaciones
- auditoria de acciones

## Alcance MVP actual (Fase 1)

- Login con Supabase Auth
- Roles: `admin`, `rrhh`, `contabilidad`, `visitante`
- Gestion de usuarios (crear, editar, resetear contrasena, eliminar con confirmacion)
- Gestion de trabajadores (crear, editar, activar/desactivar; eliminacion solo admin con confirmacion)
- 12 carpetas fijas por trabajador (enum)
- Subida de PDF (solo PDF, max 5MB)
- Flujo documental `pendiente -> aprobado/rechazado`
- Descarga con URL firmada
- Notificaciones internas + email (Resend opcional por ENV)
- Auditoria de acciones de auth/trabajadores/documentos

## Modulos principales

1. Autenticacion y sesion
   - Login `/login`
   - Proteccion de rutas `/dashboard/*`
   - Logout manual y por timeout con auditoria

2. Dashboard
   - Home del panel y navegacion principal

3. Usuarios y accesos (admin)
   - Listado y administracion de usuarios
   - Crear usuario, editar perfil/rol, resetear contrasena
   - Eliminar usuario con confirmacion
   - Proteccion de cuentas admin (sin autoeliminacion ni eliminacion de otros admin)

4. Trabajadores
   - Listado, busqueda, alta, edicion, activacion/desactivacion
   - Eliminacion de trabajador (solo admin) con confirmacion previa
   - Ficha de trabajador con resumen y acceso documental

5. Documentos
   - Listado por trabajador
   - Filtros por carpeta/estado
   - Subida de PDF
   - Revision (aprobar/rechazar con motivo en rechazo)
   - Descarga controlada por permisos

6. Notificaciones
   - Registro interno en tabla `notifications`
   - Panel `/dashboard/notifications`
   - Envio email (si `RESEND_API_KEY` y `NOTIFICATIONS_FROM_EMAIL` estan configuradas)

7. Auditoria
   - Registro en `audit_logs`
   - Panel `/dashboard/audit` (solo admin)

## Resumen de permisos vigente (MVP)

- `admin`: gestion de usuarios + trabajadores + documentos + auditoria + notificaciones
- `rrhh`: gestion de trabajadores (sin eliminar) + documentos (sin panel de auditoria)
- `contabilidad`: lectura documental (ver/descargar), sin crear/editar/subir/revisar
- `visitante`: acceso al dashboard, sin acceso documental

## Fuentes legacy (mantener)

- `docs/AI_CONTEXT.md`
- `docs/SESSION_CONTEXT.md`
- `docs/DECISIONS.md`
- `docs/ACCEPTANCE_CHECKLIST.md`
- `docs/RUNBOOK.md`

Estos archivos siguen siendo utiles como historial detallado, pero la referencia operativa desde ahora son los 5 archivos de memoria persistente en minusculas.
