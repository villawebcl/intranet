# Manual de Usuario (MVP) — Intranet Base

## Objetivo

Entregar una guia operativa simple para uso diario del MVP de gestion documental.

Este manual describe:

- acceso al sistema
- navegacion principal
- uso por modulo (trabajadores, documentos, notificaciones, auditoria)
- reglas operativas del MVP
- consideraciones por rol

## Alcance del manual

- Version: MVP Fase 1
- Entorno de referencia actual (staging): `https://intranet-lovat-delta.vercel.app`
- Estado: borrador operativo listo (pendiente completar capturas finales de entrega)

## Ingreso al sistema

### 1. Iniciar sesion

1. Abrir la URL de acceso (staging o produccion).
2. Ingresar `Correo` y `Contrasena`.
3. Presionar `Iniciar sesion`.
4. Si las credenciales son correctas, se redirige al `Dashboard`.

### 2. Cierre de sesion

1. En la esquina superior derecha, presionar `Cerrar sesion`.
2. El sistema redirige a `/login`.

### 3. Cierre por inactividad

- Si no hay actividad durante el tiempo configurado, la sesion se cierra automaticamente.
- En login se muestra el mensaje: `La sesion se cerro por inactividad.`

## Navegacion principal

La cabecera muestra:

- nombre de la intranet (`Intranet Base`)
- rol del usuario
- nombre/correo del usuario
- boton `Cerrar sesion`

Menu lateral / superior (segun dispositivo):

- `Inicio`
- `Acceso y roles`
- `Usuarios nucleo` (solo `admin`)
- `Trabajadores`
- `Notificaciones` (solo `admin`)
- `Auditoria` (solo `admin`)

## Roles (resumen operativo)

Referencia completa: `docs/permissions-matrix.md`.

- `admin`: gestion completa de usuarios, trabajadores y documentos, mas auditoria.
- `rrhh`: gestion de trabajadores y documentos, sin auditoria.
- `contabilidad`: lectura documental (ver/descargar) + carga solo en `Liquidaciones`, sin revisar.
- `visitante`: acceso autenticado limitado, visualizacion documental restringida + solicitud de descarga.
- `trabajador`: acceso de autoservicio a `Mi documentacion` (solo su `worker_id` asociado).

## Modulo: Usuarios nucleo (solo admin)

Ruta: `/dashboard/users`

### Que permite

- Crear usuarios de acceso (correo + contrasena inicial)
- Asignar rol (`admin`, `rrhh`, `contabilidad`, `visitante`)
- Editar nombre/rol de usuarios existentes
- Resetear contrasena de un usuario
- Vincular/ajustar perfiles del nucleo sin mezclar cuentas de `trabajador`

### Crear usuario

1. Ir a `Usuarios`.
2. Completar `Correo`, `Nombre completo` (opcional), `Rol` y `Contrasena inicial`.
3. Presionar `Crear usuario`.

### Editar rol o nombre

1. En la tabla/listado de usuarios, editar `Nombre` y/o `Rol`.
2. Presionar `Guardar` / `Guardar cambios`.

### Resetear contrasena

1. Ingresar `Nueva contrasena` en la fila del usuario.
2. Presionar `Resetear`.

Nota:

- El admin no puede quitarse a si mismo el rol `admin` desde esta pantalla (proteccion para no bloquear acceso).

## Modulo: Trabajadores

Ruta: `/dashboard/workers`

### Que permite

- Ver listado de trabajadores.
- Buscar por `RUT` o nombre.
- Abrir ficha del trabajador.
- Segun rol (`admin` / `rrhh`):
  - `Nuevo trabajador`
  - `Editar`
  - `Activar` / `Desactivar`
  - `Archivar` (soft delete)
- Segun rol (`admin`):
  - `Desarchivar`

### Buscar trabajador

1. Ir a `Trabajadores`.
2. En `Busqueda`, usar el campo `Buscar por RUT o nombre`.
3. Presionar `Buscar`.
4. Para volver al listado completo, usar `Limpiar`.

### Crear trabajador (`admin` / `rrhh`)

1. Presionar `Nuevo trabajador`.
2. Completar al menos:
   - `RUT`
   - `Nombre`
   - `Apellido`
3. Opcionalmente completar:
   - `Cargo`
   - `Area`
   - `Telefono`
   - `Correo`
4. Presionar `Guardar` (o boton de submit equivalente).

### Editar trabajador (`admin` / `rrhh`)

1. Desde el listado o la ficha, abrir `Editar` / `Editar datos`.
2. Actualizar campos.
3. Presionar `Guardar`.

### Activar / Desactivar trabajador (`admin` / `rrhh`)

1. Desde el listado o la ficha, presionar `Activar` o `Desactivar`.
2. El estado cambia sin eliminar datos ni documentos historicos.

### Archivar / Desarchivar trabajador

- `Archivar` oculta el registro por defecto (sin borrado fisico de DB).
- `Desarchivar` vuelve a dejar el registro como activo.
- En vistas con filtro de archivado puedes alternar:
  - `Solo activos`
  - `Solo archivados`
  - `Todos`

## Ficha del trabajador y carpetas

Ruta: `/dashboard/workers/:workerId`

La ficha muestra:

- datos basicos del trabajador (`RUT`, estado, area, cargo, correo)
- acciones disponibles segun rol
- resumen documental por carpetas

### Carpetas fijas (12)

- El MVP usa una estructura documental fija de 12 carpetas (labels de negocio definidos en sistema).
- La vista puede alternarse entre `Lista` y `Cuadricula` (por defecto `Lista`).

### Accesos desde la ficha

Segun rol, se pueden ver botones:

- `Editar datos`
- `Activar` / `Desactivar`
- `Subir documento`
- `Ver documentos`

Adicional para gestion interna (`admin`):

- estado de acceso al portal del trabajador (`Sin acceso`, `Activo`, `Suspendido`)
- creacion de acceso inicial
- suspension/reactivacion de acceso

## Modulo: Documentos del trabajador

Ruta: `/dashboard/workers/:workerId/documents`

### Que muestra

- listado de documentos del trabajador
- filtros por `Carpeta` y `Estado`
- acciones segun rol:
  - `Descargar`
  - `Aprobar`
  - `Rechazar` (con motivo)
  - `Subir PDF` (si el rol lo permite)

### Filtrar documentos

1. Ir a `Ver documentos`.
2. Usar filtros `Carpeta` y/o `Estado`.
3. Presionar `Aplicar`.
4. Usar `Limpiar` para quitar filtros.

### Paginacion de documentos

- El listado se muestra por paginas.
- Usa `Anterior` y `Siguiente` para navegar.
- La pagina actual conserva filtros activos (`Carpeta`, `Estado`).

### Subir documento PDF (`admin` / `rrhh` / `contabilidad` en `Liquidaciones`)

Ruta: `/dashboard/workers/:workerId/documents/new`

1. Presionar `Subir documento` o `Subir PDF`.
2. Seleccionar `Carpeta`.
3. Adjuntar `Archivo PDF`.
4. Presionar `Subir documento`.

Reglas del MVP:

- Solo se permiten archivos `PDF`.
- Tamano maximo: `5MB`.
- Estado inicial del documento: `pendiente`.
- `contabilidad` solo puede cargar en la carpeta `Liquidaciones`.

### Revision documental (`admin` / `rrhh`)

En el listado de documentos:

- `Aprobar`: cambia estado a `aprobado`.
- `Rechazar`: requiere ingresar `Motivo rechazo` y cambia estado a `rechazado`.

### Descarga documental

- Disponible segun rol (`admin`, `rrhh`, `contabilidad`).
- La descarga se realiza desde el boton `Descargar`.

### Solicitud de descarga (`visitante`)

En el listado de documentos, el rol `visitante`:

- puede visualizar documentos (metadata)
- no puede descargar directamente
- puede usar el boton `Solicitar descarga`

Al solicitar:

- se registra una notificacion interna para el equipo administrador/RRHH
- se registra auditoria de la solicitud
- cuando una solicitud es aprobada, aparece `Descargar aprobado (5 min)` para obtener un link temporal
- la URL firmada se genera server-side y expira en 5 minutos

## Regla MVP: trabajador inactivo

Politica vigente del MVP (registrada en `docs/decisions.md`):

- Si el trabajador esta `inactivo`, se bloquea la carga de nuevos documentos.
- La lectura y descarga de documentos siguen dependiendo del rol del usuario.
- Los documentos historicos no se eliminan al desactivar un trabajador.

## Modulo: Notificaciones

Ruta: `/dashboard/notifications`

### Uso

- Muestra eventos documentales recientes (carga, aprobacion, rechazo).
- Incluye solicitudes de descarga (`document_download_requested`) para revision del equipo autorizado.
- Incluye:
  - tipo de evento
  - fecha
  - destino (`user_id`)
  - resumen del payload
  - estado de email (`Enviado` / `No enviado`)
- navegacion por paginas (`Anterior` / `Siguiente`)

### Alcance por rol

