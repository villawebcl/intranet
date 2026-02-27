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
- `docs/closeout-status-fase1.md`
- `docs/manual-qa-evidence.md`
- `docs/manual-usuario-mvp.md`
- `docs/RUNBOOK.md`

## Datos de entrega (completar)

- Fecha estimada de entrega: `2026-03-31`
- Fecha real de entrega: `PENDIENTE`
- URL staging: `https://intranet-lovat-delta.vercel.app` (Vercel alias temporal; deploy 2026-02-23, `/login` responde HTTP 200)
- URL produccion: `PENDIENTE` (dominio/subdominio por comprar; formato sugerido: `https://intranet.empresa.cl`)
- Responsable tecnico (proveedor): `Cristian Villalobos`
- Responsable operativo (proveedor): `Cristian Villalobos`
- Responsable cliente (aprobacion): `PENDIENTE`
- Canal seguro para credenciales (ej. email corporativo/WhatsApp/gestor): `email`

## Pendientes de cierre (clasificados)

Estado sugerido: `pendiente`, `en curso`, `completado`, `bloqueado`, `n/a`.

### 1) Tecnico

| Item | Estado | Responsable | Dependencia | Nota / evidencia esperada |
|---|---|---|---|---|
| Confirmar politica final de trabajador `inactivo` (alcance de restriccion) | completado | Producto + Tech Lead | - | MVP fijado: bloquear nuevas cargas si trabajador esta inactivo; lectura/descarga segun rol. Registrado en `docs/decisions.md` (ADR-010) y aplicado en UI/backend |
| Confirmar politica final de tamano PDF (mantener 5MB o ajustar) | completado | Producto + Tech Lead | - | MVP fijado en 5MB + solo PDF; validacion UI/backend y registro en `docs/decisions.md` (ADR-011) |
| Registrar estado de migraciones en entorno de entrega (aplicadas/pendientes) | pendiente | Cristian Villalobos | Acceso a entorno | Dejar fecha + responsable en este documento |
| Ejecutar y registrar backup/export inicial DB (si aplica por acuerdo) | pendiente | Cristian Villalobos | Acceso a entorno + acuerdo cliente | Recomendado: ejecutar el dia de entrega antes de enviar credenciales; guardar referencia segura, no dump en repo |
| Confirmar Storage privado/reglas de acceso en entorno de entrega | en curso | Cristian Villalobos | Acceso a entorno | Repo/migraciones confirman bucket privado + policies; falta validacion en entorno |
| Configurar y probar notificaciones por correo (`RESEND_*`) si entran en alcance | pendiente | Cristian Villalobos | Credenciales + destinatarios | Recomendacion MVP: entregar con panel interno y marcar correo `n/a` hasta confirmacion cliente |

### 2) Operativo

| Item | Estado | Responsable | Dependencia | Nota / evidencia esperada |
|---|---|---|---|---|
| Definir y registrar usuarios de prueba por rol (sin secretos en repo) | pendiente | Cristian Villalobos | Cliente (si valida naming) | Registrar solo identificadores y canal seguro (`email`) |
| Entregar credenciales `admin` por canal seguro | pendiente | Cristian Villalobos | Responsable cliente disponible | Registrar fecha/canal/acuse |
| Entregar credenciales de prueba por rol por canal seguro | pendiente | Cristian Villalobos | Responsable cliente disponible | Registrar fecha/canal/acuse |
| Acordar metodo de resguardo/rotacion de credenciales | pendiente | Cristian Villalobos + Cliente | Cliente | No almacenar secretos en repo |
| Registrar URL(s) de entorno definitivas en checklist de acceptance | en curso | Cristian Villalobos | Infra/hosting | Staging Vercel registrado (`https://intranet-lovat-delta.vercel.app`); falta URL de produccion |
| Preparar manual con capturas para cliente (version de entrega) | en curso | Cristian Villalobos | Datos/URLs finales | Borrador base listo en `docs/manual-usuario-mvp.md`; faltan capturas finales y datos de handoff |
| Registrar canal de soporte/incidencias y ventana de observaciones (5 dias habiles) | en curso | Cristian Villalobos | Cliente | Propuesta: email oficial + WhatsApp solo coordinacion; ventana estimada `2026-03-31` a `2026-04-06` |
| Agendar o registrar capacitacion remota (2h) | pendiente | Cristian Villalobos | Agenda cliente | Recomendado: 1 sesion remota de hasta 2h |

### 3) Externo / cliente

