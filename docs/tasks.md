# Tasks

## Objetivo de este archivo

Centralizar tareas pendientes y backlog tecnico para no depender del contexto conversacional.

## Regla critica (memoria persistente)

- Leer este archivo antes de iniciar cambios importantes para elegir trabajo vigente.
- Actualizar este archivo despues de completar, crear o descartar tareas.

## Estado del backlog (2026-02-22)

- Prioridad actual: preparar el siguiente bloque tecnico (smoke e2e de permisos/auth) y cerrar pendientes de entrega MVP.

## Ahora (prioridad alta)

- [x] Ejecutar QA manual por rol (admin, rrhh, contabilidad, visitante).
- [x] Registrar evidencia (capturas o video) de casos permitidos/bloqueados por rol.
- [x] Verificar en `/dashboard/audit` eventos:
  - [x] `auth_login`
  - [x] `auth_logout` manual (`reason=manual`)
  - [x] `auth_logout` timeout (`reason=timeout`)
  - [x] eventos documentales (`document_*`)
- [x] Marcar items correspondientes en `docs/ACCEPTANCE_CHECKLIST.md`.
- [x] Ejecutar validacion local final del bloque: `npm run lint`, `npm run typecheck`, `npm run build`.

## Proximas decisiones / definiciones (negocio + tecnica)

- [ ] Definir politica exacta para trabajador `inactivo` (solo bloquear subida vs restriccion mayor).
- [ ] Confirmar politica final de tamano maximo PDF (mantener 5MB o ajustar).
- [ ] Definir destinatarios de email por area/unidad (si cambia del esquema actual por roles).

## Backlog tecnico (MVP+)

- [ ] Automatizar pruebas minimas (e2e o unitarias) para permisos criticos.
  - [x] Base E2E con Playwright + `global setup` + comando `npm run e2e:smoke`. (2026-02-22)
  - [x] Smoke inicial auth: login -> dashboard (`tests/e2e/smoke-auth.spec.ts`) ejecutado OK local. (2026-02-22)
  - [x] Smokes de permisos por rol (casos criticos MVP):
    - [x] `admin` puede ver `/dashboard/audit`
    - [x] `rrhh` no puede ver `/dashboard/audit`
    - [x] `contabilidad` no puede abrir `/documents/new`
    - [x] `visitante` no puede acceder al modulo documental (`/documents`)
  - [x] Seed automatizado de usuarios E2E (`admin`, `rrhh`, `contabilidad`, `visitante`) y trabajador smoke estable.
  - [x] Smoke de logout manual (cierre de sesion y redireccion a `/login`).
  - [x] Fixture documental E2E (PDF en storage + fila en `documents`) para caso de lectura por `contabilidad`.
  - [x] Smoke permitido documental: `contabilidad` puede ver `/documents` en modo lectura y boton `Descargar`.
  - [x] Smoke de logout por timeout (redirect a `/login?reason=timeout` con mensaje visible).
  - [x] Asercion de descarga real del PDF fixture (`Descargar` -> signed URL PDF).
- [x] Documentar matriz de permisos final en un archivo dedicado (`docs/permissions-matrix.md`, opcional). (2026-02-22)
- [ ] Revisar UX de mensajes/errores (actualmente basado en query params tras `redirect`).
- [ ] Agregar estados de carga mas visibles en acciones criticas si aun faltan pantallas.
- [ ] Consolidar o deprecar archivos legacy (`AI_CONTEXT.md`, `SESSION_CONTEXT.md`) cuando el flujo nuevo este estabilizado.

## Backlog de entrega / operacion (acceptance)

- [ ] Preparar manual con capturas para cliente. (plantilla base lista en `docs/manual-qa-evidence.md`)
- [x] Preparar descripcion de PR/entrega para cierre QA. (plantilla base en `docs/pr-manual-qa-evidence.md`)
- [ ] Definir/registrar credenciales de prueba por rol.
- [ ] Confirmar URL de staging/produccion y registro de entrega.
- [ ] Revisar backup/export inicial de DB (segun acuerdo).
- [ ] Agendar/registrar capacitacion remota y ventana de observaciones.

## Tareas completadas recientemente (referencia)

