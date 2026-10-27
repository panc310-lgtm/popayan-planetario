# FG-06 — Atractor extraño en el grafo SoC y decisiones del propietario

| Campo | Valor |
|---|---|
| Origen | Gemini, `https://gemini.google.com/app/3d8b8a948021d279` ("Atractor Extraño en Grafo SoC") |
| Archivo recibido | `base_durable_3.1.pdf` (18 páginas, impreso con Microsoft Print to PDF el 2026-10-26 a las 19:47 -05) |
| SHA-256 | `7488b9ba13bc9c4c3a6342070a5557bafb5090855fad1bd4bfb15c789dd8b22a` |
| Fidelidad | PDF sin capa de texto; bloques de código cortados al ancho de la página |
| Decisiones | Mensaje del usuario del 2026-10-26 (D1), con su texto literal en [FG-06-texto-original.md](FG-06-texto-original.md) |
| Rol | Origen de las decisiones del 2026-10-26 sobre P13, ADR-0004 y la compuerta de capacidad, aplicadas en el kernel 1.7.0, el grafo v0.9 y el modelo de carga v0.6 |

Etiquetas de estado: las mismas de [FG-01](FG-01-arquitectura-grafos-operacionales.md).

**Numeración de aristas.** Gemini numeró las aristas del SoC v0.9 a su manera, y de dos formas distintas ([FG-07](FG-07-verificacion-acceso-repositorio.md), T7 y T8). La numeración del repositorio es otra: `E67` a `E76` se definieron en el grafo v0.9 de la rama. Cuando un texto de Gemini o del mensaje D1 cita una arista, abajo se indica cuál es en el repositorio.

---

## T1 · p. 1–3 · Metáfora del atractor extraño

| Afirmación | Estado |
|---|---|
| Sistema de vida con ejes X (demanda), Y (oferta) y Z (vínculo durable), y ecuaciones dX/dt, dY/dt y dZ/dt acopladas a S_Planetario | `[NO APLICA]`: metáfora; no entró al kernel |
| Bloque `L0_strange_attractor_life_system` para el kernel, con H_durable, η, C₁₅ y R₃₀ | `[ABIERTO]`: el usuario no lo pidió integrar; η y C₁₅ siguen en propuesta (PEN-10) |
| Gravedad orbital = 0,35 flujo + 0,35 compras + 0,30 evaluación | `[INCORRECTO]`: el kernel fija calificación 40, compras 30, flujo 20 y sedes 10 |
| Ala canónica "en PostgreSQL 16" | `[SUPERADO]`: PostgreSQL 17 desde el kernel 1.2.0 |
| Retroalimentación E67..E71 desde P12 | `[CORREGIDO]`: en el repositorio, E70 a E73 van de P12 a G1, G2, G3 y G4 |

## T2 · p. 3–6 · Capa de dominio y experiencia de compra con el agente

| Afirmación | Estado |
|---|---|
| Paquetes `contracts`, `ports` y `domain` sin E/S, y adaptadores en `apps/*` | `[VIGENTE]` (INV_06, AGENTS.md §4.1) |
| Bucle P5 → P13 → D4 → P7/P3, con señales previas, de ejecución y posteriores a la compra | `[VIGENTE]` en sustancia; P7 recibe Π a través de P3 (E31), no leyendo D4 (ADR-0002) |
| "P9 vía E73", "P10 vía E74" y "D4 vía E76" | `[CORREGIDO]`: en el repositorio P13 lee P9 y P10 en D1 por E69 y publica en D4 por E68 y E75 |
| Fórmula de Π con pesos w₁ a w₄ | `[ABIERTO]`: los pesos no están definidos; el orden lo aplica P3 |
| Compra en cinco fases con `interrupt()`, compuerta Ω y `emitirCobro` fuera de transacción | `[VIGENTE]` (ADR-0002, ADR-0003, plano-b-runtime.md) |
| Dos velocidades: ambiental en el 3D sin modelo (P1 y P3 leyendo D4) y conversacional con P7 | `[CORREGIDO]`: las dos velocidades están vigentes, pero P1 no lee D4: pide a P3 a través de P2 (E21, E25), y P3 lee Π en D4 (E65) |
| Pregunta final: confirmar "los 4 parámetros de ejecución del grafo SoC v0.9": P13 en el worker, inteligencia en dos velocidades vía D4, cierre de PEN-08 por exploración y amortiguación Θ_s(L_m), y sincronización de los 5 artefactos | `[VIGENTE]`: es una de las dos listas de "4 parámetros" que puede ratificar D1 (ver D1) |

## T3 · p. 6–8 · Patrón maestro y réplica

| Afirmación | Estado |
|---|---|
| "PostgreSQL 16 Primario" y réplica de lectura física | `[CORREGIDO]`: el usuario decidió el 2026-10-26 dos puertos sobre la misma base D1 (INV_07); la réplica es una palanca |
| Lecturas de consistencia fuerte en el primario (máquina de estados, pagos y puntos de control) | `[ABIERTO]` (S2 de AGENTS.md) |
| Caché D4 antes de la lectura | `[VIGENTE]` (INV_07) |
| Interfaces `MasterWriteDatabasePort` y `SlaveReadDatabasePort` en `packages/ports` | `[VIGENTE]` como nombres de puerto (INV_07); el código aún no existe |

## T4 · p. 8–9 · Calificación del nivel de arquitectura

| Afirmación | Estado |
|---|---|
| Madurez de 8,2 sobre 10 frente a plataformas como Stripe o Linear | `[NO VERIFICABLE]` |

## T5 · p. 9–12 · AGENTS.md en nueve dimensiones

| Afirmación | Estado |
|---|---|
| Nueve dimensiones: model, instructions, tools, context, memory, agent loop, guardrails, error handling y evals | `[ABIERTO]`: AGENTS.md 1.0.0 cubre las seis primeras como secciones; guardrails, error handling y evals están repartidas (§4.6, §7.3, §9, plano-b-runtime.md §5, p7-agente-usuario.md §6) y no tienen sección propia |
| `PG_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS` en 35.000 ms y `transaction-scope.ts` que bloquea `connect()` concurrentes | `[ABIERTO]`: diseño de la fase de código, no registrado |
| Alerta a operación comercial "G3 vía E68" | `[CORREGIDO]`: en el repositorio es E72 |
| Evals con "E67..E78" y `04-backend-integral-tests.yml` | `[NO APLICA]`: numeración de Gemini y un flujo de CI que no existe |

## T6 · p. 12–16 · Auditoría de AGENTS.md 1.0.0

| Afirmación | Estado |
|---|---|
| Primera respuesta en guaraní | `[NO APLICA]`: el usuario la rechazó y Gemini respondió de nuevo en español |
| Tres ajustes: PostgreSQL 17, ruta única del kernel y scripts de la Definición de terminado | `[VIGENTE]`: son el T2 de [FG-05](FG-05-constitucion-agents-md.md) |
| Kernel "1.5.0-DURABLE-KERNEL" en `main` | `[INCORRECTO]`: estaba en 1.6.1 |

## T7 · p. 16–18 · Hallazgos del ciclo 1 del crítico y recomendaciones

| Afirmación | Estado |
|---|---|
| Endurecer `--estricto` a ρ ≥ 0,70 | `[VIGENTE]`: decidido en D1 |
| Aprobar la regla de precedencia (S9) | `[ABIERTO]`: D1 no la incluye; sigue en PEN-16 |
| Aprobar ADR-0004 y cerrar PEN-08 | `[VIGENTE]`: decidido en D1 |
| Enmendar ADR-0002 para que la calificación pública llegue al agente (S10) | `[ABIERTO]`: D1 no la incluye; sigue en PEN-16 |
| Prompt de continuación (cortado en la página 18) | `[SUPERADO]` por D1 |

## D1 · Mensaje de decisiones del usuario (2026-10-26)

| Afirmación | Estado |
|---|---|
| "Ratifico los 4 parámetros de la arquitectura SoC v0.9" | `[ABIERTO]` en cuál lista: Gemini dio dos listas de cuatro puntos que coinciden en tres (P13 en el worker, PEN-08 por exploración y amortiguación, y los 5 artefactos) y difieren en el segundo: "inteligencia en dos velocidades vía D4" (T2) o "mantener las réplicas y la ponderación de P7 en el modelo de carga" ([FG-07](FG-07-verificacion-acceso-repositorio.md) T8). D1 no dice cuál. Las dos variantes se cumplen en la rama, así que la diferencia no cambia ningún archivo; se anota para no leer en D1 más de lo que dice |
| A.1 P13 lee de D1 el agregado de recompra que P10 mantiene por marca (`pedidos_recompra_90d`, `compradores_unicos_90d`), sin identificadores de compradores | `[VIGENTE]`: kernel `decision_vectors_p13`, P10, E69 y `lecturas_base_por_pedido_p13`. "Por E74" es numeración de Gemini (P10 → P13); en el repositorio es la lectura E69 |
| A.2 Π se publica solo en D4, no en D1 | `[VIGENTE]`: S13 sale de PEN-16. "Por la arista E75" es numeración de Gemini; en el repositorio Π va por E68 y E75 lleva la carga por marca |
| A.3 ADR-0004 aprobado y PEN-08 resuelto, con "desvío por saturación Θ_s(L_m) gobernado por G1 → P13" | `[VIGENTE]`: kernel `L1_new_brand_incentive`; G1 → P13 es la arista nueva E76 |
| A.4 `--estricto` falla con ρ ≥ 0,70 | `[VIGENTE]`: `calcular.mjs` |
| A.4 Presupuesto de conexiones de los tres pools en las 11 réplicas, con un total de a lo sumo 200 clientes del pooler | `[VIGENTE]`: el tope de 200 es decisión del usuario (PEN-14 (4)); los valores por pool, que suman 67 clientes, y las 20 conexiones reservadas para Supabase los propuso Claude (S16). El modelo encontró además que en modo sesión el pico necesita 87 conexiones directas, más que las 60 de Micro; esa diferencia con ADR-0001 queda en PEN-17, por decidir |
| B.1 Comandos de lectura de la carga viva en `comandos_redis_por_evento_p13` | `[VIGENTE]`: 3 por evento |
| B.2 P13 lee la carga viva con su marca de tiempo al emitir Π y nunca sugiere como alterna una marca con L_m ≥ 0,70 | `[VIGENTE]`: T25 y p13-motor-decision.md §3. Reemplaza el umbral de 0,90 que Claude había propuesto en S11. Excluir también una carga leída vieja (sin sus últimos eventos o con más de 5 s) es propuesta de Claude (S15) |
| B.3 "P3 y P7 ordenan leyendo Π desde D4" | `[CORREGIDO]`: P3 lee Π desde D4; P7 recibe ese orden por E31, porque los agentes no leen D4 directamente (ADR-0002) |
| B.4 Completar la fila de S11 en FG-05 y verificar las huellas SHA-256 | `[VIGENTE]`: la regla F3 del validador las comprueba en cada pull request |
| B.4 "Ajusta la referencia (S8) en el caso T2 de `pruebas.mjs`" | `[CORREGIDO]`: `pruebas.mjs` no tiene un caso T2; la referencia "(S8)" vive en FG-05. Se probó con el anexo A1 de FG-05-texto-original.md, y `pruebas.mjs` suma un caso F3 que altera una huella |
| C. Cinco verificaciones, ciclo 4 del crítico, pull request y fusión, y entrega en doble salida | `[VIGENTE]` |

## Qué se conserva de FG-06

Las decisiones de D1, aplicadas en esta rama. De la conversación quedan abiertas la regla de precedencia (S9), la calificación pública para el agente (S10), las secciones propias de guardrails, error handling y evals en AGENTS.md, y los pesos de Π.
