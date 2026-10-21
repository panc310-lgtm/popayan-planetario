# FG-03 — Arquitectura y Límites de Ingeniería Agéntica

| Campo | Valor |
|---|---|
| Origen | Gemini, `https://gemini.google.com/app/ed5f0b0c36b9dc28` |
| Archivo recibido | `base durable 2.pdf` (26 páginas, impreso con Microsoft Print to PDF el 2026-10-20 19:44 -05) |
| SHA-256 | `94a8542e237fba2d1939f54742c4c533b6af0f0f56a175bfea4090fb7b766412` |
| Fidelidad | Sin capa de texto; los JSON `CANONICAL_STATE_V1`, `V1.2`, `V1.3` y `POPAYAN_PLANETARIO_STATE_V1.1` están cortados en el margen derecho |
| Rol | Estado del arte, límites de ejecución, registro de repositorios de referencia y primeras versiones del "JSON durable" |

Etiquetas de estado: las mismas de [FG-01](FG-01-arquitectura-grafos-operacionales.md).

## Mapa de turnos

| Turno | Páginas | Prompt del usuario (resumen) | ¿La respuesta contesta lo pedido? |
|---|---|---|---|
| T1 | 1–4 | Estructura funcional: apps similares, harness agéntico, hexagonal, comando de dominio; capacidad real y límites de ejecución | Sí |
| T2 | 4–6 | Estado del arte a partir de proyectos de esa envergadura (ej. Rappi) | En parte: no analiza Rappi |
| T3 | 6–9 | Idempotencia integral y estructura hexagonal para 1.000–10.000 usuarios; evaluar `wshobson/agents` | Sí |
| T4 | 9–12 | Evaluar `msitarzewski/agency-agents`; organizar el flujo y compactar en un JSON durable | Sí |
| T5 | 12 | ¿Tienes acceso a GitHub de mi cuenta panc310? | Sí ("No") |
| T6 | 12–14 | Solo el enlace `Solido/awesome-flutter` | **No**: entrega scripts de Blender |
| T7 | 14–16 | "Aún no vamos a ejecutar esa fase; analiza este repo…" (sin enlace) | **No**: regenera el inventario |
| T8 | 16 | El mismo, con el enlace | **No**: evalúa un fragmento de producción 3D |
| T9 | 17 | ¿Tienes acceso a mi PC en local? | **No**: desarrolla el Grafo 3 |
| T10 | 17–20 | Define desde dónde perdimos coherencia por cambio de modelo de IA | **No**: regenera inventario y ecuaciones |
| T11 | 20 | "Listo, perfecto… evalúa este repositorio" (sin enlace) | Respuesta vacía |
| T12 | 20–22 | El mismo, con el enlace | Sí: diagnostica el desvío y evalúa el repo |
| T13 | 22–23 | La maqueta será web; el objetivo de producto es app móvil | Sí |
| T14 | 23–26 | Cambios de producto: pago automático, Telegram, versión 1.1 sin congelar, `@crm-erika` solo aprendizaje | Sí |

---

## T1 · p. 1–4 — Estructura funcional y límites de ejecución

- Toma `@crm-erika` como "infraestructura real" y estado del arte: monorepo Node.js 24 + TypeScript 5.9 (`apps/api`, `apps/worker`, `apps/web`, `packages/contracts`), Fastify 5, PostgreSQL 16 con `crm_events` append-only, inbox/outbox con `FOR UPDATE SKIP LOCKED`, Ajv 8, ClamAV, Docker Compose + Caddy en VPS, Backblaze B2, Redis y MinIO. `[SUPERADO]` en T14: `@crm-erika` es solo referencia de aprendizaje.
- Describe el "harness" Actor-Crítico de `@crm-erika` (documentos rectores, 6 workflows de CI, revisor independiente, telemetría JSON). `[NO APLICA]` a este repo: nada de eso existe aquí.
- Comando de dominio agéntico con 4 leyes: subordinación a `N0_ORG_CORE`, idempotencia (UUIDv7 + `appendCanonicalEvent`), transacción atómica con candados, trazabilidad (`rule_03`). `[VIGENTE]` como principio (kernel INV_02).
- Afirma "80 % del riesgo técnico ya mitigado" y puntajes 29→83/100. `[NO VERIFICABLE]` para este producto: son medidas de otro sistema.
- Seis límites:
  1. Techo de ~800 eventos/s y umbral de 500. `[NO VERIFICABLE]`: medida de `@crm-erika`; kernel lo marca "por medir" (PEN-09).
  2. `brand_load < 0.90` por marca. `[CORREGIDO]` como Θ suave.
  3. Timeouts y pools separados (5.000 / 15.000 / 5.000 / 10.000 ms). `[ABIERTO]`: valores de otro sistema.
  4. Prohibido guardar binarios en `BYTEA`; activos en almacenamiento de objetos. `[VIGENTE]` como regla; proveedor `[ABIERTO]`.
  5. IA fuera de transacciones SQL, semáforo y `AbortSignal.timeout`. `[VIGENTE]` (kernel INV_05).
  6. Tres compuertas: maqueta, cierre de reglas antes del 30-nov, pruebas 1–10 dic. Fechas `[SUPERADO]` por baseline v1.1 (29-nov).

