# RUNBOOK — Intranet Anagami

## 1) Requisitos locales

- Node.js 20+ (recomendado 22+)
- npm 10+
- Proyecto Supabase creado (URL + keys)

## 2) Configuracion inicial

1. Copiar `.env.example` a `.env.local`.
2. Completar variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_URL`
   - `INACTIVITY_TIMEOUT_MINUTES`
   - `RESEND_API_KEY` (cuando se implemente notificacion email)
   - `NOTIFICATIONS_FROM_EMAIL`

## 3) Comandos de desarrollo

```bash
npm install
npm run dev
```

## 4) Calidad de codigo

```bash
npm run lint
npm run typecheck
npm run format:check
```

## 5) Base de datos (Supabase)

- Migraciones SQL en `supabase/migrations`.
- Semillas de datos en `supabase/seed`.
- Documentacion de politicas en `supabase/policies`.

Pasos recomendados:

1. Aplicar `20260220_000001_init_schema.sql` en Supabase SQL Editor (o CLI).
2. Verificar tablas y RLS habilitado.
3. Verificar bucket privado `documents` (solo PDF, max 5MB).

## 6) Flujo obligatorio por ticket

1. Actualizar `main` local (`git pull`).
2. Crear rama por ticket (`feature/<nombre-ticket>`).
3. Implementar alcance acotado.
4. Ejecutar `lint` + `typecheck` + `build`.
5. Probar manualmente con al menos un rol.
6. Abrir PR pequeno con checklist.
7. Merge a `main` al aprobar.

Regla:
- No desarrollar features directo sobre `main`.
- Excepcion: hotfix minimo y urgente.

## 7) Incidentes comunes

- Error de variables Supabase:
  - Validar `.env.local` y reiniciar servidor.
- Acceso denegado por RLS:
  - Revisar rol en `profiles` y policy aplicable.
- Upload PDF rechazado:
  - Confirmar `mime_type=application/pdf` y `<=5MB`.
