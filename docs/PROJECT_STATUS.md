# PROJECT_STATUS

## 1) Resumen del sistema
Intranet web single-tenant para gestion documental de trabajadores, con control de acceso por rol, auditoria de eventos y descargas mediante signed URLs generadas server-side.

## 2) Modulos incluidos
- Autenticacion y sesion (`/login`, logout manual y timeout).
- Dashboard principal (`/dashboard`).
- Usuarios nucleo (admin): crear/editar/cambiar rol/reset password/eliminar.
- Trabajadores: alta/edicion/estado/archivado/eliminacion definitiva (admin).
- Acceso portal de trabajador: creacion, suspension y reactivacion.
- Documentos por trabajador: subida PDF, revision, descarga directa y flujo de solicitud/aprobacion para visitante.
- Notificaciones internas (y email opcional por ENV).
- Auditoria (`/dashboard/audit`) con hardening anti-spoof.

## 3) Stack
- Frontend/Backend web: Next.js 16 (App Router, Server Actions), React 19, TypeScript.
- Estilos: Tailwind CSS v4.
- Backend de datos y auth: Supabase (Postgres + RLS + RPC + Storage).
- Validacion: Zod.
- Pruebas: Playwright (unit + e2e smoke).
- Deploy: Vercel.

## 4) Estado actual de calidad
Fecha de corte: **27 de febrero de 2026**.

- `npm run lint`: **OK**.
- `npm run typecheck`: **OK**.
- `npm run test:unit`: **OK** (28 pruebas aprobadas).
- `npm run build:ci`: **OK** (build de produccion completado).
- `npm run e2e:smoke`: **NO ejecutable en este entorno local** por restriccion de puertos (`EPERM 0.0.0.0:3000` al iniciar `next dev` desde Playwright webServer).
  - Ultima evidencia funcional reportada en entorno de desarrollo del equipo: **14/14 smoke tests aprobados** (27 de febrero de 2026).

## 5) Riesgos / pendientes reales (max 10)
1. E2E smoke no se puede revalidar en este entorno de ejecucion por restriccion de red local (puerto 3000).
2. La cobertura E2E es smoke (14 casos base), no regression amplia de UX completa.
3. El nuevo flujo UX de descarga aprobada con reintento tiene cobertura unitaria de mensajes, pero no E2E dedicado de punta a punta.
4. Existen scripts de provision/reset para test que aun escriben perfiles para fixtures; no afectan runtime, pero deben tratarse como tooling privilegiado.
5. Notificaciones por correo dependen de configuracion ENV (`RESEND_*`) y su estado operativo final debe validarse en entorno destino.
6. Faltan pruebas de carga/concurrencia bajo volumen real de usuarios.
7. El sistema es single-tenant; no hay aislamiento multi-tenant a nivel modelo de datos.
8. Falta consolidar evidencia manual final de acceptance en un solo cierre operativo (capturas/acta).

## 6) Roadmap breve

### Fase 1: Estabilizacion (corto plazo)
- Cerrar validacion e2e smoke en entorno con red habilitada (sin restriccion de puerto).
- Ejecutar checklist manual por rol y consolidar evidencia final.
- Verificar operacion de notificaciones email en entorno objetivo.
- Cerrar pendientes operativos de entrega (runbook/acceptance).

### Fase 2: Productizacion (siguiente etapa)
- Ampliar cobertura automatizada (e2e funcional completo por rol y flujos criticos).
- Endurecer observabilidad operativa (metrica/alertas de fallos en acciones criticas).
- Preparar lineamientos de escalado y eventualmente estrategia multi-tenant.
- Formalizar baseline de versionado y release gates (QA + seguridad + performance).
