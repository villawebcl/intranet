# Tasks

## Objetivo de este archivo

Centralizar tareas pendientes y backlog tecnico para no depender del contexto conversacional.

## Regla critica (memoria persistente)

- Leer este archivo antes de iniciar cambios importantes para elegir trabajo vigente.
- Actualizar este archivo despues de completar, crear o descartar tareas.

## Estado del backlog (2026-02-22)

- Prioridad actual: cerrar pendientes de entrega/acceptance del MVP y definir el siguiente bloque tecnico de mejora (post-smoke E2E).

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

- [x] Automatizar pruebas minimas (e2e o unitarias) para permisos criticos. (2026-02-22)
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
  - [x] Smoke de auditoria filtrada: `admin` ve eventos `auth_login` en `/dashboard/audit` con filtros.
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

- [x] PR `#3` de smoke E2E auth/permisos mergeado en `main` (2026-02-22)
- [x] Smokes E2E de permisos por rol (admin/rrhh/contabilidad/visitante) ejecutados OK (`npm run e2e:smoke`). (2026-02-22)
- [x] Smoke E2E de logout manual ejecutado OK (`npm run e2e:smoke`). (2026-02-22)
- [x] Fixture documental E2E + smoke permitido de lectura `contabilidad` ejecutados OK (`npm run e2e:smoke`). (2026-02-22)
- [x] Smoke E2E de timeout + descarga real PDF fixture ejecutados OK (`npm run e2e:smoke`). (2026-02-22)
- [x] Smoke E2E de auditoria filtrada (`auth_login`) ejecutado OK (`npm run e2e:smoke`). (2026-02-22)
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

## Ticket cerrado: `feature/permissions-e2e-smoke` (2026-02-22)

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
  - [x] `admin` -> `/dashboard/audit?action=auth_login&entity=auth` (filtro con resultados)
  - [x] `rrhh` -> `/dashboard/audit` (bloqueado)
  - [x] `contabilidad` -> `/documents` (permitido, lectura)
  - [x] `contabilidad` -> descarga fixture PDF (signed URL)
  - [x] `contabilidad` -> `/documents/new` (bloqueado)
  - [x] `visitante` -> `/documents` (bloqueado)
- [x] PR `#3` abierto, comentado con validaciones y mergeado en `main`.

### Precondiciones pendientes (exactas) para ampliar permisos por rol

- [x] Ninguna critica para el smoke MVP actual (auth + permisos + logout + lectura/descarga documental basica) en entorno local con Supabase configurado.

## Siguiente ticket recomendado (post-merge)

- Nombre sugerido de rama: `feature/acceptance-delivery-closeout`
- Objetivo: cerrar pendientes de acceptance/entrega y dejar la documentacion operativa lista para handoff.
- Alcance propuesto:
  1. Completar/normalizar `docs/ACCEPTANCE_CHECKLIST.md` y `docs/delivery-checklist.md` con estado real post-PR #3.
  2. Documentar formato y ubicacion de credenciales de prueba por rol (sin exponer secretos en repo; referenciar canal seguro).
  3. Registrar URL de entorno(s), plan de backup/export y estado de capacitacion/entrega.
  4. Dejar checklist de cierre con responsables y pendientes externos (negocio/cliente).
- Criterios de aceptacion:
  1. Checklist de acceptance/entrega actualizado y consistente con estado real del MVP.
  2. Pendientes tecnicos vs operativos quedan separados con responsables claros.
  3. Memoria persistente (`tasks/progress/SESSION_CONTEXT`) queda sincronizada al cierre.
