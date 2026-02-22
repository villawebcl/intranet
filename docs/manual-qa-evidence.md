# Manual QA Evidence

## Objetivo de este archivo

Consolidar evidencia de pruebas manuales del MVP (capturas/video) sin depender del chat.

## Estado (2026-02-22)

- QA manual por rol y auditoria: validado manualmente (reportado OK).
- Pendiente: adjuntar capturas/video y completar referencias a archivos.
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
  - Archivo: `PENDIENTE_IMG`
  - Nota: OK manual reportado.
- Caso permitido: subir/aprobar/rechazar documento
  - Archivo: `PENDIENTE_IMG`
  - Nota: OK manual reportado.
- Caso permitido: ver `/dashboard/audit`
  - Archivo: `PENDIENTE_IMG`
  - Nota: OK manual reportado.

### RRHH

- Caso permitido: crear/editar trabajador
  - Archivo: `PENDIENTE_IMG`
  - Nota: OK manual reportado.
- Caso permitido: subir/revisar documento
  - Archivo: `PENDIENTE_IMG`
  - Nota: OK manual reportado.
- Caso bloqueado: acceso a `/dashboard/audit`
  - Archivo: `PENDIENTE_IMG`
  - Nota: Bloqueo validado manualmente.

### Contabilidad

- Caso permitido: ver/descargar documento
  - Archivo: `PENDIENTE_IMG`
  - Nota: OK manual reportado.
- Caso bloqueado: acceso a `/documents/new`
  - Archivo: `PENDIENTE_IMG`
  - Nota: Bloqueo validado manualmente.
- Caso bloqueado: aprobar/rechazar documento
  - Archivo: `PENDIENTE_IMG`
  - Nota: Bloqueo validado manualmente.

### Visitante

- Caso permitido: login + acceso dashboard
  - Archivo: `PENDIENTE_IMG`
  - Nota: OK manual reportado.
- Caso bloqueado: acceso a modulo documental
  - Archivo: `PENDIENTE_IMG`
  - Nota: Bloqueo validado manualmente.
- Caso bloqueado: crear/editar trabajador
  - Archivo: `PENDIENTE_IMG`
  - Nota: Bloqueo validado manualmente.

## Evidencia de auditoria

- `auth_login` visible en `/dashboard/audit`
  - Archivo: `PENDIENTE_IMG`
  - Nota: OK manual reportado.
- `auth_logout` manual (`metadata.reason = manual`)
  - Archivo: `PENDIENTE_IMG`
  - Nota: OK manual reportado.
- `auth_logout` timeout (`metadata.reason = timeout`)
  - Archivo: `PENDIENTE_IMG`
  - Nota: OK manual reportado.
- Eventos `document_*` visibles
  - Archivo: `PENDIENTE_IMG`
  - Nota: OK manual reportado.

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

- Fecha de consolidacion de evidencia: `PENDIENTE`
- Responsable: `PENDIENTE`
- Observaciones: Se puede cerrar documentalmente sin adjuntar imagenes en este momento; completar luego.
