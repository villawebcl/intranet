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
  - `visitante`: visualizacion documental restringida (metadata/listado), sin descarga directa; puede solicitar descarga
  - `contabilidad`: lectura documental (ver/descargar) y carga restringida solo a `Liquidaciones`; sin revisar
  - `admin` y `rrhh`: gestion documental completa
  - `audit`: visible solo para `admin`
- Motivo: Cerrar ambiguedad de permisos y alinear UI + backend + RLS con una matriz clara.
- Impacto: Reduce riesgos de acceso indebido manteniendo una excepcion controlada para `contabilidad` en `Liquidaciones`; obliga a QA manual por rol y evidencia en acceptance.

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

### ADR-010 — Politica MVP de trabajador inactivo en modulo documental

- Fecha: 2026-02-23
- Estado: aplicada
- Decision: Si el trabajador esta `inactivo`, se bloquea la carga de nuevos documentos; la lectura/descarga sigue dependiendo del rol del usuario (sin bloqueo total adicional).
- Motivo: Mantener trazabilidad y consulta historica sin romper operacion de roles lectores (`contabilidad`) y reducir complejidad/riesgo de cambios en permisos/RLS.
- Impacto: La UI muestra warning y deshabilita carga; backend rechaza la subida en server action; acceptance B puede documentar regla clara.

### ADR-011 — Politica MVP de tamano maximo PDF en 5MB

- Fecha: 2026-02-23
- Estado: aplicada
- Decision: Mantener limite maximo de carga en `5MB` para PDFs en MVP (validacion frontend + backend), con posibilidad de ajuste posterior por requerimiento del cliente.
- Motivo: Ya esta implementado de forma consistente y reduce riesgo operativo/costos de storage en el cierre del MVP.
- Impacto: Constante centralizada de politica documental; mensajes UI/backend y checklist de acceptance quedan alineados con `5MB`.

### ADR-012 — Sistema visual dashboard: shell oscuro + contenido claro (dark mode suave)

- Fecha: 2026-02-23
- Estado: aplicada
- Decision:
  - Mantener navegacion principal (header + sidebar) como `shell` visual del dashboard.
  - En modo oscuro usar enfoque "oscuro suave" profesional con `shell` navy y area de contenido clara para preservar legibilidad de tablas/cards.
  - Mantener el dashboard `Inicio` como resumen ejecutivo (estado/metricas/actividad) y evitar duplicar navegacion en botones internos.
  - Reservar acciones operativas en las vistas del modulo correspondiente (ej. `Usuarios`) y dejar vistas de referencia (`Acceso y roles`) como politica/matriz.
- Motivo: Mejorar legibilidad, jerarquia visual y consistencia UX en una intranet empresarial (seguridad/compliance), evitando saturacion de informacion y duplicidad funcional.
- Impacto:
  - Se introduce toggle de tema con persistencia local y transicion suave.
  - Se estandariza un patron de tablas: resumen compacto + detalle bajo demanda (modal) cuando la metadata/payload satura la vista.
  - Se reduce deuda UX al separar "navegacion" de "accion" y "referencia" de "gestion".

## Pendientes de decision (registrar al resolver)

- Sin pendientes tecnicos criticos en politica documental MVP.
- Pendiente operativo/cliente relacionado: confirmar destinatarios de email por area/unidad (si se habilita correo externo).