## T2 · p. 4–6 — Estado del arte

- Cuatro referentes: plataformas multimarca, "OpenAI, Stripe, Supabase, Linear, Notion e Instagram" sobre **PostgreSQL 16**, patrón Actor-Crítico y motores 3D (100,000 Stars, NASA Eyes, Google Maps `WebGLOverlayView` + Three.js).
  - "Todas sobre PostgreSQL 16" `[INCORRECTO]` como generalización: la versión no es pública para ninguna, y el almacén principal documentado de Stripe es MongoDB (DocDB).
  - `dataarts/100000-stars` no existe como repositorio (verificado el 2026-10-20, kernel L3).
- Tabla "Implementación verificada en nuestro ecosistema" (migraciones 034–037 de `@crm-erika`). `[NO APLICA]`.
- Presupuestos 3D: planetas GLB Draco/Meshopt + KTX2 ≤ 20.000 triángulos y ≤ 1 MB; letreros, galaxias y órbitas por código en Three.js; mapa de Popayán desde OSM en un GLB ≤ 3 MB; cielos 2K con Nano Banana. `[VIGENTE]` (kernel `3d_budgets`).
- No analiza Rappi, aunque el usuario lo nombró.

## T3 · p. 6–9 — `wshobson/agents` e idempotencia

- `wshobson/agents`: 8,5/10. Patrones: adaptador generativo (una fuente, varios runtimes), divulgación progresiva (afirma ~65 % menos tokens `[NO VERIFICABLE]`), enrutamiento de modelos por niveles, separación Agent ≠ Skill ≠ Orchestrator, certificación en 3 capas. Kernel: herramienta de **desarrollo**, no de producción. `[VIGENTE]` con esa aclaración.
- Orquestadores de máquina de estados: marca (manual → propuesta → vista previa → validaciones → aprobación → publicación) y usuario (intención → índice → recomendación → borrador → confirmación del usuario). `[VIGENTE]`.
- Cuatro garantías de idempotencia:
  - A. Doble carril: Redis para sesiones, búsquedas y borradores; el registro de eventos solo para hechos de negocio. Estima 2.000–15.000 interacciones/s y 20–150 eventos de negocio/s con 10.000 usuarios en pico. Carriles `[VIGENTE]`; cifras `[NO VERIFICABLE]`: son 10 a 75 veces las 200 solicitudes/s y 100 a 700 veces los 0,22 eventos/s del grafo v0.2 (ver AUD-11).
  - B. `event_id` UUIDv7 determinista derivado de la huella de la operación. `[CORREGIDO]`: la idempotencia usa una clave de la fuente y el UUIDv7 solo identifica (kernel INV_02).
  - C. Posición provisional negativa y definitiva al `COMMIT`. `[VIGENTE]` como diseño (INV_01), sin implementar.
  - D. Eventos veneno a dead-letter y tres contadores de falla. `[VIGENTE]` (INV_03, INV_04).
- Hexágono escalable con pools A (lectura), B (escritura), C (workers) y 5 reglas. `[VIGENTE]` como diseño.
- Firewall de privacidad: la marca solo ve nombre, celular, dirección del pedido y lo que le compró. `[VIGENTE]` (R03).

## T4 · p. 9–12 — `msitarzewski/agency-agents` y `CANONICAL_STATE_V1.json`

- `msitarzewski/agency-agents`: 9,0/10. Patrones: Brand Guardian, reglas críticas Must Do / Never Do, Reality Checker / Evidence Collector, plantillas de rendimiento espacial. Kernel: herramienta de **desarrollo**. `[VIGENTE]` con esa aclaración.
- Compactación en 4 capas: L0 invariantes y gobierno, L1 cimiento transaccional, L2 reglas de producto, L3 registro del estado del arte. `[VIGENTE]`: es la estructura del kernel actual.
- `CANONICAL_STATE_V1.json` (`schema_version 1.0.0-DURABLE`, `last_updated 2026-10-18`): mantiene las 5 zonas `[SUPERADO]`, `L1_verified_engineering_baseline` = `@crm-erika` `[SUPERADO]`, registro de campos de usuario y prohibiciones de los agentes `[VIGENTE]`. JSON **truncado** en el PDF.

## T5 · p. 12 — Acceso a GitHub