- [x] Smokes E2E de permisos por rol (admin/rrhh/contabilidad/visitante) ejecutados OK (`npm run e2e:smoke`). (2026-02-22)
- [x] Smoke E2E de logout manual ejecutado OK (`npm run e2e:smoke`). (2026-02-22)
- [x] Fixture documental E2E + smoke permitido de lectura `contabilidad` ejecutados OK (`npm run e2e:smoke`). (2026-02-22)
- [x] Smoke E2E de timeout + descarga real PDF fixture ejecutados OK (`npm run e2e:smoke`). (2026-02-22)
- [x] Base Playwright + smoke E2E login->dashboard ejecutado OK (`npm run e2e:smoke`). (2026-02-22)
- [x] PR `#2` de cierre QA manual/evidencia mergeado en `main` (2026-02-22)
- [x] Fix login: ingreso estable sin recarga + `auth_login` en auditoria (2026-02-22)
- [x] Evidencia visual QA manual adjunta en `evidence/manual-qa/` (2026-02-22)
- [x] QA manual por rol + verificacion de auditoria (reportado OK) (2026-02-22)
- [x] Validacion local `lint` + `typecheck` + `build` (2026-02-22)
- [x] Plantilla de evidencia QA manual y matriz de permisos documentada (2026-02-22)
- [x] Checklist de entrega base (`docs/delivery-checklist.md`) preparado (2026-02-22)
- [x] Plantilla de PR para `feature/manual-qa-evidence` preparada (2026-02-22)
- [x] Hardening de permisos por rol (UI + backend + RLS) (2026-02-21)
- [x] Auditoria de auth/workers/documentos + panel admin (2026-02-21)
- [x] Notificaciones internas + email opcional via Resend (2026-02-21)
- [x] Estructura de memoria persistente en `docs/` (2026-02-22)

## Siguiente ticket recomendado (definido)

- Nombre sugerido de rama: `feature/permissions-e2e-smoke`
- Objetivo: agregar smoke tests automatizados para permisos criticos y flujo de login/logout para reducir regresiones como la detectada en QA manual.
- Alcance propuesto:
  1. Configurar base de pruebas E2E (Playwright o alternativa ya disponible) con guia de ejecucion local.
  2. Cubrir login funcional y redireccion al dashboard (sin recarga manual).
  3. Cubrir restricciones por rol:
     - `admin` puede ver `/dashboard/audit`
     - `rrhh` no puede ver `/dashboard/audit`
     - `contabilidad` no puede abrir `/documents/new`
     - `visitante` no puede acceder al modulo documental
  4. Validar al menos un flujo de logout (manual o timeout) con asercion visible en UI.
- Criterios de aceptacion:
  1. Suite smoke ejecuta localmente con comando documentado.
  2. Casos criticos de permisos/auth pasan en entorno local con usuarios de prueba.
  3. Documentacion de precondiciones (usuarios de prueba/seed) queda registrada.

## Ticket en curso: `feature/permissions-e2e-smoke` (2026-02-22)

### Hecho

- [x] Se agrego Playwright (`@playwright/test`) y configuracion base (`playwright.config.ts`).
- [x] `global setup` crea/actualiza usuarios E2E por rol (`admin`, `rrhh`, `contabilidad`, `visitante`) en Supabase con `SUPABASE_SERVICE_ROLE_KEY`.
- [x] `global setup` crea/actualiza trabajador smoke estable para rutas documentales con `workerId` reutilizable.
- [x] `global setup` crea/actualiza fixture documental (PDF en bucket `documents` + fila en `public.documents`).
- [x] Soporte E2E para timeout rapido mediante override de `IdleSessionWatcher` (`window.__E2E_IDLE_TIMEOUT_MS__`) usado solo por Playwright.
- [x] Smoke tests funcionales ejecutados OK con `npm run e2e:smoke`:
  - [x] login -> dashboard
  - [x] logout manual -> `/login`
  - [x] logout por timeout -> `/login?reason=timeout`
  - [x] `admin` -> `/dashboard/audit` (permitido)
  - [x] `rrhh` -> `/dashboard/audit` (bloqueado)
  - [x] `contabilidad` -> `/documents` (permitido, lectura)
  - [x] `contabilidad` -> descarga fixture PDF (signed URL)
  - [x] `contabilidad` -> `/documents/new` (bloqueado)
  - [x] `visitante` -> `/documents` (bloqueado)

### Precondiciones pendientes (exactas) para ampliar permisos por rol

- [ ] Ninguna critica para el smoke MVP actual (auth + permisos + logout + lectura/descarga documental basica) en entorno local con Supabase configurado.
