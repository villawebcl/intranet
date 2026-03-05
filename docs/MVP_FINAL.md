# MVP Final

## Estado

- Estado: **MVP final operativo**.
- Objetivo inmediato: piloto comercial y personalizacion por empresa cliente.
- Release candidate actual: `v0.1.0-rc1`.

## Alcance funcional final

- Login/logout con timeout.
- Control por roles (`admin`, `rrhh`, `contabilidad`, `trabajador`, `visitante`).
- Usuarios nucleo (admin).
- Trabajadores (alta/edicion/estado/archivado/desarchivado/eliminacion definitiva admin).
- Documentos PDF por trabajador (12 carpetas fijas, max 5MB).
- Revision documental (`pendiente -> aprobado/rechazado`).
- Descarga directa por roles autorizados.
- Solicitud de descarga para visitante (`pendiente -> aprobado/rechazado`).
- Notificaciones internas + email opcional.
- Auditoria de eventos criticos.

## Modelos de estado

### 1) Trabajador

- `status`: `activo` | `inactivo`
- `is_active`: `true` (vigente) | `false` (archivado)

Reglas:

- `admin` y `rrhh` pueden cambiar `status`.
- Solo `admin` puede archivar/desarchivar.
- Eliminacion definitiva solo `admin` y solo si esta archivado.

### 2) Documento

- `pendiente`: recien cargado, sin revision.
- `aprobado`: documento validado.
- `rechazado`: documento invalidado con motivo obligatorio.

Reglas:

- Carga inicial siempre en `pendiente`.
- Revision solo `admin`/`rrhh`.
- Carga bloqueada si trabajador esta `inactivo`.

### 3) Solicitud de descarga

- `pendiente`: esperando decision.
- `aprobado`: habilita enlace temporal.
- `rechazado`: no habilita descarga.

Reglas:

- `visitante` puede crear solicitud.
- `admin`/`rrhh` resuelven.
- Link aprobado expira en ventana corta.

### 4) Acceso portal trabajador

- `sin acceso`: sin cuenta vinculada.
- `activo`: cuenta habilitada.
- `suspendido`: cuenta baneada temporal/largo plazo (`banned_until`).

Reglas:

- Crear/suspender/reactivar por `admin`/`rrhh`.
- Al archivar trabajador, se intenta suspender su acceso.

### 5) Notificacion de email

- `pendiente`: `sent_at` nulo.
- `enviado`: `sent_at` con timestamp.

## Flujo operativo resumido (como se hace)

1. Crear trabajador.
2. (Opcional) Crear acceso de trabajador.
3. Subir documento PDF (queda `pendiente`).
4. Revisar documento (`aprobado` o `rechazado`).
5. Descargar directo (roles permitidos) o solicitar descarga (`visitante`).
6. Resolver solicitud de descarga (`admin`/`rrhh`).
7. Auditar eventos en panel de auditoria.

## Checklist de calidad (estado actual)

- `npm run lint`: OK
- `npm run typecheck`: OK
- `npm run test:unit`: OK
- `npm run e2e:smoke`: OK (14/14)

## Siguiente etapa (post-MVP)

- Ajustes funcionales por requerimiento de cada cliente.
- Mejoras UX por flujo real de uso.
- Cobertura E2E adicional por casos de negocio del cliente.
- Reforzar observabilidad/alertas en produccion segun SLA.