- Responde que no tiene acceso a la cuenta `panc310` / `panc310-lgtm`. Nombra el repositorio `panc310-lgtm/CRM-ERIKA` y los PRs #117, #118 y #119. Solo informativo.

## T6 · p. 12–14 — Desvío: scripts de Blender

- Ante el enlace de `awesome-flutter`, entrega `scene_popayan.py` (cuadrícula, Humilladero, Morro de Tulcán, **5 soles comerciales**) y `blender_watcher.py` (recarga cada 2 s). `[SUPERADO]`: contradice las 9 galaxias con el líder del nicho al centro. Es el **primer turno fuera de tema** (ver AUD-05).

## T7–T10 · p. 14–20 — Regeneraciones sin respuesta

- T7 y T10 regeneran el inventario con nodos renombrados (`N1_SPATIAL_DISCOVERY`, `N4_MATCHING_AND_CATALOG`, `N5_FULFILLMENT_SERVICES`, `N6_AUDIT_AND_TELEMETRY`), `F(t)`, `Φ_total` y tres grafos con otra composición (bipartito, DAG Bre-B, multicapa de infraestructura).
- `A_G` cambia de significado: "matriz de adyacencia ponderada del grafo operacional" (FG-01) → "matriz de capacidades agénticas y de computación espacial" (T7, T10). Ver AUD-14.
- T8 evalúa el presupuesto de activos 3D, no el repositorio.
- T9 no responde si tiene acceso al PC.
- Aparecen marcadores filtrados `[cite: 2, 7]` y la errata "CAPO 2".

## T12 · p. 20–22 — Diagnóstico del desvío y `awesome-flutter`

- Reconoce: no tiene acceso al disco local, la terminal "de Mac" (el equipo del usuario es Windows), Blender ni GitHub.
- Atribuye la pérdida de coherencia a que su enrutador de contexto trajo fragmentos viejos del cuaderno (scripts de los 4/5 soles y fórmulas repetidas).
- `awesome-flutter`: 1,5/10, descartado. `[SUPERADO]` en T13.
- `CANONICAL_STATE_V1.2.json` (`1.2.0-DURABLE`): agrega `host_access_boundaries` y `L2_popayan_planetario_v01_locked_rules`. JSON **truncado**.

## T13 · p. 22–23 — Maqueta web, producto app móvil

- `awesome-flutter` reevaluado: 0/10 para la maqueta web, 7,5/10 como catálogo para la app móvil.
- Dos rutas: **A** empaquetar el código web + Three.js con Capacitor/PWA; **B** UI nativa (Flutter o React Native) con un lienzo WebGL/Three.js. `[ABIERTO]`: no hay decisión.
- Contratos de cliente generados desde los JSON Schema de `packages/contracts`. `[VIGENTE]` como principio.
- `CANONICAL_STATE_V1.3.json` (`1.3.0-DURABLE`). JSON **truncado**.

## T14 · p. 23–26 — Modificaciones de producto v1.1

- Tabla de impacto: verificación automática de pagos, canal marca–plataforma por Telegram, versión 1.1 congelada como línea base mientras sigue el desarrollo (rama `release/v1.1`). `[VIGENTE]`.
- Separación estricta: `@crm-erika` = laboratorio de aprendizaje; Popayán Planetario = producto nuevo con su propio registro de eventos `planetario_events`. `[VIGENTE]`.
- Flujo v1.1: explorar → pedido en la landing → pago → webhook firmado e idempotente → evento en `planetario_events` → aviso en la app y despacho por outbox a Telegram con botones inline. `[VIGENTE]` (grafo v0.2, E42 y E36–E39).
- `POPAYAN_PLANETARIO_STATE_V1.1.json` (`schema_version 1.1.0-PLANETARIO-DURABLE`, `last_updated 2026-10-19`). La numeración retrocede de 1.3.0 a 1.1.0 (ver AUD-16). JSON **truncado**.

## Qué se conserva de FG-03

Las capas L0–L3, los invariantes de idempotencia como diseño, los presupuestos 3D, el firewall de privacidad, las prohibiciones de los agentes y el flujo v1.1. Todo lo que trata a `@crm-erika` como base de código o como evidencia medida de este producto queda fuera.

## Lo que FG-03 no contiene

La ecuación `S_Planetario` (con `Ω0`, `Θ(0.90 − L_m)` y el término `⊕` del ledger), el kernel `1.1.0-DURABLE-KERNEL` y el registro L3 con `Sairyss/domain-driven-hexagon`, `uber/h3-js`, `googlemaps/js-three`, `langchain-ai/langgraphjs`, `grammyjs/grammY`, `event-driven-io/emmett` y `timgit/pg-boss` no aparecen en este PDF. Llegaron pegados al chat de Claude el 2026-10-20 desde una conversación que no se aportó (ver AUD-04).
