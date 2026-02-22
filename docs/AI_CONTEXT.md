# AI_CONTEXT.md — Intranet Anagami (Gestión Documental)

> Nota (2026-02-22): este archivo queda como contexto de referencia/legacy. La memoria persistente operativa se mantiene en `docs/system-overview.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/progress.md` y `docs/tasks.md`.

> Archivo de contexto para usar con VSCode (Gemini Code) y Codex (CLI/VSCode).  
> Objetivo: mantener consistencia técnica, respeto estricto al alcance, y calidad profesional.

---

## 1) Contexto del proyecto (qué estamos construyendo)

Estamos construyendo una **intranet web de Gestión Documental** para **Anagami Seguridad**.

**MVP (Fase 1)**:

- Login y sesiones con timeout por inactividad
- **Roles**: Admin, RRHH, Contabilidad, Visitante
- Gestión de **Trabajadores** (crear/editar + estado Activo/Inactivo)
- Gestión de **documentos PDF** (máx 5MB, solo PDF) asociados a trabajador y a una de **12 carpetas fijas**
- Flujo de estado por documento: **Pendiente / Aprobado / Rechazado**
- Descarga de PDFs según permisos
- **Notificaciones** (email + panel/admin) por carga/aprobación/rechazo
- **Auditoría / Logs** (quién sube/aprueba/rechaza y eventos de acceso)
- Responsive

**Restricciones clave del alcance (NO implementar en esta fase):**

- NO carpetas dinámicas / personalizadas (son 12 fijas)
- NO firma electrónica
- NO integraciones con sistemas externos
- NO automatizaciones complejas fuera del flujo definido
  Si algo “suena útil” pero no está en el alcance: marcar como **Fase 2**.

---

## 2) Stack definido (Fase 1)

### Frontend

- **Next.js (App Router)** + **TypeScript**
- **TailwindCSS** + componentes (recomendado: shadcn/ui)
- Validación: **Zod**
- Data fetching: server actions o React Query (TanStack) según convenga
- Testing mínimo: Playwright (e2e básico) o Vitest (unit)

### Backend / BaaS

- **Supabase**
  - Postgres (DB)
  - Auth (login)
  - Storage (PDFs)
  - **RLS** (Row Level Security) para permisos reales

### Notificaciones

- Edge Functions (Supabase) + proveedor email (Resend/SendGrid/Mailgun) o SMTP.

### Deploy

- **Vercel** (frontend)
- Supabase (backend)

---

## 3) Modelo mental del dominio (entidades)

### Roles

- **Admin**: control total, gestiona usuarios, aprueba/rechaza, ve logs y notificaciones
- **RRHH**: gestiona trabajadores y documentos relacionados a RRHH (según permisos)
- **Contabilidad**: acceso a documentos/acciones según permisos
- **Visitante**: acceso muy limitado (solo lectura donde corresponda)

### Trabajador

- Datos identificatorios (definir campos exactos en schema)
- Estado: **Activo / Inactivo**
- Tiene **12 carpetas fijas** (no se crean ni eliminan)

### Documento (PDF)

- Pertenece a 1 trabajador
- Pertenece a 1 carpeta fija (enum)
- Archivo PDF (max 5MB) en Supabase Storage
- Estado: Pendiente/Aprobado/Rechazado
- Auditoría: quién sube, quién aprueba/rechaza, timestamps, motivo rechazo (si aplica)

### Auditoría / Logs

- Evento, usuario, rol, entidad afectada (worker/document), timestamp, metadata.

---

## 4) Reglas de seguridad (obligatorio)

- **RLS en Supabase** es obligatorio (la UI no es seguridad).
- Validar permisos en backend/queries.
- No exponer buckets públicos sin control.
- Limitar downloads según rol.
- Registrar eventos relevantes en logs.

---

## 5) Criterios de aceptación (Definition of Done)

Una entrega se considera “lista” cuando cumple:

- Login funcional + roles
- Crear/editar trabajador
- Desactivar trabajador
- Subir PDF (solo PDF, max 5MB)
- Cambiar estado (pendiente/aprobado/rechazado)
- Descargar PDF según permisos
- Notificación email (carga/aprobación/rechazo)
- Log de auditoría
- Responsive

---

## 6) Estilo de código y estándares (no negociar)

- TypeScript estricto
- ESLint + Prettier + format-on-save
- Componentes UI reutilizables
- Nombres consistentes (snake_case DB, camelCase TS)
- Manejo de errores y estados de carga
- Accesibilidad mínima (labels, focus, etc.)

---

## 7) Estructura recomendada del repo

- `/app` (Next.js)
- `/supabase`
  - `/migrations`
  - `/seed`
  - `/policies` (documentar RLS)
- `/docs`
  - `AI_CONTEXT.md` (este archivo)
  - `DECISIONS.md` (ADR: decisiones técnicas)
  - `ACCEPTANCE_CHECKLIST.md`
  - `RUNBOOK.md` (cómo levantar/depurar)

---

## 8) Flujo de trabajo con IA (Gemini Code / Codex)

### Principio

La IA **propone**, el humano **aprueba**, y todo queda en **commits pequeños**.

### Cómo pedirle a la IA (formato de tarea)

Cuando generes una tarea, incluye:

- Objetivo
- Alcance exacto
- Entradas/salidas
- Reglas de seguridad (RLS, permisos)
- Archivos a tocar
- Criterios de aceptación del ticket

Ejemplo de prompt corto por ticket:

- “Implementa CRUD de trabajadores (crear/editar/listar), con validación Zod, UI en /app/(dashboard)/workers, y políticas RLS para que solo Admin y RRHH puedan editar. Incluye tests mínimos o al menos casos manuales.”

### Reglas para PR/commit

- Un ticket = una rama = un PR
- PR pequeño (ideal 200–400 líneas)
- Checklist del PR:
  - `pnpm lint` / `npm run lint`
  - `pnpm typecheck`
  - Prueba manual del flujo
  - Revisión de permisos y RLS

---

## 9) Convenciones importantes

- Carpetas fijas: usar enum central `FolderType` (FEAT: **no strings sueltos**)
- Estados del documento: enum `DocumentStatus`
- Todas las mutaciones registran logs (mínimo en server actions o edge function)
- Si hay ambigüedad: **no inventar**; dejar `TODO:` y proponer opción A/B con impacto.

---

## 10) Qué NO hacer

- No agregar features “extra” sin ticket/decisión (ni aunque parezcan fáciles)
- No saltarse RLS
- No dejar lógica de permisos solo en el frontend
- No usar `any` sin justificación
- No mezclar estilos/arquitecturas sin coherencia

---

## 11) Salida esperada de la IA cuando se le pida algo

Cuando se te pida implementar o proponer algo, responde con:

1. Resumen del plan
2. Archivos a crear/modificar
3. Código (si aplica)
4. Notas de seguridad (RLS/permisos)
5. Checklist de prueba manual

---

## 12) Preguntas “permitidas” (si falta info)

Si falta información para implementar con seguridad, la IA debe:

- Proponer 2 alternativas claras y sus tradeoffs
- Elegir una por defecto (la más simple y alineada al MVP)
- Marcar lo que quedará parametrizable

---

Fin del contexto.
