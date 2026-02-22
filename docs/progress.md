# Progress

## Objetivo de este archivo

Registrar progreso por fecha para retomar trabajo rapidamente y saber que falta.

## Regla critica (memoria persistente)

- Leer este archivo antes de cambios importantes para entender el estado actual.
- Actualizar este archivo al cerrar cualquier bloque relevante de trabajo.

## Estado actual (2026-02-22)

- MVP funcional en desarrollo avanzado con auth, workers, documentos, notificaciones y auditoria base.
- QA manual por rol y verificacion de auditoria reportados OK, con evidencia visual base adjunta y PR de cierre mergeado.
- Se detecto y corrigio un bug de login (requeria recarga y no registraba `auth_login` de forma confiable).
- Ticket `feature/permissions-e2e-smoke` en avance: Playwright base + smokes auth/permisos por rol ejecutados OK local (7 casos).

## Progreso diario

### 2026-02-20

#### Hecho

- Inicializacion del proyecto Next.js + TypeScript + Tailwind.
- Integracion base con Supabase (Auth/DB/Storage).
- Migracion inicial `20260220_000001_init_schema.sql`.
- Definicion de enums de dominio y tablas base (`profiles`, `workers`, `documents`, `notifications`, `audit_logs`).
- Documentacion inicial (`AI_CONTEXT`, `DECISIONS`, `RUNBOOK`, `ACCEPTANCE_CHECKLIST`).

#### Falta / arrastrado

- Cerrar matriz de permisos final por rol.
- Completar pruebas manuales de acceptance.

### 2026-02-21

#### Hecho

- Login en `/login` y proteccion de rutas privadas via `proxy.ts`.
- Dashboard protegido y logout.
- Timeout por inactividad en cliente.
- Modulo de trabajadores:
  - listado + busqueda
  - crear/editar
  - activar/desactivar
  - detalle con 12 carpetas fijas
- Modulo documental:
  - subida PDF (solo PDF, max 5MB)
  - bloqueo de carga para trabajador inactivo
  - listado/filtros
  - aprobacion/rechazo
  - rechazo con motivo obligatorio
  - descarga por URL firmada
- Notificaciones:
  - tabla `notifications`
  - panel `/dashboard/notifications`
  - envio email via Resend (opcional por ENV)
  - trazabilidad `sent_at`
- Auditoria:
  - eventos de workers/documentos
  - `auth_login`, `auth_logout` (manual/timeout)
  - panel `/dashboard/audit` (admin)
- Hardening de permisos por rol (UI + backend + RLS).
- Migracion de permisos `20260221_000002_permissions_hardening.sql`.

#### Falta / arrastrado

- Ejecutar y documentar QA manual por rol (admin/rrhh/contabilidad/visitante).
- Registrar evidencia visual y marcar checklist de acceptance.

### 2026-02-22

#### Hecho

- Implementacion de memoria persistente en `docs/` con estructura estandar:
  - `architecture.md`
  - `decisions.md`
  - `progress.md`
  - `tasks.md`
  - `system-overview.md`
- Consolidacion de contenido desde archivos legacy (`AI_CONTEXT`, `SESSION_CONTEXT`, `DECISIONS`, `ACCEPTANCE_CHECKLIST`).
- Se formaliza regla operativa: leer/actualizar docs de memoria antes/despues de cambios importantes.
- Validacion local del bloque documental:
  - `npm run lint` OK
  - `npm run typecheck` OK
  - `npm run build` OK
- Se crea rama `feature/manual-qa-evidence` para cierre de QA/acceptance.
- Usuario reporta pruebas manuales recientes OK para permisos por rol y flujo de auditoria (login/logout/documentos).
- Se agrega plantilla `docs/manual-qa-evidence.md` para consolidar capturas/video.
- Se documenta matriz de permisos en `docs/permissions-matrix.md` para QA y soporte.
- Se prepara `docs/delivery-checklist.md` para cerrar acceptance/entrega sin bloquear por falta temporal de imagenes.
- Se agrega `docs/pr-manual-qa-evidence.md` como plantilla de PR para copiar/pegar al abrir el cierre de QA.
- Se adjuntan capturas de QA manual en `evidence/manual-qa/` y se referencian en `docs/manual-qa-evidence.md`.
- Se abre y mergea PR `#2` para `feature/manual-qa-evidence`.
- Se corrige flujo de login para evitar recarga manual post-auth y asegurar registro de `auth_login` en auditoria.
- Se agrega base E2E con Playwright (`@playwright/test`) y configuracion `playwright.config.ts`.
- Se implementa `global setup` para crear/actualizar usuarios E2E por rol (`admin`, `rrhh`, `contabilidad`, `visitante`) en Supabase usando `SUPABASE_SERVICE_ROLE_KEY`.
- Se agrega fixture de trabajador smoke estable para rutas documentales y archivo runtime (`tests/e2e/.generated/smoke-fixtures.json`).
- Se agrega helper de login con reintento corto para estabilizar auth E2E en entorno dev.
- Se agrega smoke de logout manual (`tests/e2e/smoke-auth.spec.ts`) con asercion de redireccion a `/login`.
- Se agrega fixture documental E2E en `global setup` (PDF en storage + fila en `public.documents`).
- Se agrega smoke permitido de `contabilidad` en `/dashboard/workers/[workerId]/documents` (lectura + boton `Descargar` visible).
- Se valida suite `npm run e2e:smoke` (OK, 7 tests):
  - login -> dashboard
  - logout manual -> `/login`
  - admin puede ver auditoria
  - rrhh no puede ver auditoria
  - contabilidad puede ver `/documents` (lectura)
  - contabilidad no puede abrir `/documents/new`
  - visitante no puede acceder a `/documents`

#### Falta / arrastrado

- Mantener sincronizados los archivos legacy o definir fecha de deprecacion.
- Completar datos de acceptance/entrega (usuarios de prueba, URL, credenciales, backup, capacitacion).
- Definir/registrar credenciales de prueba por rol (pendiente documental y/o canal seguro).
- (Opcional) Agregar asercion de descarga real del PDF fixture (`Descargar` -> signed URL/archivo).

## Proximo bloque recomendado

1. (Opcional) Agregar asercion de descarga real del PDF fixture (`Descargar` -> signed URL/archivo).
2. (Opcional) Agregar smoke de logout por timeout si se quiere cubrir inactividad en E2E.
3. Evaluar si el ticket se considera listo para PR con cobertura actual (auth + permisos criticos + logout manual + lectura contabilidad).
4. Completar datos de entrega pendientes (`docs/ACCEPTANCE_CHECKLIST.md`, `docs/delivery-checklist.md`).
