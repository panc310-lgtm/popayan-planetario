# FG-08 — Decisiones del 2026-10-27 y tarea PLANETARIO-CORE-01

| Campo | Valor |
|---|---|
| Origen | Mensaje del usuario, adjunto como archivo de texto el 2026-10-27. Lo redactó con Gemini: trae marcas `[cite: 2]` y `[cite: 3, 4]` de esa herramienta |
| Archivo recibido | `2a7a4c03-attachment.txt` (UTF-8, finales de línea CRLF) |
| SHA-256 | `4d93dd717aaa2ccf4c552ef97ef5f9af4fa1648c4296a3450b130db7c0f0ed70` |
| Fidelidad | Texto completo; las fuentes de las marcas `[cite: n]` no vienen en el mensaje |
| Decisiones | Bloque T1 del mensaje y respuestas de la sesión (D2), con su texto literal en [FG-08-texto-original.md](FG-08-texto-original.md) |
| Rol | Origen de las decisiones del 2026-10-27 (PR #13, PEN-16, PEN-17, nicho y TypeScript) y de la tarea que abre la fase de código |

Etiquetas de estado: las mismas de [FG-01](FG-01-arquitectura-grafos-operacionales.md).

---

## T1 · Decisiones del propietario

| Afirmación | Estado |
|---|---|
| Ratifica el merge del PR #13 en `main` | `[VIGENTE]`: AGENTS.md 1.0.0 queda ratificado; su introducción decía que el usuario lo ratifica al aprobar su pull request |
| Aprueba las dos listas de parámetros que ya se cumplen en `main` | `[VIGENTE]`: cierra el `[ABIERTO]` de [FG-06](FG-06-atractor-extrano-soc.md) D1 sobre los "4 parámetros" |
| PEN-17: modo transacción de Supavisor (puerto 6543, `prepare: false`) para `SlaveReadDatabasePort`, pools acotados en modo sesión (5432) solo para `MasterWriteDatabasePort` y `PostgresSaver`, conexiones directas por debajo de 60 en el pico dentro de Micro y ampliación de cómputo sujeta solo a la prueba de carga de PEN-14 | `[VIGENTE]`: kernel PEN-17, enmienda de ADR-0001 y modelo de carga 0.7. Los valores por pool salen de D2, pregunta 1 |
| PEN-16: ratifica los supuestos S1–S12 y S14–S17 | `[VIGENTE]`: AGENTS.md 1.1.0 los marca como ratificados; los ⟨propuesto⟩ sin número de `docs/agentes/` no entran en esa lista y siguen propuestos |

## T1 · Tarea PLANETARIO-CORE-01

| Afirmación | Estado |
|---|---|
| Marcas `[cite: 2]` y `[cite: 3, 4]` | `[NO VERIFICABLE]`: apuntan a fuentes de la conversación con Gemini que no vienen en el mensaje |
| Las 9 galaxias, la jerarquía interés → subcategoría → tipo de oferta → producto → variantes y la separación entre Líder del nicho y Mejor evaluado | `[VIGENTE]` (kernel `N4_MATCHING_&_CATALOG_INDEX` y `spatial_and_visual_budgets`). El nivel del nicho no estaba definido; lo fijó el usuario en D2, pregunta 3 |
| Modalidades `domicilio`, `recogida_en_establecimiento` y `pedido_anticipado`, "más solicitud de servicio" | `[CORREGIDO]`: son tres modalidades de pedido; la solicitud de servicio es un contrato aparte, porque los servicios siguen por WhatsApp directo con la marca "tras una solicitud identificada en la plataforma" (E61), sin estados de P4 ni pago en la plataforma |
| Estados de P4 de ADR-0003, con `pago_informado` exclusivo de la contingencia | `[VIGENTE]` (ADR-0003, "Estados del pedido") |
| "Las 3 operaciones exactas aprobadas en ADR-0003", con `llaveIdempotencia` en `emitirCobro` y el rechazo `formato_invalido` | `[VIGENTE]` con una precisión: ADR-0003 fija las entradas "pedido, marca, monto" y los rechazos por firma, monto y marca. La llave de idempotencia (INV_02) y el rechazo por formato amplían la firma sin contradecirla |
| `EventLedgerPort` exigiendo `actor`, `agente`, `version_contrato`, `modelo` y `turno` | `[CORREGIDO]`: rule_03 exige agente, versión del contrato, modelo y turno en los eventos que **origina un agente**; el actor va siempre |
| `IdGeneratorPort` para UUIDv7 "e idempotencia" | `[CORREGIDO]`: según INV_02 la clave de idempotencia sale de la fuente y no se genera. El puerto genera el `event_id` (UUIDv7) y el dominio deriva la clave de la fuente |
| Índice de Relevancia quincenal con ventana de 90 días: calificación 40 % + compras 30 % + flujo 20 % + sedes 10 % | `[VIGENTE]`; la normalización de los componentes no está definida y queda `[ABIERTO]` en PEN-18 (D2, pregunta 2) |
| "Promedio bayesiano de ADR-0004 para marcas nuevas" | `[CORREGIDO]`: ADR-0004 lo aplica a la calificación de todas las marcas; favorece a las nuevas porque arrancan en la media del nicho |
| `Θ_s(L_m) = min(1, max(0, (1 − L_m) / 0.10))` | `[VIGENTE]` (rule_02) |
| R10: a `pagado` solo por notificación validada, consulta autenticada o, en la contingencia, la confirmación del responsable de la marca desde `pago_informado` | `[VIGENTE]` (ADR-0003, R10) |
| Cortafuegos de visibilidad: nombre, celular, dirección solo en domicilio e ítems de esa marca | `[VIGENTE]` (R03, `brand_visibility_firewall`) |
| Guardián del hexágono con la dirección `contracts → ∅`, `ports → contracts`, `domain → ports, contracts` | `[VIGENTE]` (AGENTS.md §4.1, S1) |
| "Conecta en `package.json` los comandos del DoD (AGENTS.md §5)" | `[VIGENTE]`: incluye `verify:3d-budgets`, que la tarea no nombra pero §5 exige con el primer paquete |

## D2 · Respuestas en la sesión (2026-10-27)

| Afirmación | Estado |
|---|---|
| PEN-17: pool size de Supavisor P = 19 y pools de 1 en modo sesión (1 de escritura por réplica, más 1 de PostgresSaver en worker y en agentes) | `[VIGENTE]`: kernel PEN-17 y modelo de carga 0.7. Pico: 18 en sesión, hasta 19 en transacción y 20 reservadas, 57 conexiones directas |
| Índice: solo lo ya decidido | `[VIGENTE]`: `reputation-and-relevance.ts` pondera componentes ya normalizados; PEN-18 por decidir |
| El nicho es la subcategoría | `[VIGENTE]`: kernel `N4_MATCHING_&_CATALOG_INDEX` y contrato `galaxies-and-catalog` |
| `typescript` 6.0.3 como devDependency de la raíz | `[VIGENTE]`: `package.json`; los paquetes no tienen dependencias externas |

## Qué se conserva de FG-08

Las decisiones de T1 y D2, aplicadas en la rama `feat/planetario-core-01-hexagono`, y la tarea con las precisiones de arriba. Siguen abiertos la normalización del Índice (PEN-18) y los supuestos de la fase de código (PEN-19).
