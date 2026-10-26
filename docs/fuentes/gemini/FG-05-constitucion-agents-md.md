# FG-05 — Constitución AGENTS.md y sincronización del grafo SoC v0.9

| Campo | Valor |
|---|---|
| Origen | Criterios del usuario trabajados con Gemini, pegados en una conversación con Claude el 2026-10-26 |
| T1 | Borrador de `AGENTS.md` pegado como texto en el chat; termina dentro de la sección 6 (`agent loop`), paso 5 |
| T2 | Instrucciones de sincronización, adjuntas como archivo de texto |
| SHA-256 de T2 | `5a5ebedc6bb6e59d5f6482e372b373d825ddc30d86606df899c39bcf0a93c889` |
| Fidelidad | Texto completo, salvo el corte de T1 |
| Rol | Base de `AGENTS.md` 1.0.0, de `docs/agentes/` y de los cambios del kernel 1.7.0, el grafo v0.9 y el modelo de carga v0.6 |

Etiquetas de estado: las mismas de [FG-01](FG-01-arquitectura-grafos-operacionales.md). Las decisiones del usuario del 2026-10-26 se tomaron en la misma conversación, después de contrastar el insumo con el repositorio.

---

## T1 · Borrador de AGENTS.md

### Gobierno y modelos

| Afirmación | Estado |
|---|---|
| Dos planos que no se mezclan: ingeniería (Claude Code, harness Actor-Crítico) y producción (P7, P8, P13) | `[VIGENTE]` (AGENTS.md §1) |
| Enrutamiento en cuatro niveles: Opus o Sonnet para ingeniería, Haiku 5.5 para P7, Sonnet 5.5 más juez Haiku y verificador en código para P8, cero modelos en P13 | `[VIGENTE]`; coincide con ADR-0002, que no admite modelos superiores en producción |
| P7: 1,5 llamadas al modelo por turno y p95 < 6 s (T03) | `[VIGENTE]` (kernel, ADR-0002) |
| P13: lectura < 10 ms en D4, cero tokens, μ = 200 eventos/s | `[VIGENTE]` desde el kernel 1.7.0: aprobado por el usuario el 2026-10-26; μ se registra como 100 por réplica con las 2 réplicas del worker |
| `rule_01` como `IF policy_check == FALSE THEN ABORT_TRANSACTION (Ω₀ = 0)` | `[CORREGIDO]`: el kernel 1.1.1 reemplazó Ω₀ global por Ω(u, m, t) por transacción |
| `rule_02`: `L_m = pendientes/15 ≥ 0,90` (T10), amortiguación Θ_s y desvío a marcas ≥ 4,0 "en la misma galaxia" | Θ_s `[VIGENTE]` (kernel 1.1.1). Desvío `[VIGENTE]` desde 1.7.0 con P13, `[CORREGIDO]` a "mismo nicho y galaxia". En el MVP no hay alternas: una marca por nicho |
| `rule_03` con actor, agente, versión del contrato, modelo y turno | `[VIGENTE]` (ADR-0002) |

### Reglas de ingeniería

| Afirmación | Estado |
|---|---|
| `INV_06` prohíbe a `contracts`, `ports` y `domain` importar `pg`, `fastify`, `grammy`, `ioredis`, `three`, relojes no inyectados o `apps/*` | `[ABIERTO]`: el kernel cubre `domain` y `ports` frente a Fastify, `pg`, grammY y SDK externos; la extensión queda como S1 (PEN-16) |
| Segregación física: `Master DB` (Pool B) para escribir y `Slave DB` (Pool A) para leer | `[CORREGIDO]`: ADR-0001 aprobó una sola base. El usuario decidió el 2026-10-26 los dos puertos sobre la misma `D1` (`INV_07`); la réplica sigue como palanca |
| `INV_05` nombra "la API de Telegram (`X4`)" | `[INCORRECTO]`: Telegram es `X1`; `X4` es identidad (Facebook y Google) |
| `PostgreSQL 16` en el registro de eventos | `[SUPERADO]`: PostgreSQL 17 desde el kernel 1.2.0 (ADR-0001) |
| Protocolo de doble salida | `[VIGENTE]` (AGENTS.md §6) |
| Verificación con `npm run verify:kernel`, `verify:hexagon`, `verify:contracts`, `verify:3d-budgets`, `test:integral` y `node calcular.mjs --estricto` | `[CORREGIDO]`: la ruta real es `tools/modelo-de-carga/calcular.mjs`; los scripts `verify:*` no existen porque aún no hay paquetes. Definición de terminado por fase (AGENTS.md §5) |
| Leer el kernel en `continuity/POPAYAN_PLANETARIO_KERNEL_V1.1.json` y los ADR-0001 a ADR-0004 | `[INCORRECTO]`: la única ruta es `arquitectura/kernel-durable.json`; ADR-0004 no existía (hoy existe en propuesta) |

### Agentes de producción

| Afirmación | Estado |
|---|---|
| P7 pondera reputación en cuatro dimensiones, fricción zonal, fidelidad y velocidad en Telegram; una marca por pedido; se detiene en `interrupt()` | `[VIGENTE]`; el orden lo da P3 con Π y el agente lo explica (p7-agente-usuario.md §4) |
| Cuatro modalidades en el borrador, incluida `SERVICIO_CON_CITA` | `[CORREGIDO]`: tres modalidades de compra; los servicios van por WhatsApp directo con la marca (`E61`) |
| Herramientas `consultarVectorDecisionYCatalogo`, `gestionarMiUniverso`, `prepararBorradorPedido` y `generarPropuestaLandingMarca` | `[CORREGIDO]`: ADR-0002 exige una herramienta por caso de uso; se dividen con identificadores propuestos |
| Clave de idempotencia de conversación, turno y llamada a la herramienta | `[VIGENTE]` (ADR-0002) |
| P8: manual → propuesta → vista previa → validaciones → aprobación → publicación | `[CORREGIDO]` al orden de `flujo_landing` de ADR-0002: el guardián va antes de la vista previa y el verificador antes de la aprobación |
| Arranque de P7 con el resumen de Π | `[CORREGIDO]`: ADR-0002 fija el perfil (intereses, comuna, favoritos recientes, pedidos abiertos); Π llega con la búsqueda |
| P8 sin datos de otras marcas, pagos ni evaluaciones | `[VIGENTE]` (`R05`, ADR-0002) |

### Memoria y bucle

| Afirmación | Estado |
|---|---|
| `PostgresSaver` en el esquema `agentes`, 24 h (P7) y 30 días o publicación (P8); Upstash no sirve como guardado por no tener RediSearch | `[VIGENTE]` (ADR-0002) |
| Eventos `ORDER_DRAFT_CREATED`, `PAYMENT_AUTOMATICALLY_VERIFIED`, `ORDER_ACCEPTED_BY_BRAND` y `ORDER_COMPLETED` en D3 | `[CORREGIDO]`: los borradores no entran a D3 (`INV_01`, van a D4); los estados y eventos son los de ADR-0003 (`PagoConfirmado`) |
| Posición al `COMMIT` y UUIDv7 | `[VIGENTE]` (`INV_01`, `INV_02`) |
| `D1` como "proyecciones CQRS" | `[INCORRECTO]`: `D1` es la base transaccional; las proyecciones son tablas en ella. η y C₁₅ siguen en propuesta (PEN-10) |
| Candado por conversación, hidratación sin conexión abierta, enrutador con salida estructurada, pausa con `interrupt()` y reanudación con `Command({ resume })` | `[VIGENTE]` (ADR-0002); el segundo mensaje espera su turno |
| La API "emite el cobro y escribe en D3 bajo `pg_advisory_xact_lock`" en un solo paso | `[CORREGIDO]`: `emitirCobro` corre sin conexión abierta (`INV_05`), entre dos transacciones cortas |

## T2 · Instrucciones de sincronización

| Afirmación | Estado |
|---|---|
| Kernel actual `1.5.0-DURABLE-KERNEL`, a actualizar a `1.6.0` | `[INCORRECTO]`: el kernel ya estaba en `1.6.1`; la nueva versión es `1.7.0` |
| Grafo `v0.9-SoC` | `[CORREGIDO]`: el esquema exige versión `n.n`; queda `0.9`, y "SoC" se registra en `cambios_0_9` |
| P13 lee "`P12` (saturación `L_m(t)`)" | `[CORREGIDO]`: `P12` es Telemetría; la carga `L_m` sale de los eventos de pedidos (`T10`) |
| Cerrar PEN-08 con Θ_s y el desvío | `[CORREGIDO]`: no cubre marcas sin calificación. El usuario decidió el 2026-10-26 dejarlo abierto con ADR-0004 en propuesta |
| P13 en el worker con ρ < 0,70 verificado por `calcular.mjs --estricto` | `[VIGENTE]`: ρ = 0,24 en el pico de 10.000 sesiones |
| Lazo de P12 hacia el gobierno (G1 a G4) y métricas T24 a T26 | `[VIGENTE]`: aristas E70 a E73 y métricas definidas en el grafo v0.9 |
| Quitar la ruta `continuity/`, PostgreSQL 17, documentar los scripts por fase, crear los seis documentos de `docs/agentes/` | `[VIGENTE]` |

## Qué se conserva de FG-05

La estructura de AGENTS.md, el protocolo de doble salida, el enrutamiento por niveles, P13 y el lazo de retroalimentación. Las correcciones quedan aplicadas en AGENTS.md 1.0.0 y en el kernel 1.7.0; los supuestos sin decidir, en PEN-16.
