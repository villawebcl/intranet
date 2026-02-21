# Intranet Anagami

Base inicial del MVP de gestion documental para Anagami Seguridad.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres/Auth/Storage/RLS)
- Zod para validacion de entorno

## Estructura

- `app/`: rutas y UI
- `lib/`: constantes de dominio, entorno, clientes Supabase
- `supabase/migrations/`: esquema SQL y politicas base
- `supabase/policies/`: documentacion de RLS
- `supabase/seed/`: scripts de datos iniciales
- `docs/`: contexto funcional, decisiones y runbook

## Contexto rapido para retomar

- Leer primero: `docs/SESSION_CONTEXT.md`
- Contexto completo: `docs/AI_CONTEXT.md`

## Primeros pasos

1. Instalar dependencias:

```bash
npm install
```

2. Crear variables de entorno:

```bash
cp .env.example .env.local
```

3. Levantar entorno local:

```bash
npm run dev
```

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run format
npm run format:check
npm run build
npm run start
```

## Base de datos

- Aplicar migracion inicial: `supabase/migrations/20260220_000001_init_schema.sql`
- Incluye:
  - enums de dominio (`app_role`, `folder_type`, `document_status`)
  - tablas (`profiles`, `workers`, `documents`, `notifications`, `audit_logs`)
  - triggers `updated_at`
  - RLS base por rol
  - bucket privado `documents` con limite 5MB y PDF

## Nota importante

Las politicas RLS incluidas son una base segura para iniciar. Se deben ajustar por ticket cuando se cierre la matriz final de permisos (especialmente rol `visitante`).
# intranetanagami
