# Tasks

## Objetivo de este archivo

Centralizar tareas pendientes y backlog tecnico para no depender del contexto conversacional.

## Regla critica (memoria persistente)

- Leer este archivo antes de iniciar cambios importantes para elegir trabajo vigente.
- Actualizar este archivo despues de completar, crear o descartar tareas.

## Estado del backlog (2026-02-22)

- Prioridad actual: consolidar evidencia/capturas y cierre de acceptance MVP.

## Ahora (prioridad alta)

- [x] Ejecutar QA manual por rol (admin, rrhh, contabilidad, visitante).
- [ ] Registrar evidencia (capturas o video) de casos permitidos/bloqueados por rol.
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
- [x] Documentar matriz de permisos final en un archivo dedicado (`docs/permissions-matrix.md`, opcional). (2026-02-22)
- [ ] Revisar UX de mensajes/errores (actualmente basado en query params tras `redirect`).
- [ ] Agregar estados de carga mas visibles en acciones criticas si aun faltan pantallas.
- [ ] Consolidar o deprecar archivos legacy (`AI_CONTEXT.md`, `SESSION_CONTEXT.md`) cuando el flujo nuevo este estabilizado.

## Backlog de entrega / operacion (acceptance)

- [ ] Preparar manual con capturas para cliente. (plantilla base lista en `docs/manual-qa-evidence.md`)
- [ ] Preparar descripcion de PR/entrega para cierre QA. (plantilla base en `docs/pr-manual-qa-evidence.md`)
- [ ] Definir/registrar credenciales de prueba por rol.
- [ ] Confirmar URL de staging/produccion y registro de entrega.
- [ ] Revisar backup/export inicial de DB (segun acuerdo).
- [ ] Agendar/registrar capacitacion remota y ventana de observaciones.

## Tareas completadas recientemente (referencia)

- [x] QA manual por rol + verificacion de auditoria (reportado OK) (2026-02-22)
- [x] Validacion local `lint` + `typecheck` + `build` (2026-02-22)
- [x] Plantilla de evidencia QA manual y matriz de permisos documentada (2026-02-22)
- [x] Checklist de entrega base (`docs/delivery-checklist.md`) preparado (2026-02-22)
- [x] Plantilla de PR para `feature/manual-qa-evidence` preparada (2026-02-22)
- [x] Hardening de permisos por rol (UI + backend + RLS) (2026-02-21)
- [x] Auditoria de auth/workers/documentos + panel admin (2026-02-21)
- [x] Notificaciones internas + email opcional via Resend (2026-02-21)
- [x] Estructura de memoria persistente en `docs/` (2026-02-22)
