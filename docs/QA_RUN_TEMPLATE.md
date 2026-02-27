# QA Run Template (Manual + E2E)

## Meta
Validar release en entorno objetivo y dejar evidencia minima para cierre.

## Contexto
- Fecha:
- Entorno: (staging / prod)
- URL:
- Commit/Tag:
- Ejecutado por:

## 1) Smoke E2E
Comando:
- `npm run e2e:smoke`

Resultado:
- Estado: (OK / FAIL)
- Resumen: (ej. 14 passed)
- Evidencia: (link screenshot/log)

Si falla:
- Caso(s):
- Error principal:
- Reproducible: (si/no)

## 2) Manual por Rol (resumen)
Referencia detallada:
- `docs/MANUAL_TESTS.md`

### Admin
- A1 Usuarios + cambio rol: (OK/FAIL) | evidencia:
- A2 Archivar/desarchivar trabajador: (OK/FAIL) | evidencia:
- A3 Eliminar definitivo archivado: (OK/FAIL) | evidencia:
- A4 Solicitud->aprobacion->descarga: (OK/FAIL) | evidencia:
- A5 Auditoria visible/coherente: (OK/FAIL) | evidencia:

### RRHH
- R1 Gestion trabajador: (OK/FAIL) | evidencia:
- R2 Aprobar doble intento (idempotencia): (OK/FAIL) | evidencia:
- R3 Crear acceso trabajador: (OK/FAIL) | evidencia:

### Contabilidad
- C1 Ver/descargar sin revisar: (OK/FAIL) | evidencia:
- C2 Subida solo Liquidaciones: (OK/FAIL) | evidencia:

### Visitante
- V1 Solicitar descarga: (OK/FAIL) | evidencia:
- V2 Descarga aprobada + expiracion + reintento: (OK/FAIL) | evidencia:

### Trabajador
- T1 Aislamiento worker (no acceso a otro): (OK/FAIL) | evidencia:
- T2 Acceso documentacion propia: (OK/FAIL) | evidencia:

## 3) Flujos Criticos
- F1 Solicitud->aprobacion->descarga: (OK/FAIL)
- F2 Doble click/carrera aprobacion: (OK/FAIL)
- F3 Soft delete workers: (OK/FAIL)
- F4 Cambio de rol efectivo tras re-login: (OK/FAIL)
- F5 Auditoria sin eventos inconsistentes: (OK/FAIL)

## 4) Hallazgos
| Severidad | Modulo | Descripcion | Repro pasos | Evidencia | Estado |
|---|---|---|---|---|---|
| Critico/Alto/Medio/Bajo |  |  |  |  | Open/Fixed |

## 5) Veredicto QA
- Resultado final: (GO / NO-GO)
- Riesgos abiertos:
1.
2.
3.

## 6) Aprobaciones
- QA Lead:
- Product:
- Tech Lead:
- Fecha cierre:
