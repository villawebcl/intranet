# PR Template — `feature/manual-qa-evidence`

## Titulo sugerido

`docs: record manual QA evidence and acceptance progress`

## Resumen

Este PR consolida el cierre documental del QA manual del MVP:

- resultado de pruebas manuales por rol (reportadas OK)
- verificacion de auditoria (`auth_login`, `auth_logout`, `document_*`)
- avance del checklist de acceptance
- plantilla para evidencia manual (capturas/video)
- matriz de permisos documentada
- checklist de entrega con placeholders

## Cambios incluidos

- `docs/SESSION_CONTEXT.md`
  - QA manual por rol marcado como validado (pendiente evidencia visual).
- `docs/tasks.md`
  - backlog actualizado con QA/auditoria/build completados.
- `docs/progress.md`
  - progreso diario actualizado y pendientes de acceptance refinados.
- `docs/ACCEPTANCE_CHECKLIST.md`
  - Acceso/Roles y Auditoria marcados como OK.
  - placeholders de entrega/usuarios de prueba agregados.
- `docs/manual-qa-evidence.md`
  - plantilla para registrar capturas/video y notas por rol/auditoria.
- `docs/permissions-matrix.md`
  - matriz de permisos MVP consolidada.
- `docs/delivery-checklist.md`
  - checklist base de entrega/operacion.

## Validacion realizada

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] QA manual por rol (admin, rrhh, contabilidad, visitante) reportado OK
- [x] Verificacion de auditoria (`auth_login`, `auth_logout` manual/timeout, `document_*`) reportada OK

## Pendientes fuera de este PR (o para completar antes de merge)

- [ ] Adjuntar/registrar capturas o video en `docs/manual-qa-evidence.md`
- [ ] Completar usuarios de prueba (por canal seguro) en `docs/ACCEPTANCE_CHECKLIST.md`
- [ ] Completar URL staging/produccion en `docs/ACCEPTANCE_CHECKLIST.md`
- [ ] Completar `docs/delivery-checklist.md` con datos reales de entrega

## Riesgos / notas

- Este PR documenta QA manual reportado por usuario; la evidencia visual queda diferida y se registra con placeholders.
- La politica final de:
  - trabajador inactivo
  - tamano maximo PDF
  - destinatarios de email por area
  sigue pendiente de definicion de negocio.

## Checklist de merge

- [ ] PR revisado
- [ ] Evidencia visual adjunta o ticket de seguimiento creado
- [ ] Sin conflictos con `main`
- [ ] Mergeable

## Links (completar)

- Issue/Ticket:
- PR:
- Carpeta de evidencia (si queda fuera del repo):
