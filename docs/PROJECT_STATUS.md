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
Fecha de corte: **5 de marzo de 2026**.

- `npm run lint`: **OK**.
- `npm run typecheck`: **OK**.
- `npm run test:unit`: **OK** (28 pruebas aprobadas).
- `npm run build:ci`: **OK** (build de produccion completado).
- `npm run e2e:smoke`: **OK** (14/14 pruebas aprobadas en entorno de desarrollo).
- Release candidate publicado: **`v0.1.0-rc1`**.

## 5) Riesgos / pendientes reales (max 10)
1. La cobertura E2E actual es smoke (14 casos base), no regression completa de todo el producto.
2. Notificaciones por correo dependen de configuracion ENV (`RESEND_*`) y validacion operativa en entorno destino.
3. Faltan pruebas de carga/concurrencia bajo volumen real de usuarios.
4. El sistema es single-tenant; no hay aislamiento multi-tenant a nivel modelo de datos.
5. Queda trabajo opcional de simplificacion modular en algunas pantallas grandes para mantenimiento a largo plazo.

## 6) Roadmap breve

### Fase 1: Estado actual
- MVP final operativo listo para piloto comercial.
- Calidad tecnica base en verde (`rc`).

### Fase 2: Productizacion (siguiente etapa sugerida)
- Ampliar cobertura automatizada (e2e funcional completo por rol y flujos criticos).
- Endurecer observabilidad operativa (metrica/alertas de fallos en acciones criticas).
- Preparar lineamientos de escalado y eventualmente estrategia multi-tenant.
- Formalizar baseline de versionado y release gates (QA + seguridad + performance).
