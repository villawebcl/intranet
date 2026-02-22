# PR Template — `feature/permissions-e2e-smoke`

## Titulo sugerido

`test: add e2e smoke coverage for auth and role permissions`

## Resumen

Este PR agrega una suite smoke E2E con Playwright para reducir regresiones en auth/permisos del MVP.

Cobertura incluida:

- login -> dashboard (sin recarga manual)
- logout manual
- logout por timeout
- permisos criticos por rol (`admin`, `rrhh`, `contabilidad`, `visitante`)
- acceso documental de lectura para `contabilidad`
- descarga real de PDF fixture (signed URL)
- filtro de auditoria `auth_login` (admin)

## Cambios incluidos

- `playwright.config.ts`
  - configuracion base de Playwright (`chromium`, `webServer`, `globalSetup`).
- `package.json`
  - scripts `npm run e2e:smoke` y `npm run e2e:smoke:headed`.
- `package-lock.json`
  - adicion de `@playwright/test`.
- `.gitignore`
  - ignora artefactos de Playwright (`playwright-report`, `test-results`, `tests/e2e/.generated`).
- `.env.example`
  - variables E2E opcionales (usuarios por rol, worker y fixture documental).
- `tests/e2e/global-setup.ts`
  - seed/upsert de usuarios E2E por rol en Supabase.
  - seed/upsert de trabajador smoke.
  - seed/upsert de PDF fixture en storage + fila en `public.documents`.
- `tests/e2e/support/auth.ts`
  - helper de login reutilizable con retry corto para estabilizar entorno dev.
- `tests/e2e/support/smoke-fixtures.ts`
  - definicion de fixtures/credenciales/archivo runtime para E2E.
- `tests/e2e/smoke-auth.spec.ts`
  - login, logout manual, logout por timeout.
- `tests/e2e/smoke-permissions.spec.ts`
  - permisos por rol, lectura/descarga `contabilidad`, auditoria filtrada `auth_login`.
- `components/auth/idle-session-watcher.tsx`
  - override E2E opcional de timeout via `window.__E2E_IDLE_TIMEOUT_MS__` (solo usado por Playwright).
- `docs/tasks.md`
  - backlog y ticket en curso actualizados con cobertura smoke final.
- `docs/progress.md`
  - progreso diario actualizado (suite smoke E2E validada).
- `docs/SESSION_CONTEXT.md`
  - contexto operativo actualizado para retomar / cerrar PR.

## Validacion realizada

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run e2e:smoke` (OK, `10 passed`)

## Cobertura smoke actual (10 tests)

- [x] Login exitoso redirige a `/dashboard`
- [x] Logout manual redirige a `/login`
- [x] Logout por timeout redirige a `/login?reason=timeout`
- [x] `admin` puede abrir `/dashboard/audit`
- [x] `admin` puede filtrar auditoria (`action=auth_login&entity=auth`) y ver resultados
- [x] `rrhh` no puede abrir `/dashboard/audit`
- [x] `contabilidad` puede ver `/documents` (lectura)
- [x] `contabilidad` puede descargar fixture PDF (signed URL / `application/pdf`)
- [x] `contabilidad` no puede abrir `/documents/new`
- [x] `visitante` no puede abrir `/documents`

## Precondiciones / notas operativas

- Requiere `.env.local` con Supabase configurado (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- `global setup` crea/actualiza fixtures de E2E automaticamente en el proyecto Supabase configurado.
- El timeout E2E usa override client-side (`window.__E2E_IDLE_TIMEOUT_MS__`) para no esperar 5 minutos en pruebas.

## Pendientes fuera de este PR (opcionales)

- [ ] Agregar smoke adicional de auditoria para `auth_logout` (si se quiere ampliar cobertura)
- [ ] Revisar si el override E2E del timeout se mantiene tal cual o se encapsula aun mas (funcionalmente ya esta aislado)
- [ ] Completar datos de entrega/acceptance (`docs/ACCEPTANCE_CHECKLIST.md`, `docs/delivery-checklist.md`)

## Riesgos / notas

- Los tests E2E escriben fixtures en Supabase (usuarios/worker/documento) del entorno apuntado por `.env.local`.
- La suite asume acceso a red hacia Supabase y bucket `documents` existente (creado por migraciones).

## Checklist de merge

- [ ] PR revisado
- [ ] Suite `npm run e2e:smoke` ejecutada en entorno del reviewer (opcional pero recomendado)
- [ ] Sin conflictos con `main`
- [ ] Mergeable

## Links (completar)

- Issue/Ticket:
- PR:
- Evidencia Playwright (si se adjuntan traces/reportes):
