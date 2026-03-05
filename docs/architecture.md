# Architecture

## Objetivo de este archivo

Documentar la arquitectura actual del sistema (no solo la planeada).

## Regla critica (memoria persistente)

- Leer este archivo y `docs/system-overview.md` antes de cambios de estructura, seguridad, datos o modulos.
- Actualizar este archivo despues de cambios en stack, carpetas, patrones o integraciones.

## Arquitectura del sistema (alto nivel)

- **Frontend + BFF ligero:** Next.js App Router renderiza UI y ejecuta Server Actions para mutaciones.
- **Backend/BaaS:** Supabase (Postgres + Auth + Storage + RLS).
- **Seguridad real:** permisos duplicados en UI/backend y reforzados por RLS.
- **Documentos:** PDFs almacenados en bucket privado; descarga por URL firmada.

## Stack actual

### Aplicacion

- Next.js `16.1.x` (App Router)
- React `19.2.x`
- TypeScript `5.x`
- Tailwind CSS `4.x`
- Zod `4.x`

### Integraciones

- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- Resend (via `fetch` HTTP directo, opcional por variables de entorno)

### Calidad

- ESLint
- Prettier
- `tsc --noEmit` para typecheck

## Estructura de carpetas (actual)

```text
app/
  (auth)/
  (dashboard)/
components/
  auth/
lib/
  auth/
  constants/
  notifications/
  supabase/
  validators/
supabase/
  migrations/
  policies/
  seed/
docs/
```

## Responsabilidad por carpeta

- `app/`: rutas, pages, layouts y server actions por modulo.
- `components/`: componentes reutilizables de UI (ej. auth/timeout watcher).
- `lib/auth/`: helpers de permisos por rol.
- `lib/constants/`: enums/constantes de dominio compartidas.
- `lib/validators/`: esquemas Zod para inputs (workers/documents).
- `lib/supabase/`: clientes browser/server/admin segregados por contexto.
- `lib/notifications/`: servicio de notificaciones y plantillas email.
- `supabase/migrations/`: esquema y cambios SQL versionados.
- `supabase/policies/`: documentacion de RLS/policies.
- `docs/`: memoria persistente, runbook y contexto historico.

## Patrones usados (vigentes)

### 1. Route Groups (Next.js App Router)

- `app/(auth)` para login/autenticacion.
- `app/(dashboard)` para area privada.

Beneficio: separa layouts/flujo sin afectar URLs finales.

### 2. Server Actions para mutaciones

- Acciones como crear/editar trabajadores, logout, cambios documentales.
- Validan permisos y datos antes de escribir en DB.
- Usan `redirect()` con mensajes en querystring para feedback rapido del MVP.

### 3. Validacion con Zod en backend

- Inputs de formularios se validan con esquemas en `lib/validators/*`.
- Reduce errores de formato y centraliza reglas de negocio basicas.

### 4. Permisos en capas (UI + backend + RLS)

- Helpers de rol en `lib/auth/roles.ts`.
- Chequeos en server actions.
- RLS en Supabase como control definitivo.

### 5. Clientes Supabase por contexto

- Browser client: consumo desde cliente.
- Server client: lectura/escritura con sesion del usuario.
- Admin client: operaciones privilegiadas puntuales (ej. lookup de emails/perfiles).

### 6. Auditoria transversal

- Mutaciones y eventos relevantes insertan registros en `audit_logs`.
- Incluye auth (login/logout), workers y documentos.

### 7. Notificaciones desacopladas del modulo documental

- Servicio en `lib/notifications/service.ts` maneja lookup de destinatarios, insercion, envio y marcacion `sent_at`.
- Envio email es opcional: si no hay ENV, el sistema mantiene registro interno sin romper flujo.

## Riesgos/limites actuales de arquitectura

- La suite automatizada cubre calidad base (`lint`, `typecheck`, unit y smoke E2E), pero aun no es regresion completa end-to-end.
- Mensajeria por `redirect` + query params es simple y estable para MVP, pero limitada para UX compleja de largo plazo.
- El dashboard y vistas principales ya estan operativas; quedan oportunidades de seguir descomponiendo paginas grandes en modulos mas chicos para mantenibilidad.
- Politica documental MVP definida y aplicada: maximo `5MB` para PDF y bloqueo de carga para trabajador `inactivo` (lectura/descarga segun rol).

## Referencias clave

- `docs/system-overview.md`
- `docs/decisions.md`
- `docs/tasks.md`
- `docs/RUNBOOK.md`
