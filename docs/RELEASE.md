# Release Runbook (MVP Hardened)

## 1) Congelar release (pre-tag)

1. Actualiza rama de release:
   - `git checkout <release-branch>`
   - `git pull --ff-only`
2. Ejecuta certificacion tecnica completa:
   - `npm run rc`
3. Si `rc` pasa en verde, congela:
   - `git status` (debe quedar limpio para taggear)
   - `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
   - `git push origin <release-branch> --tags`

## 2) Comando unico de certificacion

- `npm run rc`
- Ejecuta en cadena y falla en el primer error:
  - `lint`
  - `typecheck`
  - `test:unit`
  - `build:ci`
  - `e2e:smoke`

## 3) Despliegue DB y verificacion minima

1. Aplicar migraciones:
   - `supabase link --project-ref <project-ref>`
   - `supabase db push`
2. Verificar policies desplegadas:

```sql
select schemaname, tablename, policyname, cmd
from pg_policies
where (schemaname = 'public' and tablename in (
  'profiles', 'workers', 'documents', 'audit_logs', 'notifications', 'download_requests'
))
or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;
```

3. Verificar funciones críticas:

```sql
select routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'insert_audit_log',
    'admin_set_profile_role_and_worker',
    'create_download_request_notifications'
  )
order by routine_name;
```

## 4) Admin inicial (bootstrap + RPC)

`admin_set_profile_role_and_worker(...)` exige `current_app_role() = 'admin'`, por lo que **no sirve para crear el primer admin desde cero**.

### Paso A: bootstrap one-time del primer admin

1. Crea usuario en Auth (Dashboard o `auth.admin.createUser`).
2. En SQL Editor (solo una vez), asigna rol admin al primer usuario:

```sql
insert into public.profiles (id, role, full_name)
values ('<USER_UUID>'::uuid, 'admin'::public.app_role, 'Admin Inicial')
on conflict (id) do update
set role = excluded.role,
    full_name = excluded.full_name,
    updated_at = now();
```

### Paso B: admins adicionales via RPC (camino oficial)

Con sesion autenticada de admin (UI/Server Action), usar RPC:

```sql
select public.admin_set_profile_role_and_worker(
  '<TARGET_USER_UUID>'::uuid,
  'admin'::public.app_role,
  null
);
```

## 5) Checklist post-deploy rapido

1. Login admin funciona.
2. `visitante` no descarga directo de storage.
3. Solicitud de descarga aprobada genera signed URL temporal.
4. Auditoria registra login/logout y eventos críticos.
5. Listados principales cargan con paginacion.
