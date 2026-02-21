# SESSION_CONTEXT.md — Estado rapido del proyecto

## Objetivo de este archivo

Resumen operativo para retomar trabajo sin releer toda la documentacion.
Leer este archivo primero, luego revisar solo el ticket que se implementara.

## Regla de mantenimiento (obligatoria)

- Al iniciar una sesion: leer este archivo antes de tocar codigo.
- Al cerrar una sesion: actualizar "Estado actual implementado" y "Proximo bloque recomendado".
- Todo cambio relevante debe quedar en commit junto con la actualizacion de este archivo.

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
- Modulo documental (base):
  - Subida de PDF por trabajador y carpeta fija.
  - Validacion backend: solo PDF y maximo 5MB.
  - Estado inicial del documento: `pendiente`.
  - Bloqueo de carga para trabajador inactivo.
- Modulo documental (revision):
  - Listado de documentos por trabajador (`/documents`) con filtros por carpeta/estado.
  - Flujo de revision `pendiente -> aprobado/rechazado`.
  - Rechazo con motivo obligatorio.
  - Descarga mediante URL firmada.
- Notificaciones:
  - Registro interno en tabla `notifications` para eventos documentales.
  - Panel `/dashboard/notifications` para ver eventos recientes.
  - Envio de email via Resend en carga/aprobacion/rechazo (si ENV configurada).
- Registro de auditoria para crear/editar/cambiar estado de trabajador.
- Registro de auditoria en carga de documento.
- Registro de auditoria en aprobacion/rechazo/descarga de documento.
- Panel `/dashboard/audit` para consultar trazabilidad (admin).

## Rutas clave

- `/login`
- `/dashboard`
- `/dashboard/workers`
- `/dashboard/workers/new`
- `/dashboard/workers/[workerId]`
- `/dashboard/workers/[workerId]/edit`
- `/dashboard/workers/[workerId]/documents`
- `/dashboard/workers/[workerId]/documents/new`
- `/dashboard/notifications`
- `/dashboard/audit`

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

1. Ajustar destinatarios y plantillas de email por evento (negocio final).
2. Ajustar matriz de permisos final para rol `visitante` (descarga y vistas).
3. Definir si limite 5MB se mantiene o se reduce por politica interna.
4. Endurecer validaciones RLS/policies para escenarios finales.
5. Evaluar registro de login/logout en `audit_logs`.

## Checklist de arranque por sesion

1. Leer este archivo (`docs/SESSION_CONTEXT.md`).
2. Validar variables de entorno y sesion de Supabase.
3. Ejecutar `npm run lint` y `npm run typecheck` antes de cambios grandes.
4. Implementar ticket pequeño y validar.
5. Actualizar este archivo al cerrar cada bloque relevante.

## Estrategia Git recomendada

- No trabajar directo en `main` para features.
- Usar una rama por ticket:
  - `feature/auth-timeout`
  - `feature/workers-crud`
  - `feature/documents-upload`
- Flujo sugerido:
  1. Crear rama desde `main` actualizado.
  2. Implementar cambio acotado.
  3. Ejecutar lint/typecheck/build.
  4. Abrir PR y merge a `main`.
- Excepcion: cambios minimos de emergencia (hotfix pequeno) pueden ir directo a `main`.
