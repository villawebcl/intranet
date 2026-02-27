# Intranet Base (Plantilla)

Plantilla reusable de intranet documental (white-label) para adaptarla por cliente.

Incluye:

- login + logout
- dashboard inicial con resumen operativo
- gestion de trabajadores
- gestion documental por carpetas
- auditoria
- notificaciones
- permisos por rol con Supabase RLS
- rol `trabajador` con acceso solo a su propia documentacion

## Roles incluidos

- `admin`
- `rrhh`
- `contabilidad`
- `trabajador`
- `visitante`

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres/Auth/Storage/RLS)
- Zod
- Playwright (smoke E2E)

## Inicio rapido

1. Instalar dependencias

```bash
npm install
```

2. Crear variables de entorno

```bash
cp .env.example .env.local
```

3. Configurar Supabase en `.env.local`

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

4. Levantar local

```bash
npm run dev
```

La app abre en `http://localhost:3000` y redirige directo a `/login`.

## Configuracion de base de datos (Supabase)

Aplica las migraciones en orden (por nombre/fecha) desde `supabase/migrations/`.

Migraciones clave:

- `20260220_000001_init_schema.sql` (schema base + RLS inicial)
- `20260221_000002_permissions_hardening.sql`
- `20260223_000003_contabilidad_upload_liquidaciones.sql`
- `20260223_000004_visitante_document_view_request.sql`
- `20260226_000005_trabajador_self_documents.sql` (agrega rol `trabajador` + `profiles.worker_id`)
- `20260226_000006_trabajador_self_documents_policies.sql` (politicas RLS del rol `trabajador`)
- `20260226_000007_download_requests_security.sql` (solicitud/aprobacion de descargas + hardening storage)
- `20260227_000008_audit_logs_rpc_hardening.sql` (bloqueo de insert directo + RPC segura)
- `20260227_000009_workers_soft_delete.sql` (soft delete en `workers`)
- `20260227_000010_workers_restore_policy.sql` (desarchivar workers por policy)
- `20260227_000011_profiles_worker_unique_assignment.sql` (unicidad de asignacion `profiles.worker_id`)
- `20260227_000012_performance_indexes_pagination.sql` (indices para listados paginados)
- `20260227_000013_profiles_sensitive_fields_hardening.sql` (protege `profiles.role/worker_id` + RPC admin controlada)
- `20260227_000014_notifications_download_request_spoof_hardening.sql` (anti-spoof en notifications + RPC validada)

Nota:

- Las migraciones `000005` y `000006` estan separadas a proposito para evitar error de PostgreSQL al usar un valor nuevo de enum en la misma transaccion.

## Usuarios demo (ficticios)

Puedes crear/actualizar usuarios demo con:

```bash
npm run supabase:reset-users
```

Esto crea cuentas demo y ajusta perfiles/roles.

Usuarios demo esperados:

- `admin@empresa.local`
- `rrhh@empresa.local`
- `contabilidad@empresa.local`
- `trabajador@empresa.local`
- `visitante@empresa.local`

Clave demo actual:

- `Pass123!`

Provision especifica del trabajador demo (auth + ficha `workers` + vinculacion `profiles.worker_id`):

```bash
npm run supabase:provision-trabajador
```

## Scripts utiles

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test:unit
npm run rc
npm run format
npm run format:check
npm run e2e:smoke
npm run e2e:smoke:headed
npm run supabase:reset-users
npm run supabase:provision-trabajador
```

## Paginacion de listados

Listados operativos con paginacion real:

- `/dashboard/users` (`20` por pagina)
- `/dashboard/workers` (`20` por pagina)
- `/dashboard/workers/:workerId/documents` (`20` por pagina)
- `/dashboard/notifications` (`25` por pagina)
- `/dashboard/audit` (`50` por pagina)

Todos preservan filtros en la URL (`page`, `q`, `status`, `archive`, etc.).

## Verificacion rapida post-deploy

1. Aplicar migraciones SQL pendientes.
2. Validar certificacion de release:
   - `npm run rc`
3. Probar navegacion por pagina en:
   - `workers`, `documents`, `notifications`, `audit`
4. Confirmar que acciones vuelven a la misma pagina (`returnTo` con `page`).

## Personalizacion por cliente (checklist)

Usa esta base y cambia al menos:

1. Branding

- nombre de la intranet
- logo / favicon
- textos de login/dashboard

2. Dominio y correos

- `APP_URL`
- `NOTIFICATIONS_FROM_EMAIL`
- dominio de deploy (Vercel u otro)

3. Usuarios y roles

- cuentas reales del cliente
- politicas/alcances segun contrato

4. Permisos / RLS

- revisar politicas de `documents`, `storage.objects`, `notifications`
- validar matriz de acceso por rol

5. E2E fixtures

- correos y datos de prueba en `.env.local` (si usaras smoke tests)

## Estructura del proyecto

- `app/`: rutas y UI (login/dashboard)
- `components/`: componentes reutilizables
- `lib/`: auth, constantes, validadores, supabase clients, notificaciones
- `supabase/migrations/`: schema y politicas SQL
- `tests/e2e/`: smoke tests con Playwright
- `scripts/`: utilidades de provision/reset para Supabase
- `docs/`: documentacion funcional y tecnica

## Deploy (Vercel)

Minimo requerido en variables de entorno:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`

Opcional (emails):

- `RESEND_API_KEY`
- `NOTIFICATIONS_FROM_EMAIL`

## Calidad y flujo recomendado

- Trabajar por ramas (`feature/...`)
- No desarrollar directo en `main`
- Ejecutar antes de merge:
  - `npm run rc`

## Documentacion adicional

- `docs/system-overview.md`
- `docs/architecture.md`
- `docs/decisions.md`
- `docs/progress.md`
- `docs/RELEASE.md`
- `docs/tasks.md`
