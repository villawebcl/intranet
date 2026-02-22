# ACCEPTANCE_CHECKLIST.md — Intranet Anagami (MVP Fase 1)

## Propósito

Checklist de validación para cierre del MVP.  
Se considera **aceptado** cuando TODOS los ítems “Obligatorio” están OK.

> Actualizacion (2026-02-22): items de Acceso/Roles y Auditoria se marcaron segun pruebas manuales recientes reportadas como correctas. La evidencia visual base ya fue adjuntada; faltan datos de entrega.
> Referencias: evidencia QA en `docs/manual-qa-evidence.md` y cierre operativo en `docs/delivery-checklist.md`.

---

## A) Acceso y roles (Obligatorio)

- [x] Login funcional (correo/RUT según implementación) + cierre de sesión
- [x] Sesión expira por inactividad (timeout)
- [x] Roles existentes: Admin / RRHH / Contabilidad / Visitante
- [x] Restricciones por rol verificadas (UI + backend/RLS)
- [x] Visitante no puede ver/descargar documentos fuera de lo permitido

**Evidencia**: usuario de prueba por rol + video corto o capturas.

---

## B) Gestión de trabajadores (Obligatorio)

- [ ] Crear trabajador
- [ ] Editar trabajador
- [ ] Listar trabajadores + búsqueda básica
- [ ] Activar/Desactivar trabajador (no elimina datos)
- [ ] Al entrar a un trabajador, se muestran las **12 carpetas fijas**
- [ ] Si trabajador está Inactivo: reglas claras (ej: no subir documentos o solo lectura, según decisión documentada)

**Evidencia**: casos de prueba manual en staging.

---

## C) Gestión documental PDF (Obligatorio)

- [ ] Subir documento (solo PDF)
- [ ] Límite de tamaño: max 5MB (bloqueo y mensaje claro)
- [ ] Documento queda asociado a:
  - [ ] trabajador
  - [ ] carpeta fija (enum, no texto libre)
  - [ ] metadatos mínimos (fecha, nombre, subido por)
- [ ] Estado inicial: Pendiente
- [ ] Cambiar estado: Pendiente → Aprobado / Rechazado
- [ ] Si Rechazado: motivo de rechazo (si aplica) queda guardado
- [ ] Descarga de PDF según permisos por rol

**Evidencia**: 3 documentos de prueba (uno aprobado, uno rechazado, uno pendiente).

---

## D) Notificaciones (Obligatorio)

- [ ] Email al cargar documento
- [ ] Email al aprobar documento
- [ ] Email al rechazar documento
- [ ] Panel / sección de notificaciones (admin o roles definidos)
- [ ] Registro interno (aunque sea simple) de notificaciones emitidas o eventos

**Evidencia**: correos recibidos en cuenta de prueba + capturas.

---

## E) Auditoría / Logs (Obligatorio)

- [x] Log de eventos críticos:
  - [x] login/logout (o al menos login)
  - [x] crear/editar trabajador
  - [x] activar/desactivar trabajador
  - [x] subir documento
  - [x] aprobar/rechazar documento
  - [x] descarga de documento (si es posible registrar)
- [x] Log incluye: usuario, rol, timestamp, acción, entidad afectada

**Evidencia**: tabla/pantalla de logs o consulta en DB mostrando registros.

---

## F) Seguridad (Obligatorio)

- [ ] RLS habilitado en tablas sensibles
- [ ] Storage con reglas coherentes (no público sin control)
- [ ] Validación en backend (no confiar solo en frontend)
- [ ] Protección de rutas del dashboard (no acceso anónimo)

**Evidencia**: intento real de acceso con rol incorrecto (debe fallar).

---

## G) Usabilidad y responsive (Obligatorio)

- [ ] Funciona en desktop y móvil (responsive)
- [ ] Mensajes de error claros
- [ ] Estados de carga (loading) en acciones críticas
- [ ] Accesibilidad mínima: labels en inputs, foco, navegación razonable

---

## H) Entrega (Obligatorio)

- [ ] Repo GitHub privado compartido con el cliente (si corresponde)
- [ ] README con pasos de instalación/despliegue y variables de entorno
- [ ] Credenciales Admin entregadas por canal seguro
- [ ] Backup inicial DB/export (según lo acordado)
- [ ] Manual PDF (o docs) con capturas
- [ ] Capacitación remota (2h) realizada o agendada
- [ ] Ventana de observaciones: 5 días hábiles (registrar issues)

---

## Registro de aceptación

- Fecha de entrega: `PENDIENTE`
- URL Staging / Producción: `PENDIENTE`
- Usuarios de prueba:
  - Admin: `PENDIENTE` (definir/registrar por canal seguro)
  - RRHH: `PENDIENTE`
  - Contabilidad: `PENDIENTE`
  - Visitante: `PENDIENTE`
- Aceptación cliente (firma / email / acta): `PENDIENTE`

## Estado documental (para cerrar sin imágenes temporalmente)

- QA manual reportado: OK
- Evidencia visual adjunta: si (set base en `evidence/manual-qa/` y referencias en `docs/manual-qa-evidence.md`)
- Checklist listo para completar: si
