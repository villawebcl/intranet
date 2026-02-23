# SESSION_CONTEXT.md — Estado rapido del proyecto

> Nota (2026-02-22): este archivo se mantiene como historial operativo. Antes de cambios importantes, leer primero la memoria persistente en `docs/system-overview.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/progress.md` y `docs/tasks.md`.

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
  - UI/UX de `notifications` pulida (2026-02-23): resumen de payload legible, JSON colapsable, badges de email, mejor legibilidad de IDs y layout responsive movil/escritorio.
  - Envio de email via Resend en carga/aprobacion/rechazo (si ENV configurada).
  - Plantillas de email centralizadas y trazabilidad `sent_at` por notificacion enviada.
- Registro de auditoria para crear/editar/cambiar estado de trabajador.
- Registro de auditoria en carga de documento.
- Registro de auditoria en aprobacion/rechazo/descarga de documento.
- Registro de auditoria en autenticacion:
  - `auth_login` al iniciar sesion.
  - `auth_logout` al cerrar sesion manualmente.
  - `auth_logout` al cierre por inactividad (`reason=timeout`).
- Panel `/dashboard/audit` para consultar trazabilidad (admin).
- Hardening de permisos por rol (UI + backend + RLS):
  - `visitante`: sin acceso al modulo documental (ver/descargar/subir/revisar).
  - `contabilidad`: lectura documental (ver/descargar), sin subir/revisar.
  - `admin`/`rrhh`: gestion documental completa.
  - Consulta de resumen documental en ficha de trabajador solo para roles con acceso documental.
- Base de smoke E2E con Playwright:
  - `playwright.config.ts` con `webServer` (`npm run dev`) y proyecto `chromium`.
  - `tests/e2e/global-setup.ts` que crea/actualiza usuarios por rol, trabajador smoke y fixture documental (PDF en storage + fila en `documents`).
  - Smokes validados localmente:
    - `tests/e2e/smoke-auth.spec.ts` (login -> dashboard, logout manual, logout por timeout)
    - `tests/e2e/smoke-permissions.spec.ts` (permisos por rol MVP + lectura/descarga `contabilidad` + filtro auditoria `auth_login`)
- PR `#3` (`feature/permissions-e2e-smoke`) mergeado en `main` con suite smoke E2E validada (`npm run e2e:smoke`, 10 tests).
- Documentacion de acceptance/entrega normalizada post-PR `#3`:
  - `docs/ACCEPTANCE_CHECKLIST.md` actualizado con estado de cierre y resumen de pendientes clasificados.
  - `docs/delivery-checklist.md` actualizado con pendientes por tipo (`tecnico`, `operativo`, `externo/cliente`), estado, responsable y propuesta minima de cierre.
  - `staging` Vercel desplegado y registrado (`https://intranet-lovat-delta.vercel.app`) con ENV minimas cargadas y verificacion `/login` = HTTP 200; pendiente URL de produccion y demas datos de handoff (credenciales, backup/export, capacitacion, aceptacion cliente).

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
- Roles documentales:
  - `admin`, `rrhh`: ver/subir/revisar/descargar.
  - `contabilidad`: ver/descargar (sin subir/revisar).
  - `visitante`: sin acceso documental.
- Carpetas son fijas por enum (`folder_01` ... `folder_12`), no dinamicas.
- Seguridad real por RLS (no confiar solo en frontend).

## Estado de infraestructura

- Migracion base creada en `supabase/migrations/20260220_000001_init_schema.sql`.
- Migracion de hardening creada en `supabase/migrations/20260221_000002_permissions_hardening.sql`.
- Variables de entorno en `.env.local`.
- Proyecto Supabase ya creado y usuario admin configurado en `profiles`.
- Playwright instalado (`@playwright/test`) y browser `chromium` descargado localmente.

## Proximo bloque recomendado (MVP)

1. Completar datos de handoff pendientes en `docs/delivery-checklist.md` y `docs/ACCEPTANCE_CHECKLIST.md` (URL de produccion, responsable cliente, fechas, credenciales).
2. Registrar entrega de credenciales por canal seguro y acuses (sin secretos en repo).
3. Registrar backup/export, estado de migraciones y decision final de politicas (`worker inactivo`, tamano PDF).
4. Agendar/registrar capacitacion, ventana de observaciones y aceptacion formal cliente.
5. (Opcional, separado) Evaluar smoke extra de auditoria para `auth_logout`.

