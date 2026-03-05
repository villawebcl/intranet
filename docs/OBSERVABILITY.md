# OBSERVABILITY

## Objetivo

Definir baseline operacional para detectar y depurar incidentes en produccion.

## Correlation ID

- Header estandar: `x-request-id`.
- Se inyecta en `proxy.ts` si no viene desde el edge/load balancer.
- Debe propagarse en responses y logs estructurados.

## Logging estructurado

Campos minimos por evento:

- `level`
- `event`
- `requestId`
- `ts` (ISO8601)
- `actorUserId` (si aplica)
- `actorRole` (si aplica)
- `entityType` / `entityId` (si aplica)

Eventos clave instrumentados:

- `auth_login_success`
- `auth_login_failed`
- `auth_login_rate_limited`
- `audit_write_failed`
- `email_sent`
- `email_send_failed`

## SLI recomendados

- `http_request_latency_p95` por ruta (objetivo inicial < 600ms en rutas de dashboard)
- `http_5xx_rate` (objetivo inicial < 1%)
- `auth_login_failure_rate`
- `audit_write_failed_rate` (debe tender a 0)
- `email_send_failed_rate`

## Alertas minimas

1. `audit_write_failed_rate > 0` por 5 minutos.
2. `http_5xx_rate > 3%` por 10 minutos.
3. `auth_login_rate_limited` anomalo por IP/prefijo.
4. `email_send_failed_rate > 10%` por 15 minutos.

## Runbook rapido de incidente

1. Buscar `requestId` en logs del edge/app.
2. Correlacionar acciones con `audit_logs` y `notifications`.
3. Verificar salud de Supabase (DB/Auth/Storage).
4. Revisar errores de RPC (`insert_audit_log`, `check_auth_rate_limit`).
5. Aplicar mitigacion y registrar postmortem.
