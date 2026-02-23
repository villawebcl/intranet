# Delivery Checklist

## Objetivo de este archivo

Preparar el cierre de entrega del MVP sin depender del chat, aunque falten capturas o datos finales.

## Estado (2026-02-23)

- Estructura de cierre operativa actualizada post-PR `#3` (smoke E2E mergeado en `main`).
- Evidencia QA manual base adjuntada y documentada.
- Pendientes de acceptance/entrega clasificados por tipo (tecnico, operativo, externo/cliente) con responsable y estado.
- Bloqueo principal actual: datos de handoff y coordinacion con cliente aun no registrados (URLs finales, credenciales por canal seguro, backup/export, capacitacion).

## Referencias

- `docs/ACCEPTANCE_CHECKLIST.md`
- `docs/manual-qa-evidence.md`
- `docs/RUNBOOK.md`

## Datos de entrega (completar)

- Fecha estimada de entrega: `PENDIENTE`
- Fecha real de entrega: `PENDIENTE`
- URL staging: `PENDIENTE`
- URL produccion: `PENDIENTE`
- Responsable tecnico (proveedor): `PENDIENTE`
- Responsable operativo (proveedor): `PENDIENTE`
- Responsable cliente (aprobacion): `PENDIENTE`
- Canal seguro para credenciales (ej. email corporativo/WhatsApp/gestor): `PENDIENTE`

## Pendientes de cierre (clasificados)

Estado sugerido: `pendiente`, `en curso`, `completado`, `bloqueado`, `n/a`.

### 1) Tecnico

| Item | Estado | Responsable | Dependencia | Nota / evidencia esperada |
|---|---|---|---|---|
| Confirmar politica final de trabajador `inactivo` (alcance de restriccion) | pendiente | Producto + Tech Lead | Cliente | Impacta acceptance B y criterio operativo |
| Confirmar politica final de tamano PDF (mantener 5MB o ajustar) | pendiente | Producto + Tech Lead | Cliente | Impacta acceptance C y mensajes UX |
| Registrar estado de migraciones en entorno de entrega (aplicadas/pendientes) | pendiente | Dev/Infra | Acceso a entorno | Dejar fecha + responsable en este documento |
| Ejecutar y registrar backup/export inicial DB (si aplica por acuerdo) | pendiente | Dev/Infra | Acceso a entorno + acuerdo cliente | Guardar referencia de archivo/ubicacion segura, no adjuntar dump al repo |
| Confirmar Storage privado/reglas de acceso en entorno de entrega | pendiente | Dev/Infra | Acceso a entorno | Completa acceptance F (evidencia tecnica) |
| Configurar y probar notificaciones por correo (`RESEND_*`) si entran en alcance | pendiente | Dev/Infra | Credenciales + destinatarios | Marcar `n/a` si MVP se entrega sin correo activo |

### 2) Operativo

| Item | Estado | Responsable | Dependencia | Nota / evidencia esperada |
|---|---|---|---|---|
| Definir y registrar usuarios de prueba por rol (sin secretos en repo) | pendiente | Operaciones + Tech | Cliente (si valida naming) | Registrar solo identificadores y canal seguro |
| Entregar credenciales `admin` por canal seguro | pendiente | Operaciones/PM | Responsable cliente disponible | Registrar fecha/canal/acuse |
| Entregar credenciales de prueba por rol por canal seguro | pendiente | Operaciones/PM | Responsable cliente disponible | Registrar fecha/canal/acuse |
| Acordar metodo de resguardo/rotacion de credenciales | pendiente | Operaciones + Cliente | Cliente | No almacenar secretos en repo |
| Registrar URL(s) de entorno definitivas en checklist de acceptance | pendiente | Operaciones + Tech | Infra/hosting | Completa seccion "Registro de aceptacion" |
| Preparar manual con capturas para cliente (version de entrega) | pendiente | Operaciones/QA | Datos/URLs finales | Plantilla y evidencia base ya existen |
| Registrar canal de soporte/incidencias y ventana de observaciones (5 dias habiles) | pendiente | PM/Operaciones | Cliente | Dejar canal + fechas exactas |
| Agendar o registrar capacitacion remota (2h) | pendiente | PM/Operaciones | Agenda cliente | Dejar fecha, asistentes y estado |

### 3) Externo / cliente

| Item | Estado | Responsable | Dependencia | Nota / evidencia esperada |
|---|---|---|---|---|
| Confirmar responsables cliente (tecnico/operativo/aprobador) | pendiente | Cliente | Cliente | Completar "Datos de entrega" |
| Confirmar destinatarios de email por area/unidad (si aplica) | pendiente | Cliente | Cliente | Impacta configuracion de notificaciones |
| Confirmar si requiere repo compartido y usuarios con acceso | pendiente | Cliente + PM | Cliente | Marcar `n/a` si no aplica |
| Confirmar hosting/URL final de staging y/o produccion | pendiente | Cliente + Infra | Cliente/hosting | Completa acceptance H |
| Recibir aprobacion formal (email/acta/firma) | pendiente | Cliente | Cierre acceptance | Completa "Registro de aceptacion" |

## Credenciales y accesos (canal seguro)

- [ ] Credencial `admin` entregada por canal seguro
- [ ] Credenciales de prueba por rol definidas/registradas
- [ ] Metodo de resguardo de credenciales acordado (no repo)
- [ ] Fecha/canal/acuse de entrega registrados en este documento (sin secretos)
- Observaciones:

## Repositorio y documentacion

- [ ] Repo compartido al cliente (si aplica)
- [x] `README.md` actualizado con instalacion / ENV
- [x] `docs/ACCEPTANCE_CHECKLIST.md` actualizado
- [x] `docs/manual-qa-evidence.md` actualizado con capturas/rutas
- [x] `docs/permissions-matrix.md` revisado
- [ ] `docs/ACCEPTANCE_CHECKLIST.md` completado con datos finales de entrega (URLs/usuarios/aceptacion)

## Base de datos / operacion

- [ ] Backup/export inicial DB realizado (si aplica)
- [ ] Migraciones aplicadas y registradas
- [ ] Politica de tamano PDF confirmada (5MB o cambio)
- [ ] Politica de trabajador inactivo confirmada
- [ ] Evidencia tecnica de seguridad (RLS/Storage/backend/proxy) registrada para acceptance

## Notificaciones / correo

- [ ] `RESEND_API_KEY` configurada (si aplica)
- [ ] `NOTIFICATIONS_FROM_EMAIL` configurada (si aplica)
- [ ] Destinatarios por rol/area definidos
- [ ] Prueba de correo documentada (si aplica)
- [ ] Estado final marcado (`activo` / `n/a`) en este checklist

## Capacitacion y soporte

- [ ] Capacitacion remota (2h) realizada o agendada
- [ ] Ventana de observaciones (5 dias habiles) comunicada
- [ ] Canal para soporte/incidencias definido
- [ ] Responsable cliente para seguimiento post-entrega confirmado

## Propuesta minima de cierre (checklist ejecutable)

### Checklist

- [ ] Completar responsables y canal seguro en "Datos de entrega"
- [ ] Definir politicas pendientes (trabajador inactivo + tamano PDF)
- [ ] Registrar URL(s) definitivas de entorno
- [ ] Entregar credenciales por canal seguro y registrar acuse (sin secretos)
- [ ] Ejecutar/registrar backup-export inicial (o marcar `n/a` por acuerdo)
- [ ] Confirmar estado de notificaciones correo (`activo` o `n/a`)
- [ ] Agendar/realizar capacitacion y registrar ventana de observaciones
- [ ] Completar "Registro de aceptacion" en `docs/ACCEPTANCE_CHECKLIST.md`
- [ ] Recibir aprobacion formal del cliente (email/acta)

### Proximos pasos (orden sugerido)

1. Operaciones/PM: completar responsables cliente + canal seguro + fecha tentativa de entrega.
2. Tech/Infra: registrar URLs, migraciones y backup/export (o justificar `n/a`).
3. Cliente + PM: confirmar destinatarios y politicas pendientes (inactivo, tamano PDF).
4. Operaciones: enviar credenciales y manual final; registrar acuse.
5. Cliente: realizar acceptance final y dejar evidencia formal.

## Cierre

- Estado final: `PENDIENTE`
- Bloqueadores:
  - Datos de entrega (URLs, responsables, canal seguro) no confirmados
  - Credenciales y backup/export no registrados
  - Capacitacion/ventana de observaciones sin agenda cerrada
  - Aceptacion formal cliente pendiente
- Proximos pasos: completar pendientes clasificados de este documento, cerrar `docs/ACCEPTANCE_CHECKLIST.md` y coordinar handoff