| Item | Estado | Responsable | Dependencia | Nota / evidencia esperada |
|---|---|---|---|---|
| Confirmar responsables cliente (tecnico/operativo/aprobador) | pendiente | Cliente | Cliente | Completar "Datos de entrega" |
| Confirmar destinatarios de email por area/unidad (si aplica) | pendiente | Cliente | Cliente | Impacta configuracion de notificaciones |
| Confirmar si requiere repo compartido y usuarios con acceso | pendiente | Cliente + Cristian Villalobos | Cliente | Marcar `n/a` si no aplica |
| Confirmar hosting/URL final de staging y/o produccion | pendiente | Cliente + Infra | Cliente/hosting | Completa acceptance H |
| Recibir aprobacion formal (email/acta/firma) | pendiente | Cliente | Cierre acceptance | Completa "Registro de aceptacion" |

## Credenciales y accesos (canal seguro)

- [ ] Credencial `admin` entregada por canal seguro
- [ ] Credenciales de prueba por rol definidas/registradas
- [ ] Metodo de resguardo de credenciales acordado (no repo)
- [ ] Fecha/canal/acuse de entrega registrados en este documento (sin secretos)
- Observaciones:
  - Canal acordado inicialmente: `email`.
  - No registrar passwords/secretos en el repo; solo fecha, canal y acuse.
  - Staging actual (Vercel alias temporal): `https://intranet-lovat-delta.vercel.app`
  - URL de deployment (inmutable del redeploy exitoso): `https://intranet-nv59t9yaj-crislobos-projects.vercel.app`
  - Se cargaron ENV minimas en Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `APP_URL`, `INACTIVITY_TIMEOUT_MINUTES`) y se hizo redeploy para corregir `500` inicial.

## Repositorio y documentacion

- [ ] Repo compartido al cliente (si aplica)
- [x] `README.md` actualizado con instalacion / ENV
- [x] `docs/ACCEPTANCE_CHECKLIST.md` actualizado
- [x] `docs/manual-qa-evidence.md` actualizado con capturas/rutas
- [x] `docs/permissions-matrix.md` revisado
- [ ] `docs/ACCEPTANCE_CHECKLIST.md` completado con datos finales de entrega (URLs/usuarios/aceptacion)
- [x] URL de `staging` desplegada en Vercel y registrada en checklist (2026-02-23)

## Base de datos / operacion

- [ ] Backup/export inicial DB realizado (si aplica)
- [ ] Migraciones aplicadas y registradas
- [x] Politica de tamano PDF confirmada (MVP: 5MB)
- [x] Politica de trabajador inactivo confirmada (MVP: bloquea carga; lectura/descarga segun rol)
- [ ] Evidencia tecnica de seguridad (RLS/Storage/backend/proxy) registrada para acceptance

## Notificaciones / correo

- [ ] `RESEND_API_KEY` configurada (si aplica)
- [ ] `NOTIFICATIONS_FROM_EMAIL` configurada (si aplica)
- [ ] Destinatarios por rol/area definidos
- [ ] Prueba de correo documentada (si aplica)
- [ ] Estado final marcado (`activo` / `n/a`) en este checklist
- Recomendacion actual (MVP freelancer): `n/a` para correo externo en entrega inicial, manteniendo panel interno de notificaciones activo.

## Capacitacion y soporte

- [ ] Capacitacion remota (2h) realizada o agendada
- [ ] Ventana de observaciones (5 dias habiles) comunicada
- [ ] Canal para soporte/incidencias definido
- [ ] Responsable cliente para seguimiento post-entrega confirmado
- Propuesta operativa base:
  - Capacitacion: 1 sesion remota de hasta 2h (fecha por coordinar)
  - Soporte/incidencias: `email` (oficial), WhatsApp solo coordinacion
  - Ventana de observaciones estimada (si entrega `2026-03-31`): `2026-03-31` a `2026-04-06`

## Propuesta minima de cierre (checklist ejecutable)

### Checklist

- [ ] Completar responsables y canal seguro en "Datos de entrega"
- [ ] Validar con cliente si requiere override futuro de politicas MVP (tamano PDF / trabajador inactivo)
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
3. Cliente + PM: confirmar destinatarios de email por area/unidad y alcance de notificaciones (si aplica correo externo).
4. Operaciones: enviar credenciales y manual final; registrar acuse.
5. Cliente: realizar acceptance final y dejar evidencia formal.

## Cierre

- Estado final: `PENDIENTE`
- Bloqueadores:
  - Datos de entrega (URL de produccion y responsable cliente) no confirmados
  - Credenciales y backup/export no registrados
  - Capacitacion/ventana de observaciones sin agenda cerrada
  - Aceptacion formal cliente pendiente
- Proximos pasos: completar pendientes clasificados de este documento, cerrar `docs/ACCEPTANCE_CHECKLIST.md` y coordinar handoff
