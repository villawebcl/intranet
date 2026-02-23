# Handoff Pendiente (Post-cierre funcional Fase 1)

## Objetivo

Cerrar la entrega formal del MVP (Fase 1) despues del merge funcional, sin mezclarlo con desarrollo de nuevas features.

Este bloque es operativo/documental/cliente.

## Que es el handoff en este proyecto

Handoff = traspaso formal del sistema desde desarrollo a entrega/operacion del cliente.

Incluye:

- dejar datos finales de entrega registrados
- entregar accesos de forma segura
- validar entorno final (migraciones, backup/export, correo si aplica)
- completar manual/capturas
- agendar capacitacion
- registrar aceptacion formal

## Estado de partida (2026-02-23)

- Desarrollo funcional MVP: completado (fase funcional cerrada)
- Documentacion tecnica/closeout: lista
- Pendiente: cierre operativo + acceptance final con cliente

Referencias:

- `docs/closeout-status-fase1.md`
- `docs/delivery-checklist.md`
- `docs/ACCEPTANCE_CHECKLIST.md`
- `docs/manual-usuario-mvp.md`

## Checklist ejecutable (orden recomendado)

### 1) Preparar datos de entrega

- [ ] Confirmar URL final de produccion (o dejar staging oficial si aplica)
- [ ] Confirmar responsable cliente (aprobador)
- [ ] Confirmar canal seguro para credenciales (`email` u otro)
- [ ] Registrar fecha tentativa/real de entrega

Actualizar:

- `docs/delivery-checklist.md` (Datos de entrega)
- `docs/ACCEPTANCE_CHECKLIST.md` (Registro de aceptacion)

### 2) Cerrar tecnico de entorno (entrega)

- [ ] Registrar migraciones aplicadas en entorno (`000003`, `000004`)
- [ ] Ejecutar/registrar backup-export inicial DB (o marcar `n/a` por acuerdo)
- [ ] Confirmar storage privado / reglas de acceso en entorno
- [ ] Definir estado final de correo:
  - [ ] `activo` (si se configuran `RESEND_*` y destinatarios)
  - [ ] `n/a` (si se entrega solo panel interno de notificaciones)
- [ ] Si correo = `activo`, documentar prueba real (carga/aprobacion/rechazo)

Actualizar:

- `docs/delivery-checklist.md`
- `docs/ACCEPTANCE_CHECKLIST.md` (bloque D/H segun corresponda)

### 3) Credenciales y accesos (sin secretos en repo)

- [ ] Definir usuarios de prueba por rol (identificadores)
- [ ] Entregar credencial `admin` por canal seguro
- [ ] Entregar credenciales de prueba por rol por canal seguro
- [ ] Registrar fecha/canal/acuse (sin passwords)
- [ ] Acordar resguardo/rotacion de credenciales

Actualizar:

- `docs/delivery-checklist.md`
- `docs/ACCEPTANCE_CHECKLIST.md` (usuarios de prueba / canal seguro)

### 4) Manual final y capacitacion

- [ ] Completar `docs/manual-usuario-mvp.md` con capturas reales
- [ ] Exportar a PDF si se requiere entrega formal en PDF
- [ ] Agendar/registrar capacitacion remota (2h)
- [ ] Registrar ventana de observaciones (5 dias habiles)
- [ ] Definir canal de soporte/incidencias

Actualizar:

- `docs/manual-usuario-mvp.md`
- `docs/delivery-checklist.md`
- `docs/ACCEPTANCE_CHECKLIST.md`

### 5) Acceptance formal

- [ ] Revisar checklist de acceptance con evidencia
- [ ] Marcar items obligatorios restantes como `OK`
- [ ] Registrar fecha de entrega final
- [ ] Registrar aprobacion formal (email/acta/firma)

Actualizar:

- `docs/ACCEPTANCE_CHECKLIST.md`
- `docs/delivery-checklist.md` (`Estado final`)

## Criterio de termino de handoff

Se considera handoff cerrado cuando:

- `docs/ACCEPTANCE_CHECKLIST.md` queda sin pendientes criticos de entrega
- `docs/delivery-checklist.md` queda en estado final `COMPLETADO` (o equivalente)
- credenciales fueron entregadas por canal seguro (sin secretos en repo)
- aceptacion formal del cliente registrada

## Prompt sugerido para retomar en otra sesion

Usar este prompt (copiar/pegar):

```txt
Continuemos con el handoff/acceptance final del proyecto Intranet Anagami (Fase 1).

Contexto:
- La etapa funcional del MVP ya fue cerrada y mergeada.
- Queda pendiente solo el cierre operativo/documental/cliente.

Quiero que trabajes sobre estos archivos como fuente de verdad:
- docs/handoff-next-session.md
- docs/closeout-status-fase1.md
- docs/delivery-checklist.md
- docs/ACCEPTANCE_CHECKLIST.md
- docs/manual-usuario-mvp.md

Objetivo de esta sesion:
1. Completar/ordenar datos de handoff disponibles.
2. Dejar checklist ejecutable de lo pendiente con responsables claros.
3. Actualizar documentacion de cierre.
4. Preparar texto final de entrega al cliente (si alcanza).

Importante:
- No pongas secretos en el repo.
- Si falta un dato del cliente, dejalo como pendiente explicito con fecha y responsable.
- Separa claramente lo tecnico de lo operativo/cliente.
```

