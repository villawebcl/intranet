# MANUAL_TESTS

## Objetivo
Checklist practico de pruebas manuales por rol para cerrar QA funcional del MVP.

## Precondiciones generales
1. Entorno accesible (staging o produccion controlada).
2. Usuarios disponibles por rol: `admin`, `rrhh`, `contabilidad`, `visitante`, `trabajador`.
3. Al menos 2 trabajadores de prueba:
   - `Trabajador A` con documentos en estados mixtos.
   - `Trabajador B` para validar aislamiento y permisos.
4. Al menos 1 solicitud de descarga `pendiente` y 1 `aprobada` para validar flujos.
5. Acceso admin al panel de auditoria.

## Checklist por rol

## Admin

### A1. Gestion de usuarios y cambio de rol
Pasos:
1. Iniciar sesion como admin.
2. Ir a `Acceso y roles` / `Usuarios nucleo`.
3. Crear usuario de prueba (rol `visitante`).
4. Editar ese usuario y cambiar rol a `rrhh`.
Resultado esperado:
- Usuario creado y editable sin error.
- Cambio de rol persistido.
- No permite eliminar cuentas `admin` protegidas.

### A2. Soft delete de trabajador (archivar/desarchivar)
Pasos:
1. Ir a `Trabajadores`.
2. En menu `...` de `Trabajador A`, presionar `Archivar`.
3. Verificar que pasa a estado archivado.
4. Ejecutar `Desarchivar`.
Resultado esperado:
- Archivado exitoso sin perdida de datos historicos.
- Desarchivado exitoso y trabajador vuelve a listado activo.
- Eventos auditables registrados.

### A3. Eliminacion definitiva de trabajador archivado
Pasos:
1. Archivar `Trabajador A`.
2. Ejecutar `Eliminar definitivo`.
Resultado esperado:
- Solo se permite eliminar si esta archivado.
- Confirmacion visible.
- Registro eliminado segun regla del sistema.

### A4. Flujo solicitud/aprobacion/descarga (admin revisor)
Pasos:
1. Como visitante, generar solicitud de descarga (ver V1).
2. Volver como admin y abrir documentos del trabajador.
3. Aprobar solicitud pendiente.
4. Usar `Generar link (5 min)` y descargar.
Resultado esperado:
- Solicitud pasa de `pendiente` a `aprobado` una sola vez.
- Se obtiene signed URL temporal.
- Si el enlace expira/no existe, UI muestra: `El enlace expiro, genera uno nuevo` y permite `Reintentar`.

### A5. Auditoria
Pasos:
1. Ir a `Auditoria`.
2. Filtrar por acciones recientes: `user_*`, `worker_*`, `document_*`, `document_download_request_*`.
Resultado esperado:
- Eventos visibles con actor/accion/fecha.
- No duplicacion de evento en doble aprobacion de solicitud.

## RRHH

### R1. Gestion de trabajador
Pasos:
1. Iniciar sesion como rrhh.
2. Crear `Trabajador RRHH`.
3. Editar datos y cambiar estado activo/inactivo.
Resultado esperado:
- Puede crear/editar/activar/desactivar.
- No puede eliminar definitivamente trabajadores.

### R2. Aprobar/rechazar solicitudes de descarga
Pasos:
1. Abrir documentos de trabajador con solicitud pendiente.
2. Aprobar una solicitud.
3. Intentar aprobarla de nuevo.
Resultado esperado:
- Primera aprobacion exitosa.
- Segunda accion falla con mensaje de ya procesada.
- Sin side-effects duplicados en auditoria.

### R3. Crear acceso de trabajador
Pasos:
1. Desde trabajador sin acceso, crear acceso intranet.
Resultado esperado:
- Acceso creado y vinculado correctamente al trabajador.
- Rol del perfil queda en `trabajador` via ruta controlada.

## Contabilidad

### C1. Permisos de documentos
Pasos:
1. Iniciar sesion como contabilidad.
2. Ir a documentos de un trabajador.
3. Intentar revisar (aprobar/rechazar) un documento.
Resultado esperado:
- Puede visualizar y descargar documentos permitidos.
- No puede aprobar/rechazar documentos.

### C2. Subida restringida por carpeta
Pasos:
1. Ir a subir documento.
2. Intentar carpeta distinta de `Liquidaciones`.
Resultado esperado:
- No puede cargar fuera de `Liquidaciones`.
- Puede cargar correctamente en `Liquidaciones`.

## Visitante

### V1. Solicitud de descarga
Pasos:
1. Iniciar sesion como visitante.
2. Ir a documentos del trabajador permitido.
3. En documento objetivo, ingresar motivo y `Solicitar descarga`.
Resultado esperado:
- Solicitud creada en estado `pendiente`.
- Feedback visual de solicitud enviada.
- No descarga directa si no hay aprobacion.

### V2. Descarga aprobada + expiracion
Pasos:
1. Con solicitud ya aprobada, usar `Descargar aprobado (5 min)`.
2. Simular reintento cuando enlace ya no sirve (esperar expiracion o invalidar solicitud).
Resultado esperado:
- Si URL valida, abre descarga.
- Si expirada/no encontrada, muestra `El enlace expiro, genera uno nuevo`.
- Boton `Reintentar` genera un nuevo intento sin salir del flujo.

## Trabajador

### T1. Aislamiento por trabajador asignado
Pasos:
1. Iniciar sesion como `trabajador` asociado a `Trabajador A`.
2. Intentar abrir URL de documentos de `Trabajador B` manualmente.
Resultado esperado:
- Acceso denegado/redireccionado.
- Solo puede ver su propia documentacion.

### T2. Acceso base a documentacion propia
Pasos:
1. Navegar a su modulo documental.
2. Ver listado y metadatos de sus documentos.
Resultado esperado:
- Puede consultar solo su alcance permitido por rol.
- Sin exposicion de datos de otros trabajadores.

## Flujos criticos transversales (validacion final)

### F1. Solicitud -> aprobacion -> descarga
Pasos:
1. Visitante solicita descarga.
2. Admin/RRHH aprueba.
3. Visitante descarga aprobado.
Resultado esperado:
- Flujo completo sin romper permisos.
- Trazabilidad en auditoria.

### F2. Doble click / carrera en aprobacion
Pasos:
1. Ejecutar dos veces seguidas `Aprobar solicitud` sobre la misma solicitud.
Resultado esperado:
- Solo una aprobacion efectiva.
- Segunda respuesta con mensaje de ya procesada.
- Sin duplicacion de auditoria/notificacion asociada.

### F3. Soft delete workers
Pasos:
1. Archivar trabajador.
2. Verificar acciones bloqueadas/permitidas.
3. Desarchivar o eliminar definitivo segun rol.
Resultado esperado:
- Comportamiento consistente con reglas de negocio.

### F4. Cambio de rol
Pasos:
1. Admin cambia rol de usuario.
2. Usuario vuelve a iniciar sesion.
Resultado esperado:
- Permisos efectivos corresponden al nuevo rol.

### F5. Auditoria
Pasos:
1. Ejecutar acciones de usuarios, trabajadores y documentos.
2. Revisar panel de auditoria.
Resultado esperado:
- Eventos visibles y coherentes con acciones reales.
- Sin eventos inventados desde usuario comun.

## Criterio de cierre QA manual
- Todos los casos criticos (F1-F5) en estado OK.
- Sin bloqueantes de seguridad/permisos.
- Evidencia (capturas o acta) registrada junto a fecha y entorno.
