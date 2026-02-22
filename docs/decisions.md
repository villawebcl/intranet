# Decisions

## Objetivo de este archivo

Registro de decisiones tecnicas importantes (ADR liviano) con fecha, motivo e impacto.

## Regla critica (memoria persistente)

- Leer este archivo antes de cambios importantes de arquitectura, permisos, datos o integraciones.
- Registrar aqui toda decision tecnica relevante inmediatamente despues de implementarla o aprobarla.

## Formato recomendado

- ID
- Fecha
- Decision
- Motivo
- Impacto
- Estado (`aplicada`, `pendiente`, `reemplazada`)

## Decisiones registradas

### ADR-001 — Stack MVP con Next.js + Supabase + Vercel

- Fecha: 2026-02-20 (registro consolidado desde `docs/DECISIONS.md`)
- Estado: aplicada
- Decision: Usar Next.js (App Router) + Supabase (Postgres/Auth/Storage/RLS) + despliegue en Vercel para Fase 1.
- Motivo: Entregar MVP rapido con auth, base de datos, storage y seguridad por roles sin construir backend propio completo.
- Impacto: Reduce tiempo de implementacion; exige disciplina en RLS/policies y deja planificada una posible migracion futura si se requiere on-prem.

### ADR-002 — 12 carpetas fijas modeladas como enum

- Fecha: 2026-02-20 (registro consolidado desde `docs/DECISIONS.md`)
- Estado: aplicada
- Decision: Las carpetas documentales son fijas (`folder_01` ... `folder_12`) y se modelan como enum, sin creacion dinamica en MVP.
- Motivo: Requisito funcional del cliente y necesidad de simplificar UI, validacion y consistencia.
- Impacto: Menor complejidad y menos errores; limita flexibilidad y deja una posible migracion a carpetas dinamicas como Fase 2.

### ADR-003 — Flujo documental simple por estados

- Fecha: 2026-02-20 (registro consolidado desde `docs/DECISIONS.md`)
- Estado: aplicada
- Decision: Usar `DocumentStatus` con flujo base `pendiente`, `aprobado`, `rechazado`, con transiciones controladas por rol.
- Motivo: Cubrir el proceso de revision del MVP sin implementar un workflow configurable.
- Impacto: Logica clara y auditable; menos flexibilidad para procesos no estandar.

### ADR-004 — Notificaciones desde backend (registro interno + email opcional)

- Fecha: 2026-02-20 (registro consolidado, refinada el 2026-02-21)
- Estado: aplicada
- Decision: Registrar eventos en tabla `notifications` y enviar email desde backend/servicio (Resend) cuando ENV este configurada.
- Motivo: Evitar exponer credenciales en frontend y mantener trazabilidad aunque el envio email falle o no este configurado.
- Impacto: Flujo mas seguro; requiere secrets/ENV y manejo de errores del proveedor.

### ADR-005 — Auditoria minima obligatoria en base de datos

- Fecha: 2026-02-20 (registro consolidado desde `docs/DECISIONS.md`)
- Estado: aplicada
- Decision: Registrar eventos criticos en `audit_logs` (auth, workers, documentos y descargas relevantes).
- Motivo: Trazabilidad operativa, soporte y cumplimiento basico del MVP.
- Impacto: Mayor visibilidad y soporte; crecimiento de tabla a monitorear con el tiempo.

### ADR-006 — Seguridad por permisos en capas + RLS obligatorio

- Fecha: 2026-02-20 (reforzada 2026-02-21)
- Estado: aplicada
- Decision: No confiar solo en frontend; aplicar checks de rol en UI/server actions y RLS por tabla en Supabase.
- Motivo: Evitar bypass de permisos y garantizar seguridad real por rol.
- Impacto: Mayor robustez; cada tabla/feature nueva requiere policy y pruebas por rol.

### ADR-007 — Matriz de permisos documental endurecida

- Fecha: 2026-02-21
- Estado: aplicada
- Decision:
  - `visitante`: sin acceso al modulo documental (no ver/no descargar/no subir/no revisar)
  - `contabilidad`: solo lectura documental (ver/descargar), sin subir/revisar
  - `admin` y `rrhh`: gestion documental completa
  - `audit`: visible solo para `admin`
- Motivo: Cerrar ambiguedad de permisos y alinear UI + backend + RLS con una matriz clara.
- Impacto: Reduce riesgos de acceso indebido; obliga a QA manual por rol y evidencia en acceptance.

### ADR-008 — Motivo de rechazo obligatorio en revision documental

- Fecha: 2026-02-21 (inferida por estado implementado en `SESSION_CONTEXT.md`; confirmar si se requiere exactitud de commit)
- Estado: aplicada
- Decision: Al rechazar un documento, el motivo de rechazo es obligatorio y se persiste.
- Motivo: Mejorar trazabilidad y accion correctiva para RRHH/usuarios internos.
- Impacto: Mas claridad operativa; agrega validacion y manejo de mensajes en flujo de revision.

### ADR-009 — Memoria persistente operativa en `docs/` (5 archivos base)

- Fecha: 2026-02-22
- Estado: aplicada
- Decision: Estandarizar memoria persistente en:
  - `docs/architecture.md`
  - `docs/decisions.md`
  - `docs/progress.md`
  - `docs/tasks.md`
  - `docs/system-overview.md`
- Motivo: Evitar saturacion del contexto conversacional y facilitar continuidad de desarrollo en sesiones largas.
- Impacto: Mejora continuidad y handoff; agrega disciplina de mantenimiento documental antes/despues de cambios importantes.

## Pendientes de decision (registrar al resolver)

### ADR-P001 — Politica final para trabajador inactivo

- Fecha: pendiente
- Estado: pendiente
- Decision: Definir si se bloquea solo la subida de documentos o se restringe lectura/otras acciones.
- Motivo: El comportamiento impacta UX, permisos y acceptance.
- Impacto: Cambios en server actions, mensajes UI, pruebas manuales y posiblemente RLS.

### ADR-P002 — Politica final de tamano maximo PDF

- Fecha: pendiente
- Estado: pendiente
- Decision: Confirmar si se mantiene 5MB o se ajusta por politica interna.
- Motivo: Requisito operativo aun no confirmado por negocio.
- Impacto: Cambia validaciones, mensajes UI y documentacion de runbook/acceptance.
