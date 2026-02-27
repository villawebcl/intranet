# Progress

## Objetivo de este archivo

Registrar progreso por fecha para retomar trabajo rapidamente y saber que falta.

## Regla critica (memoria persistente)

- Leer este archivo antes de cambios importantes para entender el estado actual.
- Actualizar este archivo al cerrar cualquier bloque relevante de trabajo.

## Estado actual (2026-02-27)

- Seguridad de auditoria endurecida: insercion via RPC `SECURITY DEFINER` y bloqueo de insert directo no confiable.
- Seguridad de descargas endurecida: `visitante` sin lectura directa de `storage.objects`, flujo por `download_requests` + aprobacion + signed URL temporal.
- Workers en soft-delete operativo (`archivar` / `desarchivar`) sin borrado fisico.
- Separacion funcional consolidada:
  - `Usuarios nucleo`: admin/rrhh/contabilidad/visitante.
  - `Trabajadores`: gestion de personal y acceso al portal trabajador.
- Listados principales con paginacion real y filtros persistentes en URL:
  - users/workers/documents/notifications/audit.
- Se agregan indices DB para consultas frecuentes y filtros de paginacion (`20260227_000012_performance_indexes_pagination.sql`).
- Se incorpora comando unico de certificacion `npm run rc` (lint + typecheck + unit + build:ci + smoke).
- Se crea runbook de release en `docs/RELEASE.md` (freeze/tag, verificacion SQL post-deploy, bootstrap admin inicial).
- Se aplica pass de espaciado UI en pantallas densas (`workers`, `documents`, `users`, `audit`) con contenedor consistente reusable.
- Validaciones tecnicas recientes en verde:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:unit`

## Progreso diario

### 2026-02-27

#### Hecho

- Se corrige inconsistencia de borrado de workers implementando `soft delete` (archivado/desarchivado) con soporte de UI.
- Se agrega asignacion de `profiles.worker_id` desde UI admin y validaciones de unicidad.
- Se mueve el login a flujo server-side y se estabiliza registro de auditoria de autenticacion.
- Se refactoriza a capa de servicios (`lib/services/*`) y se dejan server actions mas delgadas.
- Se incorpora suite de tests unitarios para servicios criticos (`users`, `workers`, `documents`).
- Se fortalecen smoke tests e2e para login/permisos y flujos de descarga por solicitud.
- Se implementa paginacion real en:
  - `/dashboard/users`
  - `/dashboard/workers`
  - `/dashboard/workers/:workerId/documents`
  - `/dashboard/notifications`
  - `/dashboard/audit`
- Se agrega migracion `20260227_000012_performance_indexes_pagination.sql` con indices para workers/documents/download_requests/notifications/audit.
- Se actualiza documentacion operativa (`README`, `RUNBOOK`, manual de usuario) con paginacion y verificaciones post-deploy.
- Se agrega `rc` en `package.json` como comando unico de salida para release candidate.
- Se agrega `docs/RELEASE.md` como runbook minimo para congelar/taggear y verificar RLS/routines tras despliegue.
- Se alinea UX de espaciado global en modulos densos (`users`, `workers`, `documents`, `audit`) sin cambios de logica de negocio.

#### Falta / arrastrado

- Ejecutar smoke e2e completo en entorno conectado a Supabase antes de release final.
- Completar acceptance operativo/cliente (credenciales, responsables, backup inicial, capacitacion y aprobacion formal).

### 2026-02-23

#### Hecho

- Se crea rama `feature/acceptance-delivery-closeout` desde `main` limpio para cierre documental/operativo.
- Se revisa memoria persistente relevante:
  - `docs/tasks.md`
  - `docs/progress.md`
  - `docs/SESSION_CONTEXT.md`
  - `docs/ACCEPTANCE_CHECKLIST.md`
  - `docs/delivery-checklist.md`
- Se actualiza `docs/delivery-checklist.md` como documento operativo principal de handoff:
  - pendientes clasificados (`tecnico`, `operativo`, `externo/cliente`)
  - estado y responsable por item
  - propuesta minima de cierre con checklist ejecutable y orden sugerido
- Se normaliza `docs/ACCEPTANCE_CHECKLIST.md` con estado de cierre post-PR `#3`, resumen de pendientes clasificados y referencias operativas.
- Se marcan items de seguridad ya confirmados por contexto implementado:
  - RLS en tablas sensibles
  - validacion backend
  - proteccion de rutas del dashboard
- Se sincroniza memoria persistente (`tasks`, `progress`, `SESSION_CONTEXT`) con el estado actual y proximo bloque recomendado.
- Se aplica pulido UI/UX acotado en `/dashboard/notifications` (sin tocar logica):
  - resumen legible de payload + JSON colapsable
  - badge de estado de email (`Enviado` / `No enviado`)
  - truncado de IDs largos con `title`
  - vista responsive (cards en movil, tabla en escritorio)
- Se mejora navegacion global del dashboard:
  - sidebar en desktop + navegacion compacta en movil
  - logo `Intranet Base` clickeable hacia `/dashboard`
  - nueva vista `/dashboard/access` para resumen de acceso y roles (corrige acceso roto desde dashboard)
- Se aplica pulido UI/UX en `/dashboard/audit` (sin tocar logica):
  - resumen en lenguaje claro por evento (que paso, actor y contexto)
  - metadata resumida + JSON colapsable
  - badges de accion
  - truncado de IDs con `title`
  - vista responsive (cards en movil, tabla en escritorio)
- Se mejora UX de ficha de trabajador (`/dashboard/workers/[workerId]`):
  - resumen de 12 carpetas con selector de vista `Lista` / `Cuadricula`
  - vista por defecto cambiada a `Lista` para lectura operativa mas rapida
- Se despliega `staging` en Vercel y se registra URL temporal en checklists:
  - alias temporal: `https://intranet-lovat-delta.vercel.app`
  - deployment URL (redeploy exitoso): `https://intranet-nv59t9yaj-crislobos-projects.vercel.app`
- Se diagnostica y corrige `500` inicial en `staging`:
  - causa: faltaban ENV en Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
  - accion: carga de ENV minimas (`NEXT_PUBLIC_SUPABASE_*`, `APP_URL`, `INACTIVITY_TIMEOUT_MINUTES`) para `production` y `preview` + redeploy
  - verificacion: `GET /login` responde `HTTP 200`
- Validaciones del bloque UI:
  - `npm run lint` OK
  - `npm run typecheck` OK
  - `npm run build` con fallo por sandbox/Turbopack (permiso de puerto/proceso en entorno de ejecucion), no por error funcional del cambio
- Se unifica UX de feedback y estados de carga en pantallas clave (sin cambiar logica de negocio):
  - componentes reutilizables `AlertBanner`, `FlashMessages` y `FormSubmitButton`
  - `login` con error consistente y bloqueo de inputs durante submit
  - acciones criticas con pending label visible (`logout`, activar/desactivar worker, descargar/aprobar/rechazar documentos, subida de documento, guardar worker)
  - reemplazo de banners duplicados por `FlashMessages` en workers/detalle/documentos/notificaciones
- Validaciones del bloque feedback/loading:
  - `npm run lint` OK
  - `npm run typecheck` OK
- Se aplica microfase de consistencia visual y estados vacios en `workers` / `documents`:
  - headers tipo card con contadores de registros/documentos
  - estados vacios accionables (limpiar filtros / crear trabajador / subir PDF)
  - vista responsive con tarjetas en movil + tabla en escritorio para listados
  - labels de estado mas legibles (`Activo`, `Inactivo`, `Pendiente`, `Aprobado`, `Rechazado`)
- Componente nuevo reutilizable:
  - `components/ui/empty-state-card.tsx`
- Validaciones del bloque consistencia/empty states:
  - `npm run lint` OK
  - `npm run typecheck` OK
- Se rehace `/dashboard` como vista operativa por rol (ya no duplicado del sidebar):
  - metricas de trabajadores/documentos/notificaciones
  - cola de revision documental para `admin`/`rrhh`
  - actividad reciente (documentos, notificaciones y auditoria segun permisos)
  - acciones sugeridas contextuales
- Validaciones del bloque dashboard:
  - `npm run lint` OK
  - `npm run typecheck` OK
- Se centraliza la politica documental MVP en `lib/constants/documents.ts` para evitar divergencias:
  - tamano maximo PDF `5MB` (bytes + etiqueta UI)
  - `accept` de archivo PDF
  - regla de bloqueo de carga para trabajador `inactivo`
- Se actualiza modulo documental para usar constantes compartidas y mantener mensajes alineados (`upload` page + server action).
- Se mejora accesibilidad minima en revision documental:
  - inputs `Motivo rechazo` ahora tienen `label` explicito (móvil y escritorio) en `/dashboard/workers/[workerId]/documents`
- Se registran decisiones tecnicas en memoria:
  - ADR-010: trabajador `inactivo` bloquea carga; lectura/descarga segun rol
  - ADR-011: PDF maximo `5MB` para MVP
- Se sincronizan checklists (`acceptance` / `delivery`) y backlog (`tasks`) marcando cerradas las 2 decisiones tecnicas documentales.
- Se crea `docs/manual-usuario-mvp.md` como borrador operativo del manual de usuario para entrega:
  - acceso/login/logout/timeout
  - navegacion y roles
  - flujos de trabajadores/documentos/notificaciones/auditoria
  - reglas MVP (PDF max 5MB, bloqueo de carga para trabajador inactivo)
  - checklist de uso diario y lista de capturas pendientes para version final
- Se actualiza `docs/delivery-checklist.md` dejando el manual en estado `en curso` (borrador listo; faltan capturas y datos de handoff).
- Se alinean labels de las 12 carpetas del trabajador con el alcance funcional (nombres de negocio en vez de `Carpeta 01..12`).
- Se ajusta el panel de `Notificaciones` para uso administrativo:
  - visible en menu solo para `admin`
  - acceso a `/dashboard/notifications` restringido a `admin`
  - dashboard deja de mostrar widgets/accesos de notificaciones a roles no admin
  - resumen de payload muestra nombre de carpeta legible (no `folder_XX`)
- Se habilita excepcion de alcance para `contabilidad` en gestion documental:
  - puede cargar PDF solo en carpeta `Liquidaciones` (`folder_10`)
  - UI limita selector de carpeta y botones de subida a esa carpeta
  - backend valida carpeta permitida por rol
  - se agrega migracion RLS para `documents`, `storage` y `notifications` restringida a `folder_10`
  - smoke E2E de permisos actualizado para reflejar acceso acotado a `/documents/new`
- Se habilita flujo para `visitante` alineado al alcance:
  - visualizacion documental restringida (listado/metadata)
  - sin descarga directa (boton `Descargar` oculto/bloqueado por rol)
  - nuevo boton `Solicitar descarga` en listado documental
  - server action registra notificacion interna (`document_download_requested`) y auditoria
  - nueva migracion RLS/constraint para permitir lectura documental a `visitante` y nueva notificacion
- Se implementa modulo admin de gestion de usuarios (`/dashboard/users`):
  - listado de usuarios desde Supabase Auth + perfiles (`profiles`)
  - creacion de usuario (correo, contrasena inicial, rol, nombre)
  - edicion de nombre/rol
  - reset de contrasena
  - auditoria de acciones (`user_created`, `user_updated`, `user_password_reset`)
  - acceso visible solo para `admin` desde menu y quick action del dashboard
- Se corrige validacion de variables de entorno opcionales en server:
  - strings vacias en `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` y `NOTIFICATIONS_FROM_EMAIL` se normalizan a `undefined`
  - evita bloqueo del modulo `Usuarios` cuando `RESEND_*` no esta configurado aun
- Se simplifica `/dashboard/audit` para uso operativo:
  - columnas y celdas mas concisas (sin resumen narrativo ni `Ver JSON`)
  - metadata en chips clave/valor (wrap + truncado con `title`)
  - tabla solo en pantallas amplias; cards en tamaños intermedios para evitar compresion
- Se simplifica `/dashboard` (inicio) por solicitud de UX:
  - se elimina texto de resumen operativo redundante
  - menos metricas y menos items por bloque
  - orden de contenido con foco en operacion/actividad reciente
  - acciones rapidas mas acotadas
- Se consolida estado de implementacion y pendientes de cierre en `docs/closeout-status-fase1.md` (referencia tecnica para handoff).
- Validaciones finales del bloque (antes de cierre de rama):
  - `npm run lint` OK
  - `npm run typecheck` OK
- Se ejecuta ronda de pulido UI/UX transversal (sin cambios de logica de negocio):
  - login y shell del dashboard con estilo mas minimalista/corporativo
  - sidebar y header refinados (jerarquia visual y navegacion clara)
  - `Inicio` simplificado como resumen ejecutivo (sin botones duplicados del sidebar)
  - `Usuarios`, `Auditoria` y `Notificaciones` con tablas mas estables (sin desbordes)
  - `Notificaciones` reorganizada con resumen compacto + detalle en modal + filtros (evento/email)
  - `Acceso y roles` simplificada a matriz/politica de permisos (sin duplicar gestion de usuarios)
- Se incorpora sistema de tema visual con toggle global:
  - `modo claro`
  - `modo oscuro suave` con persistencia (`localStorage`) y transicion de cambio de tema
  - enfoque visual final en dark mode: `shell` oscuro (header/sidebar) + contenido claro para mejor legibilidad
- Validaciones del bloque visual/tema:
  - `npm run typecheck` OK

#### Falta / arrastrado

- Completar datos reales de entrega/cliente en checklists (URLs, responsables, fechas, canal seguro).
- Registrar entrega de credenciales por canal seguro (sin exponer secretos en repo).
- Registrar backup/export inicial y estado de migraciones del entorno de entrega.
- Confirmar destinatarios de email por area/unidad (si aplica) y estado final de notificaciones por correo (`activo`/`n/a`).
- Completar capturas finales del manual de usuario y datos de handoff en `docs/manual-usuario-mvp.md`.
- (Opcional documental) Completar `docs/closeout-status-fase1.md` con datos finales de entrega para usarlo como acta tecnica de cierre.
- Agendar/registrar capacitacion + ventana de observaciones y obtener aceptacion formal cliente.
- (Opcional UX) Revisión visual manual en `staging` del dashboard nuevo y de tarjetas móviles/tablas desktop en `workers` / `documents`.
- (Opcional UX) Calibrar paleta corporativa definitiva (accent/badges/estados) si se desea estandarizacion visual formal para entrega.

### 2026-02-20

#### Hecho

- Inicializacion del proyecto Next.js + TypeScript + Tailwind.
- Integracion base con Supabase (Auth/DB/Storage).
- Migracion inicial `20260220_000001_init_schema.sql`.
- Definicion de enums de dominio y tablas base (`profiles`, `workers`, `documents`, `notifications`, `audit_logs`).
- Documentacion inicial (`AI_CONTEXT`, `DECISIONS`, `RUNBOOK`, `ACCEPTANCE_CHECKLIST`).

#### Falta / arrastrado

- Cerrar matriz de permisos final por rol.
- Completar pruebas manuales de acceptance.

### 2026-02-21

#### Hecho

- Login en `/login` y proteccion de rutas privadas via `proxy.ts`.
- Dashboard protegido y logout.
- Timeout por inactividad en cliente.
- Modulo de trabajadores:
  - listado + busqueda
  - crear/editar
  - activar/desactivar
  - detalle con 12 carpetas fijas
- Modulo documental:
  - subida PDF (solo PDF, max 5MB)
  - bloqueo de carga para trabajador inactivo
  - listado/filtros
  - aprobacion/rechazo
  - rechazo con motivo obligatorio
  - descarga por URL firmada
- Notificaciones:
  - tabla `notifications`
  - panel `/dashboard/notifications`
  - envio email via Resend (opcional por ENV)
  - trazabilidad `sent_at`
- Auditoria:
  - eventos de workers/documentos
  - `auth_login`, `auth_logout` (manual/timeout)
  - panel `/dashboard/audit` (admin)
- Hardening de permisos por rol (UI + backend + RLS).
- Migracion de permisos `20260221_000002_permissions_hardening.sql`.

#### Falta / arrastrado

- Ejecutar y documentar QA manual por rol (admin/rrhh/contabilidad/visitante).
- Registrar evidencia visual y marcar checklist de acceptance.

### 2026-02-22

#### Hecho

- Implementacion de memoria persistente en `docs/` con estructura estandar:
  - `architecture.md`
  - `decisions.md`
  - `progress.md`
  - `tasks.md`
  - `system-overview.md`
- Consolidacion de contenido desde archivos legacy (`AI_CONTEXT`, `SESSION_CONTEXT`, `DECISIONS`, `ACCEPTANCE_CHECKLIST`).
- Se formaliza regla operativa: leer/actualizar docs de memoria antes/despues de cambios importantes.
- Validacion local del bloque documental:
  - `npm run lint` OK
  - `npm run typecheck` OK
  - `npm run build` OK
- Se crea rama `feature/manual-qa-evidence` para cierre de QA/acceptance.
- Usuario reporta pruebas manuales recientes OK para permisos por rol y flujo de auditoria (login/logout/documentos).
- Se agrega plantilla `docs/manual-qa-evidence.md` para consolidar capturas/video.
- Se documenta matriz de permisos en `docs/permissions-matrix.md` para QA y soporte.
- Se prepara `docs/delivery-checklist.md` para cerrar acceptance/entrega sin bloquear por falta temporal de imagenes.
- Se agrega `docs/pr-manual-qa-evidence.md` como plantilla de PR para copiar/pegar al abrir el cierre de QA.
- Se adjuntan capturas de QA manual en `evidence/manual-qa/` y se referencian en `docs/manual-qa-evidence.md`.
- Se abre y mergea PR `#2` para `feature/manual-qa-evidence`.
- Se corrige flujo de login para evitar recarga manual post-auth y asegurar registro de `auth_login` en auditoria.
- Se agrega base E2E con Playwright (`@playwright/test`) y configuracion `playwright.config.ts`.
- Se implementa `global setup` para crear/actualizar usuarios E2E por rol (`admin`, `rrhh`, `contabilidad`, `visitante`) en Supabase usando `SUPABASE_SERVICE_ROLE_KEY`.
- Se agrega fixture de trabajador smoke estable para rutas documentales y archivo runtime (`tests/e2e/.generated/smoke-fixtures.json`).
- Se agrega helper de login con reintento corto para estabilizar auth E2E en entorno dev.
- Se agrega smoke de logout manual (`tests/e2e/smoke-auth.spec.ts`) con asercion de redireccion a `/login`.
- Se agrega fixture documental E2E en `global setup` (PDF en storage + fila en `public.documents`).
- Se agrega smoke permitido de `contabilidad` en `/dashboard/workers/[workerId]/documents` (lectura + boton `Descargar` visible).
- Se agrega soporte E2E para timeout rapido con override client-side de `IdleSessionWatcher` (`window.__E2E_IDLE_TIMEOUT_MS__`) usado por Playwright.
- Se agrega smoke de timeout (redirect a `/login?reason=timeout`) y smoke de descarga real del fixture PDF (signed URL / respuesta PDF).
- Se agrega smoke de auditoria filtrada para `admin` (`auth_login` + `entity=auth`) validando resultados visibles.
- Se valida suite `npm run e2e:smoke` (OK, 10 tests):
  - login -> dashboard
  - logout manual -> `/login`
  - logout por timeout -> `/login?reason=timeout`
  - admin puede ver auditoria
  - admin puede filtrar auditoria y ver `auth_login`
  - rrhh no puede ver auditoria
  - contabilidad puede ver `/documents` (lectura)
  - contabilidad puede descargar fixture documental (PDF signed URL)
  - contabilidad no puede abrir `/documents/new`
  - visitante no puede acceder a `/documents`
- Se abre PR `#3` (`feature/permissions-e2e-smoke`), se documenta validacion local en comentario y se mergea en `main`.

#### Falta / arrastrado

- Mantener sincronizados los archivos legacy o definir fecha de deprecacion.
- Completar datos de acceptance/entrega (usuarios de prueba, URL, credenciales, backup, capacitacion).
- Definir/registrar credenciales de prueba por rol (pendiente documental y/o canal seguro).
- Revisar si se desea mantener el override E2E de timeout en `IdleSessionWatcher` (actualmente aislado a pruebas por `window.__E2E_IDLE_TIMEOUT_MS__`).

## Proximo bloque recomendado

1. Revisión manual rápida en `staging` del polish UX reciente (dashboard, sidebar, audit/notificaciones, workers/documents móvil+desktop).
2. Completar datos pendientes de handoff/cliente en `docs/delivery-checklist.md` y `docs/ACCEPTANCE_CHECKLIST.md`.
3. Registrar credenciales por canal seguro (sin secretos), URLs, backup/export y capacitacion.
4. Obtener aceptacion formal cliente y cerrar estado final del MVP.
