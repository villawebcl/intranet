# Manual QA Evidence

## Objetivo de este archivo

Consolidar evidencia de pruebas manuales del MVP (capturas/video) sin depender del chat.

## Estado (2026-02-22)

- QA manual por rol y auditoria: validado manualmente (reportado OK).
- Pendiente: adjuntar capturas/video y completar referencias a archivos.

## Convencion sugerida para archivos de evidencia

- Carpeta local sugerida (fuera o dentro del repo, segun decidan): `evidence/manual-qa/`
- Formato de nombre:
  - `YYYYMMDD-rol-caso.png`
  - Ejemplo: `20260222-admin-document-upload-allowed.png`

## Evidencia por rol (permisos)

### Admin

- Caso permitido: crear/editar trabajador
  - Archivo:
  - Nota:
- Caso permitido: subir/aprobar/rechazar documento
  - Archivo:
  - Nota:
- Caso permitido: ver `/dashboard/audit`
  - Archivo:
  - Nota:

### RRHH

- Caso permitido: crear/editar trabajador
  - Archivo:
  - Nota:
- Caso permitido: subir/revisar documento
  - Archivo:
  - Nota:
- Caso bloqueado: acceso a `/dashboard/audit`
  - Archivo:
  - Nota:

### Contabilidad

- Caso permitido: ver/descargar documento
  - Archivo:
  - Nota:
- Caso bloqueado: acceso a `/documents/new`
  - Archivo:
  - Nota:
- Caso bloqueado: aprobar/rechazar documento
  - Archivo:
  - Nota:

### Visitante

- Caso permitido: login + acceso dashboard
  - Archivo:
  - Nota:
- Caso bloqueado: acceso a modulo documental
  - Archivo:
  - Nota:
- Caso bloqueado: crear/editar trabajador
  - Archivo:
  - Nota:

## Evidencia de auditoria

- `auth_login` visible en `/dashboard/audit`
  - Archivo:
  - Nota:
- `auth_logout` manual (`metadata.reason = manual`)
  - Archivo:
  - Nota:
- `auth_logout` timeout (`metadata.reason = timeout`)
  - Archivo:
  - Nota:
- Eventos `document_*` visibles
  - Archivo:
  - Nota:

## Evidencia de acceptance complementaria (opcional)

- Responsive mobile
  - Archivo:
  - Nota:
- Notificaciones / panel de notificaciones
  - Archivo:
  - Nota:
- Validacion PDF > 5MB / tipo no PDF
  - Archivo:
  - Nota:

## Cierre

- Fecha de consolidacion de evidencia:
- Responsable:
- Observaciones:
