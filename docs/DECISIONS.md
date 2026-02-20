# DECISIONS.md — Registro de decisiones (ADR liviano)

## Cómo usar este archivo

Cada decisión importante se registra con:

- Contexto
- Decisión
- Alternativas consideradas
- Consecuencias

Formato: ADR-XXX.  
Ejemplo: ADR-001, ADR-002…

---

## ADR-001 — Stack Fase 1 (Supabase + Vercel)

**Fecha:** YYYY-MM-DD  
**Contexto:** Necesitamos entregar MVP rápido con auth, DB y storage PDF.  
**Decisión:** Usar Supabase (Postgres/Auth/Storage/RLS) + Next.js en Vercel.  
**Alternativas:**

- Backend propio (Node/Express + DB + S3): más control, más tiempo.
- Firebase: rápido, pero modelo y permisos distintos, costo y lock-in.
  **Consecuencias:**
- Desarrollo más rápido.
- RLS y policies son críticas para seguridad.
- Migración futura a on-prem requerirá plan (Fase 2).

---

## ADR-002 — Carpetas fijas (12) como ENUM

**Fecha:** YYYY-MM-DD  
**Contexto:** Requisito de 12 carpetas estáticas por trabajador.  
**Decisión:** Modelar carpetas como ENUM (FolderType) y no permitir creación dinámica.  
**Alternativas:**

- Tabla `folders` dinámica: más flexible pero fuera de alcance.
  **Consecuencias:**
- UI más simple.
- Datos consistentes.
- Fase 2 podría migrar a folders dinámicas si el cliente lo pide.

---

## ADR-003 — Flujo de estados de documentos

**Fecha:** YYYY-MM-DD  
**Contexto:** Documento debe pasar por estados Pendiente/Aprobado/Rechazado.  
**Decisión:** `DocumentStatus` (enum) + transición controlada por rol.  
**Alternativas:**

- Workflow configurable: fuera de alcance.
  **Consecuencias:**
- Lógica simple.
- Permite auditoría clara.

---

## ADR-004 — Notificaciones por email

**Fecha:** YYYY-MM-DD  
**Contexto:** Debe avisar al cargar/aprobar/rechazar.  
**Decisión:** Disparar emails desde Supabase Edge Functions usando proveedor (Resend/SendGrid/Mailgun).  
**Alternativas:**

- Emails desde frontend: inseguro (expones keys).
- Cron + polling: más lento, más complejo.
  **Consecuencias:**
- Keys se guardan en secrets/ENV del backend.
- Mejor trazabilidad y seguridad.

---

## ADR-005 — Auditoría mínima obligatoria

**Fecha:** YYYY-MM-DD  
**Contexto:** Se requiere log/auditoría de acciones.  
**Decisión:** Tabla `audit_logs` con eventos críticos (mutaciones + accesos relevantes).  
**Alternativas:**

- Solo logs del servidor: difícil de consultar por negocio.
  **Consecuencias:**
- DB crece, pero controlable.
- Facilita soporte y compliance.

---

## ADR-006 — Manejo de trabajador Inactivo

**Fecha:** YYYY-MM-DD  
**Contexto:** Trabajador puede desactivarse. ¿Qué se permite luego?  
**Decisión:** (Definir)

- Opción A: No permite subir nuevos docs, solo lectura y descarga según rol.
- Opción B: Bloqueo total salvo Admin.
  **Alternativas:** (Definir)
  **Consecuencias:** (Definir)

---

## ADR-007 — Modelo de permisos (RLS)

**Fecha:** YYYY-MM-DD  
**Contexto:** Roles y acceso a documentos deben ser reales (no solo UI).  
**Decisión:** Implementar RLS por tabla + policies por rol + pruebas manuales por rol.  
**Alternativas:**

- Validación solo en frontend: inseguro.
  **Consecuencias:**
- Requiere disciplina: cada tabla nueva debe tener policy.
- Se deben documentar policies en `/supabase/policies`.

---

## Backlog de decisiones pendientes

- [ ] Campos exactos del trabajador (mínimo viable).
- [ ] Qué ve exactamente el rol Visitante.
- [ ] Motivo de rechazo: obligatorio o opcional.
- [ ] Descarga por Visitante: permitida o requiere solicitud.
- [ ] Política exacta de “trabajador inactivo”.