- Visible para `admin` (panel administrativo).
- Otros roles no ven este modulo en el menu.

Nota:

- El envio de email depende de configuracion (`RESEND_*` y remitente).
- Aunque el email no este activo, el registro interno de notificaciones sigue funcionando.

## Modulo: Auditoria (solo admin)

Ruta: `/dashboard/audit`

### Que muestra

- eventos criticos del sistema (paginados)
- actor (usuario/rol)
- accion
- entidad afectada
- metadata resumida y detalle JSON

### Filtros

- `Accion` (ejemplo: `auth_login`, `document_uploaded`)
- `Entidad` (ejemplo: `auth`, `worker`, `document`)

Pasos:

1. Completar uno o ambos filtros.
2. Presionar `Aplicar`.
3. Usar `Limpiar` para volver a la vista general.

### Paginacion de auditoria

- Usa `Anterior` y `Siguiente` para recorrer resultados.
- Los filtros (`Accion`, `Entidad`) se conservan entre paginas.

## Mensajes y validaciones frecuentes

### Login

- Credenciales invalidas:
  - `No se pudo iniciar sesion. Revisa tus credenciales.`

### Documentos

- Archivo no PDF:
  - el sistema rechaza la carga.
- Archivo > 5MB:
  - se muestra error de limite.
- Trabajador inactivo:
  - la carga se bloquea y se muestra advertencia.
- Rechazo sin motivo:
  - el sistema exige `Motivo rechazo`.

### Permisos

- Si el rol no puede acceder a una vista/accion, el sistema redirige y muestra mensaje de permisos.

## Buenas practicas operativas

- Usar la busqueda por `RUT` para ubicar trabajadores rapidamente.
- Mantener `Motivo rechazo` claro y breve para facilitar correcciones.
- Revisar `Notificaciones` para seguimiento operativo diario.
- Revisar `Auditoria` (admin) ante dudas de trazabilidad o soporte.
- Cerrar sesion al terminar, especialmente en equipos compartidos.

## Checklist de uso diario (sugerido)

### RRHH / Admin

1. Entrar a `Inicio`.
2. Revisar pendientes/documentos recientes.
3. Ir a `Trabajadores` y abrir ficha del trabajador.
4. `Subir documento` o revisar `Documentos del trabajador`.
5. `Aprobar` / `Rechazar` con motivo.
6. Revisar `Notificaciones`.
7. Cerrar sesion.

### Contabilidad

1. Entrar a `Trabajadores`.
2. Buscar trabajador.
3. Abrir `Ver documentos`.
4. Opcional: usar `Subir liquidacion` para cargar PDF en carpeta `Liquidaciones`.
5. Filtrar por carpeta/estado si corresponde.
6. `Descargar` documentos necesarios.
7. Cerrar sesion.

### Visitante

1. Entrar a `Trabajadores` y abrir `Ver documentos` del trabajador.
2. Revisar listado/documento requerido (sin descarga directa).
3. Presionar `Solicitar descarga` en el documento correspondiente.
4. Esperar aprobacion del equipo administrador / RRHH.
5. Si se aprueba, usar `Descargar aprobado (5 min)` antes de expirar.
6. Cerrar sesion.

### Trabajador

1. Entrar con cuenta de rol `trabajador`.
2. Ir a `Mi documentacion`.
3. Revisar/filtrar documentos de su carpeta personal.
4. Descargar segun permisos de su flujo asignado.
5. Cerrar sesion.

### Admin (control)

1. Revisar `Auditoria`.
2. Filtrar por `Accion` / `Entidad` si hay incidente o seguimiento.
3. Confirmar eventos de login, cargas y revisiones.

## Capturas para completar (entrega final)

Se pueden reutilizar capturas en `evidence/manual-qa/` y completar las faltantes.

Capturas recomendadas:

- login (`/login`)
- dashboard (`/dashboard`)
- listado de trabajadores
- ficha de trabajador (carpetas en vista lista)
- listado de documentos (con filtros)
- subida de documento PDF
- rechazo con motivo
- notificaciones
- auditoria (admin)
- bloqueo por permisos (ejemplo: `rrhh` sin auditoria o `visitante` sin documentos)

Referencia de evidencia existente: `docs/manual-qa-evidence.md`.

## Soporte y observaciones (completar en handoff)

- Canal de soporte: `PENDIENTE`
- Responsable cliente: `PENDIENTE`
- Ventana de observaciones: `PENDIENTE`
- Fecha de entrega: `PENDIENTE`

## Historial

- 2026-02-23: borrador inicial del manual de usuario MVP (base operativa de entrega).
