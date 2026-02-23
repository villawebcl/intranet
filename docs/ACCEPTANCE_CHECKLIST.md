# ACCEPTANCE_CHECKLIST.md — Intranet Anagami (MVP Fase 1)

## Propósito

Checklist de validación para cierre del MVP.  
Se considera **aceptado** cuando TODOS los ítems “Obligatorio” están OK.

> Actualizacion (2026-02-23): se normaliza el estado post-PR `#3` (smoke E2E en `main`) y se separan pendientes de cierre en `docs/delivery-checklist.md` por tipo/responsable. La evidencia visual base ya fue adjuntada; faltan datos operativos y de cliente para acceptance final.
> Actualizacion (2026-02-23, cierre tecnico): se formalizan las politicas MVP de modulo documental (trabajador `inactivo` bloquea carga; PDF max `5MB`) y quedan registradas en `docs/decisions.md`.
> Referencias: evidencia QA en `docs/manual-qa-evidence.md`, cierre operativo en `docs/delivery-checklist.md` y estado de implementacion en `docs/closeout-status-fase1.md`.

---

## Estado de cierre (2026-02-23)

- Estado general acceptance MVP: `PENDIENTE` (bloqueado por datos/coord. de entrega, no por ausencia total de funcionalidad base).
- Bloque con mayor avance confirmado: `A) Acceso y roles` + `E) Auditoria / Logs`.
- Bloques con trabajo documental/evidencia pendiente: `B`, `C`, `D`, `F`, `G`, `H`.

## Pendientes de acceptance (resumen clasificado)

- Tecnico:
  - Registrar evidencia tecnica de seguridad en entorno de entrega (RLS/Storage/backend/proxy).
  - Registrar backup/export inicial y estado de migraciones (si aplica).
- Operativo:
  - Definir/entregar credenciales por canal seguro (sin secretos en repo).
  - Completar URLs de entorno y responsables de entrega.
  - Preparar manual final con capturas version entrega.
  - Agendar/registrar capacitacion y ventana de observaciones.
- Externo/cliente:
  - Confirmar responsables/aprobador.
  - Confirmar URLs/hosting y destinatarios de correo (si aplica).
  - Emitir aceptacion formal (email/acta/firma).

> Detalle con estado y responsable por item: `docs/delivery-checklist.md`.
> Estado funcional/tecnico consolidado del MVP: `docs/closeout-status-fase1.md`.

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

> Nota: funcionalidad base implementada; la regla de trabajador `inactivo` ya queda definida para MVP (bloqueo de carga, lectura/descarga segun rol). Aun faltan marcaciones de acceptance con evidencia en entorno de entrega.

- [ ] Crear trabajador
- [ ] Editar trabajador
- [ ] Listar trabajadores + búsqueda básica
- [ ] Activar/Desactivar trabajador (no elimina datos)
- [ ] Al entrar a un trabajador, se muestran las **12 carpetas fijas**
- [x] Si trabajador está Inactivo: reglas claras (MVP: no subir nuevos documentos; lectura/descarga según rol)

**Evidencia**: casos de prueba manual en staging.

---

## C) Gestión documental PDF (Obligatorio)

> Nota: flujo documental base existe y tiene cobertura smoke E2E parcial; la politica MVP de tamano queda fijada en `5MB`. Faltan evidencia de acceptance y cierre operativo.

- [ ] Subir documento (solo PDF)
- [x] Límite de tamaño: max 5MB (bloqueo y mensaje claro)
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

> Nota: el modulo y registro interno existen; configuracion/envios reales por correo dependen de configuracion `RESEND_*` y destinatarios confirmados.

- [ ] Email al cargar documento
- [ ] Email al aprobar documento
- [ ] Email al rechazar documento
- [x] Panel / sección de notificaciones (admin o roles definidos)
- [x] Registro interno (aunque sea simple) de notificaciones emitidas o eventos

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

- [x] RLS habilitado en tablas sensibles
- [x] Storage con reglas coherentes (no público sin control)
- [x] Validación en backend (no confiar solo en frontend)
- [x] Protección de rutas del dashboard (no acceso anónimo)

**Evidencia**: intento real de acceso con rol incorrecto (debe fallar).

---

## G) Usabilidad y responsive (Obligatorio)

- [ ] Funciona en desktop y móvil (responsive)
- [ ] Mensajes de error claros
- [ ] Estados de carga (loading) en acciones críticas
- [ ] Accesibilidad mínima: labels en inputs, foco, navegación razonable

---

## H) Entrega (Obligatorio)

> Nota: pendientes operativos/cliente detallados con responsable/estado en `docs/delivery-checklist.md`.
> Nota URL: `intranet@anagami.cl` es un correo; para produccion se debe registrar una URL (ej. `https://intranet.anagami.cl`).

- [ ] Repo GitHub privado compartido con el cliente (si corresponde)
- [x] README con pasos de instalación/despliegue y variables de entorno
- [ ] Credenciales Admin entregadas por canal seguro
- [ ] Backup inicial DB/export (según lo acordado)
- [ ] Manual PDF (o docs) con capturas (borrador base en `docs/manual-usuario-mvp.md`)
- [ ] Capacitación remota (2h) realizada o agendada
- [ ] Ventana de observaciones: 5 días hábiles (registrar issues)

---

## Registro de aceptación

- Fecha de entrega: `PENDIENTE` (estimada `2026-03-31`)
- URL Staging / Producción: `https://intranet-lovat-delta.vercel.app` / `PENDIENTE` (produccion sugerida: `https://intranet.anagami.cl`)
- Responsable tecnico (proveedor): `Cristian Villalobos`
- Responsable cliente (aprobacion): `PENDIENTE`
- Canal seguro de credenciales: `email`
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
- Pendientes clasificados (tecnico/operativo/externo) con responsable: si (`docs/delivery-checklist.md`)
