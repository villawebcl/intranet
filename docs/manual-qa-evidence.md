# Manual QA Evidence

## Objetivo de este archivo

Consolidar evidencia de pruebas manuales del MVP (capturas/video) sin depender del chat.

## Estado (2026-02-22)

- QA manual por rol y auditoria: validado manualmente (reportado OK).
- Capturas base cargadas en `evidence/manual-qa/`.
- Pendiente: completar evidencia complementaria (si se requiere) y observaciones finales.
- Modo actual de registro: placeholders listos para completar sin bloquear cierre documental.

## Referencias cruzadas

- Checklist de acceptance: `docs/ACCEPTANCE_CHECKLIST.md`
- Matriz de permisos: `docs/permissions-matrix.md`
- Cierre de entrega: `docs/delivery-checklist.md`

## Convencion sugerida para archivos de evidencia

- Carpeta local sugerida (fuera o dentro del repo, segun decidan): `evidence/manual-qa/`
- Formato de nombre:
  - `YYYYMMDD-rol-caso.png`
  - Ejemplo: `20260222-admin-document-upload-allowed.png`

## Evidencia por rol (permisos)

### Admin

- Caso permitido: crear/editar trabajador
  - Archivo: `evidence/manual-qa/20260222-admin-workers-create-allowed.png`
  - Nota: Caso permitido validado.
- Caso permitido: subir/aprobar/rechazar documento
  - Archivo: `PENDIENTE_IMG` (opcional adicional)
  - Nota: Flujo validado manualmente; falta captura especifica si se quiere evidencia de esta accion.
- Caso permitido: ver `/dashboard/audit`
  - Archivo: `evidence/manual-qa/20260222-admin-audit-events-visible.png`
  - Nota: Auditoria visible para admin.

### RRHH

- Caso permitido: crear/editar trabajador
  - Archivo: `PENDIENTE_IMG` (opcional adicional)
  - Nota: Validado manualmente; no se adjunto captura especifica de workers RRHH.
- Caso permitido: subir/revisar documento
  - Archivo: `evidence/manual-qa/20260222-rrhh-documents-review-allowed.png`
  - Nota: Caso permitido validado.
- Caso bloqueado: acceso a `/dashboard/audit`
  - Archivo: `evidence/manual-qa/20260222-rrhh-audit-access-blocked.png`
  - Nota: Bloqueo validado.

### Contabilidad

- Caso permitido: ver/descargar documento
  - Archivo: `evidence/manual-qa/20260222-contabilidad-documents-list-allowed.png`
  - Nota: Lectura documental validada.
- Caso bloqueado: acceso a `/documents/new`
  - Archivo: `evidence/manual-qa/20260222-contabilidad-documents-new-blocked.png`
  - Nota: Bloqueo validado.
- Caso bloqueado: aprobar/rechazar documento
  - Archivo: `PENDIENTE_IMG` (opcional adicional)
  - Nota: Validado manualmente; no se adjunto captura especifica de intento de revision.

### Visitante

- Caso permitido: login + acceso dashboard
  - Archivo: `evidence/manual-qa/20260222-visitante-dashboard-login-allowed.png`
  - Nota: Login y acceso dashboard validado.
- Caso bloqueado: acceso a modulo documental
  - Archivo: `evidence/manual-qa/20260222-visitante-documents-access-blocked.png`
  - Nota: Bloqueo documental validado.
- Caso bloqueado: crear/editar trabajador
  - Archivo: `PENDIENTE_IMG` (opcional adicional)
  - Nota: Validado manualmente; no se adjunto captura especifica de workers.

## Evidencia de auditoria

- `auth_login` visible en `/dashboard/audit`
  - Archivo: `evidence/manual-qa/20260222-admin-audit-auth-login.png`
  - Nota: Evento `auth_login` visible.
- `auth_logout` manual (`metadata.reason = manual`)
  - Archivo: `PENDIENTE_IMG` (opcional adicional)
  - Nota: Validado manualmente; no se adjunto captura especifica de logout manual.
- `auth_logout` timeout (`metadata.reason = timeout`)
  - Archivo: `evidence/manual-qa/20260222-admin-audit-auth-logout-timeout.png`
  - Nota: Evento `auth_logout` por timeout visible.
- Eventos `document_*` visibles
  - Archivo: `evidence/manual-qa/20260222-admin-audit-events-visible.png`
  - Nota: Se observan eventos documentales en auditoria.

## Evidencia de acceptance complementaria (opcional)

- Responsive mobile
  - Archivo: `PENDIENTE_IMG`
  - Nota:
- Notificaciones / panel de notificaciones
  - Archivo: `PENDIENTE_IMG`
  - Nota:
- Validacion PDF > 5MB / tipo no PDF
  - Archivo: `PENDIENTE_IMG`
  - Nota:

## Cierre

- Fecha de consolidacion de evidencia: `2026-02-22`
- Responsable: `PENDIENTE`
- Observaciones: Se adjunto set minimo de capturas por rol/auditoria. Algunos casos quedaron marcados como opcionales adicionales.