## Proxima sesion (ticket sugerido)

- Nombre sugerido de rama: `ops/handoff-data-completion` (o continuar rama actual si aun no se hizo PR)
- Objetivo: completar datos reales de handoff y cerrar acceptance formal del MVP.
- Estado (2026-02-23): documentacion operativa lista + `staging` Vercel desplegado; faltan datos/confirmaciones externas para cierre final.
- Alcance:
  1. Completar campos `PENDIENTE` en datos de entrega/registro de aceptacion.
  2. Registrar entrega de credenciales por canal seguro (sin secretos) y canal/acuse.
  3. Registrar URLs, backup/export, migraciones y estado final de correo (`activo`/`n/a`).
  4. Registrar capacitacion, ventana de observaciones y aceptacion formal cliente.
- Criterios de aceptacion:
  1. `docs/ACCEPTANCE_CHECKLIST.md` y `docs/delivery-checklist.md` completos para handoff (sin pendientes criticos no justificados).
  2. Pendientes restantes marcados `n/a` o escalados explicitamente con responsable/fecha.
  3. Aceptacion formal cliente registrada.

## Arranque 5 minutos (siguiente sesion)

1. `git checkout main && git pull origin main`
2. `git checkout -b ops/handoff-data-completion` (o retomar rama abierta)
3. Revisar `docs/delivery-checklist.md` (pendientes clasificados) y `docs/ACCEPTANCE_CHECKLIST.md` (registro de aceptacion)
4. Completar datos reales con cliente/operaciones y marcar estados/acuse

## Pruebas manuales recientes (2026-02-21)

> Actualizacion (2026-02-22): pruebas manuales reportadas OK. Evidencia visual base consolidada en `evidence/manual-qa/` y documentada en `docs/manual-qa-evidence.md`. Se detecto y corrigio bug de login (requeria recarga y no registraba `auth_login` consistentemente).

- Permissions hardening:
  - Precondicion: usar un trabajador activo existente y al menos 1 PDF de prueba (<5MB).
  - [x] Admin
    - [x] Puede crear trabajador desde `/dashboard/workers/new`.
    - [x] Puede editar trabajador desde `/dashboard/workers/[workerId]/edit`.
    - [x] Puede subir PDF en `/dashboard/workers/[workerId]/documents/new`.
    - [x] Puede aprobar/rechazar en `/dashboard/workers/[workerId]/documents`.
    - [x] Puede descargar PDF en `/dashboard/workers/[workerId]/documents`.
    - [x] Puede ver auditoria en `/dashboard/audit`.
  - [x] RRHH
    - [x] Puede crear/editar trabajador.
    - [x] Puede subir PDF.
    - [x] Puede aprobar/rechazar documentos pendientes.
    - [x] Puede descargar PDF.
    - [x] No puede abrir `/dashboard/audit` (debe redirigir con error).
  - [x] Contabilidad
    - [x] Puede abrir `/dashboard/workers/[workerId]/documents` (lectura).
    - [x] Puede descargar PDF.
    - [x] No puede abrir `/dashboard/workers/[workerId]/documents/new` (mensaje de permisos).
    - [x] No puede aprobar/rechazar documentos.
    - [x] No puede crear/editar trabajador.
  - [x] Visitante
    - [x] Puede autenticarse y entrar al dashboard.
    - [x] No puede abrir `/dashboard/workers/[workerId]/documents` (mensaje de permisos).
    - [x] No puede abrir `/dashboard/workers/[workerId]/documents/new`.
    - [x] No puede descargar documentos.
    - [x] No puede crear/editar trabajador.
  - Evidencia sugerida:
    - [x] Captura por rol con al menos un caso permitido y uno bloqueado.
    - [x] Captura de `/dashboard/audit` con eventos documentales visibles para admin.
- Auditoria de autenticacion:
  - [x] Login exitoso genera `auth_login` en `/dashboard/audit`.
  - [x] Logout manual genera `auth_logout` con `metadata.reason = manual`.
  - [x] Logout por inactividad genera `auth_logout` con `metadata.reason = timeout`.

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
