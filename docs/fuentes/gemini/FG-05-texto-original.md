# FG-05 — Texto original del insumo

Texto literal de los dos turnos que resume [FG-05](FG-05-constitucion-agents-md.md), para que su tabla de origen se pueda comprobar. No se edita: es la evidencia del insumo, no una regla. El borrador T1 termina dentro de su bloque de la sección 6, como llegó.

Cada texto va entre una línea `~~~~markdown` y una línea `~~~~`. La huella se calcula sobre ese texto sin el salto de línea que precede al cierre, con finales de línea LF (`.gitattributes`). `tools/validar-arquitectura/validar.mjs` (regla F3) la comprueba en cada pull request.

| Bloque | Contenido | SHA-256 del texto guardado aquí | SHA-256 del original recibido |
|---|---|---|---|
| T1 | Borrador de AGENTS.md del usuario, pegado como texto en el chat | `dc899437e79324f5243ea20b1817d0f5eb2eef1f4a89cf799bdad435d31d773a` | Se pegó como texto. `bba6c939e7fa517571abed521894321a23f115bafe910d83ba3b5208623e4251` es la huella del mismo texto con un salto de línea final, la convención de la primera versión de este archivo (commit `41d5525`); el texto no cambió, solo la forma de calcularla |
| T2 | Instrucciones de sincronización, adjuntas como archivo de texto | `4de981a3a7141e7722d7137c99a21f0d1b88f4b52de2a274380a86788c0851a9` | `5a5ebedc6bb6e59d5f6482e372b373d825ddc30d86606df899c39bcf0a93c889` (con finales de línea CRLF) |
| A1 | Anexo: fila S8 del primer borrador de AGENTS.md que Claude entregó en la misma conversación, antes de T2 | `549f009c96625f627cefea5ff1ce7b296cce64a42128711019d178bd5a5d4a61` | Es la línea 258 del AGENTS.md de ese borrador, que no está en el repositorio; por eso no se registra una huella del archivo completo |

## T1

~~~~markdown
necesito desarrollar la carpeta agents.md para flujo de trabajo de mis proyectos; utiliza estos criterios que he desarrollado junto con gemini; # AGENTS.md — Constitución Operativa y Especificación de Sistemas Agénticos
**Proyecto:** Popayán Planetario (`v1.1` Baseline & Evolución Continua `SoC v0.9`)  
**Raíz de Gobernanza:** `N0_ORG_CORE` (Ninguna decisión existe fuera del grafo raíz)  
**Arquitectura:** Hexagonal Pura (`packages/*`) + CQRS (`Master Write` / `Slave Read` + `D4 Redis`) + Orquestación `LangGraph 1.5`

---

## Propósito y Doble Plano de Gobernanza
Este documento rige obligatoriamente dos planos que jamás deben mezclarse ni contradecirse:
1. **Plano A — Agente de Ingeniería (Claude Code / Harness Actor-Crítico):** Cómo el LLM de ingeniería interpreta tareas de código, modifica la arquitectura, respeta las fronteras hexagonales y entrega telemetría verificable.
2. **Plano B — Sistema Multiagente en Producción (`P7`, `P8` y `P13` en el Grafo Operacional SoC v0.9):** Cómo operan los agentes que atienden de 1.000 a 50.000 ciudadanos y de 100 a 1.000 marcas en las 9 Galaxias (comunas urbanas de Popayán).

---

## 1) `model`: El LLM que interpreta la tarea y decide qué hacer

Aplicamos enrutamiento de modelos en cuatro niveles de costo, capacidad y latencia (*Four-Tier Model Routing*):

| Agente / Nodo del Grafo | Modelo Asignado y SDK | Rol de Interpretación y Decisión | Presupuesto de Latencia / Uso |
| :--- | :--- | :--- | :--- |
| **Agente de Ingeniería (Plano A: Actor y Crítico Interno)** | **Claude Opus / Sonnet (Nivel Arquitectura)** | Interpreta especificaciones de nodos de ingeniería, ejecuta refactorizaciones hexagonales y realiza autopsia adversaria en solo lectura antes de cada entrega. | Determinista en CI/CD; 0 tolerancia a *vibe coding*. |
| **`P7` — Agente de IA del Usuario (Plano B: Producción)** | **Claude Haiku 5.5** (`@anthropic-ai/sdk` invocado dentro de nodos `@langchain/langgraph` 1.5) | Interpreta intenciones de compra en lenguaje natural (nodo Enrutador con salida estructurada JSON), recomienda productos, organiza *Mi universo*, estructura borradores de pedido y atiende soporte. | Promedio de **1,5 llamadas/turno**; latencia **p95 < 6 s (`T03`)**. |
| **`P8` — Agente de IA de Marca (Plano B: Fase 2)** | **Claude Sonnet 5.5** (Propuesta Landing) + **Claude Haiku 5.5** (Juez *Brand Guardian*) + **Código Puro** (Verificador Evidencia) | Transforma el Manual de Marca obligatorio en una propuesta de *landing* comercial, audita que cumpla la identidad visual y valida el presupuesto técnico antes de la aprobación humana. | Sesión aislada por marca (escala de 100 a 1.000 marcas). |
| **`P13` — Motor de Aprendizaje y Decisión (Velocidad 1 Ambiental)** | **Cero LLM (Co-procesador matricial determinista en `worker`)** | Destila eventos confirmados (`P5`), reputación 4D (`P9`), recompra (`P10`) y saturación (`P12`) en vectores de decisión $\mathbf{\Pi}_{\text{BigData}}$ alojados en `D4` (Redis). | **< 10 ms** de lectura en `D4`; **$0 costo de tokens LLM**; $\mu = 200\text{ ev/s}$. |

---

## 2) `instructions`: Qué debe resolver y qué reglas seguir

### A. Leyes Universales del Núcleo (`N0_ORG_CORE`)
* **`rule_01` (Subordinación al Grafo Raíz):** `IF N0_ORG_CORE.policy_check == FALSE THEN ABORT_TRANSACTION` ($\Omega_0 = 0$). Ningún agente ni servicio puede tomar decisiones fuera del grafo organizacional.
* **`rule_02` (Válvula Homeostática por Marca):** Si la carga operativa de una marca en Telegram supera su umbral ($L_m(t) = \text{pendientes}/15 \ge 0.90$ en `T10`), se activa la amortiguación $\Theta_s(L_m(t))$ y el desvío predictivo hacia marcas alternas de alta calificación ($\ge 4,0$) en la misma galaxia.
* **`rule_03` (Trazabilidad Inmutable):** Toda transición de estado emite un evento canónico a `planetario_events` (`D3`) con metadatos completos (`actor`, `agente`, `version_contrato`, `modelo`, `turno`).

### B. Instrucciones para el Agente de Ingeniería (Claude)
1. **Ley del Hexágono Puro (`INV_06`):** `@planetario/contracts`, `@planetario/ports` y `@planetario/domain` tienen **prohibido** importar `pg`, `fastify`, `grammy`, `ioredis`, `three`, relojes del sistema no inyectados o módulos de `apps/*`.
2. **Segregación Física `Write` / `Read` (CQRS):** Toda mutación transaccional usa exclusivamente `MasterWriteDatabasePort` (`Master DB` / Pool B). Toda consulta de catálogo, exploración 3D e hidratación agéntica usa `SlaveReadDatabasePort` (`Slave DB` / Pool A) precedido por el escudo de caché `D4` (Redis).
3. **Desacoplamiento Externo (`INV_05`):** Prohibido mantener una transacción o conexión SQL abierta (`BEGIN...COMMIT`) mientras se invoca a `@anthropic-ai/sdk`, la API de Bold (`X7`) o la API de Telegram (`X4`).
4. **Protocolo de Doble Salida Obligatorio:** Cada entrega de cierre de nodo o auditoría debe emitirse dividida únicamente en: **1) Telemetría JSON de Nivel Principal** y **2) Cápsula Didáctica de Ingeniería**.

### C. Instrucciones para los Agentes en Producción (`P7` y `P8`)
* **Para `P7` (Usuario):** Guiar al comprador a través de las **9 Galaxias (9 comunas de Popayán)** ponderando las 4 dimensiones de reputación (*atención, producto, precio, distribución*), la fricción zonal $\delta_{\text{zona}}(u,m,g,t)$, los beneficios de fidelidad acumulados (`P10`) y el tiempo real de respuesta del comercio en Telegram ($\mu_m^{\text{Tg}}$). Armar borradores de pedido de **una sola marca por orden** y detenerse en `interrupt()`.
* **Para `P8` (Marca):** Seguir sin saltos la secuencia determinista: `Manual de Marca (ficha comercial + manual de identidad) -> Propuesta -> Vista Previa -> Validaciones (Brand Guardian + Reality Checker) -> Aprobación del Responsable (HITL) -> Publicación`.

---

## 3) `tools`: Cómo consulta datos y ejecuta acciones

### A. Herramientas de Producción (`P7` y `P8` vía `@planetario/ports`)
Ningún agente ejecuta SQL directo ni peticiones HTTP libres. Todas sus herramientas son adaptadores inyectados y validados con **Ajv 8 + JSON Schema** desde `@planetario/contracts`:

1. **`consultarVectorDecisionYCatalogo` (Solo Lectura — `D4` + `SlaveReadDatabasePort`):**
   * Consulta en `< 10 ms` los vectores $\mathbf{\Pi}_{\text{BigData}}$ pre-calculados por `P13` en `D4` y navega la jerarquía: `interés -> subcategoría -> tipo de oferta -> producto -> variantes`.
   * Respeta la separación pública entre el **Líder del nicho** (planeta central por índice quincenal de ventana de 90 días) y la insignia de **Mejor evaluado**.
2. **`gestionarMiUniverso` (Mutación Acotada de Preferencias):**
   * Guarda u organiza planetas favoritos y recordatorios del comprador dentro de la sección *Mi universo*.
3. **`prepararBorradorPedido` (Pre-Transaccional Idempotente):**
   * Estructura el borrador verificando que todos los ítems pertenezcan a **una única marca** y asigna la modalidad: `DOMICILIO` (solicitando dirección), `RECOGIDA_EN_ESTABLECIMIENTO`, `PEDIDO_ANTICIPADO_PARA_TU_LLEGADA` o `SERVICIO_CON_CITA`.
   * Genera una clave de idempotencia determinista derivada de `(conversation_id, turn_id, tool_call_id)` (`INV_02`).
4. **`generarPropuestaLandingMarca` (Exclusiva de `P8`):**
   * Lee únicamente el `brand-manual.schema.json` del `tenant_brand_id` autenticado y genera el artefacto de vista previa sujeto al guardián de marca.

### B. Herramientas de Verificación de Ingeniería (Uso Obligatorio por Claude)
Antes de declarar cualquier tarea como completada, Claude debe ejecutar y pasar en verde:
* `npm run verify:kernel` y `node tools/validar-arquitectura/validar.mjs` (Coherencia del Kernel Durable y del Grafo SoC v0.9).
* `npm run verify:hexagon` (Cero violaciones de importación entre paquetes y adaptadores).
* `node calcular.mjs --estricto` (Verificación matemática de colas M/M/c con utilización $\rho < 0,70$ en todos los contenedores del MVP).
* `npm run verify:contracts`, `npm run verify:3d-budgets` y `npm run test:integral`.

---

## 4) `context`: Qué información recibe en cada paso

Para evitar la degradación de razonamiento y el colapso de costos con 10.000 usuarios concurrentes, aplicamos **Divulgación Progresiva (*Progressive Disclosure*)**:

1. **Presupuesto de Arranque en `P7` (`< 800 tokens` iniciales):**
   * En el paso 1 de cada turno, `P7` recibe únicamente: `usuario_id`, `galaxia_comuna_residencia` ($g \in \{1..9\}$), vector compacto de `intereses`, resumen de favoritos en *Mi universo*, contador de recompra de fidelidad (`P10`) y el resumen del vector de decisión $\mathbf{\Pi}_{\text{BigData}}$ de su galaxia actual leído desde `D4`.
   * Los detalles extensos de productos, precios y variantes se inyectan **únicamente bajo demanda** cuando el nodo de descubrimiento o borrador invoca la herramienta de catálogo.
2. **Aislamiento de Contexto en `P8` (Zero-Trust por Marca):**
   * El contexto de `P8` contiene exclusivamente el Manual de Marca, el catálogo propio y las reglas de diseño de esa marca específica. Jamás recibe datos de las otras 99 marcas, métricas de pagos ni evaluaciones de competidores.
3. **Jerarquía de Contexto en Ingeniería (Plano A):**
   * Claude hidrata su contexto leyendo siempre la fuente única de verdad en este orden: `arquitectura/kernel-durable.json` (`continuity/POPAYAN_PLANETARIO_KERNEL_V1.1.json`), `arquitectura/grafo-operacional.json` (`v0.9-SoC`), `arquitectura/modelo-de-carga.json` y los ADRs vigentes (`ADR-0001` a `ADR-0004`).

---

## 5) `memory`: Qué guarda para usar más adelante

La memoria del sistema se divide en **tres estratos físicos con responsabilidades estrictamente separadas**:

| Estrato de Memoria | Tecnología y Ubicación | Qué Guarda y Reglas de Retención (TTL / Inmutabilidad) |
| :--- | :--- | :--- |
| **1. Memoria Operativa y Conversacional de Corto Plazo** | **`PostgresSaver` en esquema aislado `agentes`** (PostgreSQL) + Candados/Caché en **Upstash Redis (`D4`)** | • Guarda los *checkpoints* del `StateGraph` de LangGraph y el historial de mensajes **solo de agregar (*append-only*)**.<br>• **Separado físicamente** de las tablas de dominio y de `planetario_events`.<br>• **TTL:** Vence a las **24 horas** sin actividad para sesiones de comprador (`P7`) y al publicarse o a los **30 días** para *landings* de marca (`P8`). *(Upstash no se usa como `Saver` de LangGraph por carecer de RediSearch).* |
| **2. Memoria Canónica Transaccional (El *Event Ledger*)** | **`D3: planetario_events` en `Master DB` (PostgreSQL 16)** | • Guarda cada hecho comercial inmutable (`ORDER_DRAFT_CREATED`, `PAYMENT_AUTOMATICALLY_VERIFIED`, `ORDER_ACCEPTED_BY_BRAND`, `ORDER_COMPLETED`, etc.).<br>• Escrito únicamente mediante `appendCanonicalEvent` con orden exacto asignado en el instante del `COMMIT` (`INV_01`) y clave `UUIDv7` (`INV_02`). |
| **3. Memoria Colectiva y de Relación Durable (Big Data SoC)** | **`P13` $\rightarrow$ `D4` (Redis System Cache) + `D1` (Proyecciones CQRS)** | • **En `D4` (Tiempo Real):** Guarda los vectores $\mathbf{\Pi}_{\text{BigData}}$ indexados por `(galaxia_id, nicho_id, franja_horaria)` con velocidad real de atención en Telegram ($\mu_m^{\text{Tg}}$) y carga actual ($L_m(t)$).<br>• **En `D1` (Ventana Móvil de 90 días / 15 días):** Guarda la reputación en 4 dimensiones (`P9`), el historial de recompra acumulada entre sedes (`P10`), la eficiencia de conversión $\eta = F_3/F_0$ y la cobertura quincenal $C_{15}$. |

---

## 6) `agent loop`: Cómo el modelo elige una acción, el código la ejecuta y le devuelve el resultado

### A. Bucle de Ejecución en Producción (`StateGraph` de `@langchain/langgraph` 1.5, Sin Enjambres Opacos ni Supervisores Libres)

```text
[1. Entrada de Turno] ──► Adquiere candado por conversación en Upstash (D4: 1 turno a la vez)
        │
        ▼
[2. Hidratación <5ms] ──► Lee checkpoint (esquema agentes) + Vector Decisión (D4) y LIBERA conexión SQL
        │
        ▼
[3. Nodo Enrutador]   ──► Claude Haiku 5.5 devuelve JSON estructurado eligiendo la arista condicional:
        │                 ├──► Nodo `descubrimiento` (consulta P3/D4 y compara en 4D + tiempo real)
        │                 ├──► Nodo `mi_universo`    (actualiza planetas favoritos y fidelidad)
        │                 ├──► Nodo `pedido_en_borrador` (valida 1 sola marca y modalidad)
        │                 └──► Nodo `soporte`        (consulta estados, devoluciones y citas)
        ▼
[4. Pausa HITL]       ──► Si hay acción crítica (confirmar pedido o publicar landing):
        │                 • Ejecuta efectos previos de forma 100% idempotente.
        │                 • Invoca `interrupt()` de LangGraph y persiste estado en `PostgresSaver`.
        │                 • Devuelve Tarjeta Interactiva a la UI del usuario y libera el worker.
        ▼
[5. Acción Humana + Reanudación]
                          • El humano confirma con su sesión autenticada en la API (P2 -> P4).
                          • La API evalúa la compuerta Omega, emite el cobro (`VerificadorDePagos`)
                            y escribe en `planetario_events` (`D3`) bajo `pg_advisory_xact_lock`.
                          • El grafo se reanuda mediante `Command({ resume })` para cerrar el turno.
~~~~

## T2

~~~~markdown
Vamos a consolidar `AGENTS.md` (v1.0.0) en la raíz del repositorio, crear su estructura modular en `docs/agentes/*` y sincronizar los artefactos de arquitectura hacia el grafo operacional `v0.9-SoC`.

### 1. Ajustes de sincronización sobre `AGENTS.md` (v1.0.0) al guardarlo en la raíz:
- En `§2` (punto 1): deja como ruta física canónica únicamente `arquitectura/kernel-durable.json` (versión actual `1.5.0-DURABLE-KERNEL` -> actualización a `1.6.0-DURABLE-KERNEL`), eliminando la referencia a `continuity/POPAYAN_PLANETARIO_KERNEL_V1.1.json`.
- En `§4.4` y `§10` (`D3`): actualiza `PostgreSQL 16` a `PostgreSQL 17` conforme a `ADR-0001` (manteniendo la nota de que `uuidv7()` nativo llegó en PG 18 y por tanto se genera en aplicación vía puerto de IDs).
- En `§5` (Definición de terminado) y `package.json`: asegúrate de que los scripts listados en el DoD (`verify:kernel`, `verify:hexagon`, `verify:contracts`, `verify:3d-budgets`, `test:integral`) estén declarados en el `package.json` raíz o documenta qué comando se ejecuta en la fase documental frente a la fase de paquetes de código.

### 2. Creación de los documentos modulares en `docs/agentes/` (según la tabla de enrutamiento de `§2`):
Crea los archivos referenciados en `AGENTS.md §2` manteniendo concisión normativa, trazabilidad a `N0_ORG_CORE` y los supuestos `S1`–`S8` de `§11`:
1. `docs/agentes/plano-a-harness-ingenieria.md`: flujo Actor-Crítico, auditoría adversaria en solo lectura (máximo 3 ciclos `S3`), fronteras hexagonales (`MasterWriteDatabasePort` vs `SlaveReadDatabasePort` + `D4`) y reglas de escalamiento.
2. `docs/agentes/plano-b-runtime.md`: candado de concurrencia por conversación en Upstash (`D4`, lease de 15 s con token de comparación `S4`), hidratación `< 5 ms` liberando conexión SQL antes de llamar a la IA (`INV_05`), checkpoints en `PostgresSaver` bajo esquema aislado `agentes` con tarea programada de purga en `worker` (`S5`: 24 h para `P7`, 30 días para `P8`), patrón de bandeja de salida transaccional e interrupción/reanudación (`interrupt()` + `Command({ resume })`).
3. `docs/agentes/p7-agente-usuario.md`: enrutador con Haiku 5.5 validado por Ajv (`descubrimiento`, `mi_universo`, `pedido_en_borrador`, `soporte`), presupuesto `< 800 tokens` de arranque, tope de 3 llamadas a herramienta por turno (`S6`), pedido de una sola marca con las 3 modalidades de producto + Servicios, y prohibición por construcción de confirmar pagos o pedidos.
4. `docs/agentes/p8-agente-marca.md`: secuencia determinista `Manual de Marca -> Propuesta (Sonnet 5.5) -> Vista Previa -> Validaciones (Brand Guardian en Haiku 5.5 + Reality Checker en código N0) -> Aprobación del Responsable (HITL) -> Publicación`, máximo 3 regeneraciones (`S7`) y aislamiento estricto por `tenant_brand_id`.
5. `docs/agentes/p13-motor-decision.md`: co-procesador determinista en `worker` (`N0`, `$0` tokens LLM) que lee de `D3`/`P5`, `P9` (reputación 4D quincenal sobre 90 días), `P10` (recompra) y `P12` (saturación `L_m(t)`), y escribe en `D1`/`D4` (`S8`) los vectores `Π_BigData` consumidos en `< 10 ms` para cerrar `PEN-08` (amortiguación `Θ_s(L_m)` y desvío hacia marcas con evaluación `>= 4,0`).
6. `docs/agentes/plantillas/doble-salida.md` y `docs/agentes/plantillas/telemetria-entrega.schema.json`: plantilla y esquema JSON para el protocolo de doble salida (`§6`).

### 3. Sincronización de los artefactos del Grafo Operacional `v0.9-SoC`:
Actualiza de forma coherente y validada por esquemas:
- `arquitectura/grafo-operacional.json` (`v0.9-SoC`): incorpora el nodo `P13` en `worker`, el lazo cerrado de retroalimentación desde `P12` hacia gobernanza (`G1..G4`), las lecturas rápidas desde `D4` y las métricas `T24`–`T26`, cerrando `PEN-08`.
- `arquitectura/kernel-durable.json` (`1.6.0-DURABLE-KERNEL`): registra la incorporación de `AGENTS.md`, `P13`, el enrutamiento CQRS (`MasterWriteDatabasePort` / `SlaveReadDatabasePort` + `D4`) y el cierre de `PEN-08`.
- `arquitectura/modelo-de-carga.json`: incluye el nodo `P13` dentro del contenedor `worker` y verifica con `node tools/modelo-de-carga/calcular.mjs --estricto` que todos los servicios se mantengan con utilización `ρ < 0,70`.
- `tools/validar-arquitectura/validar.mjs` y `tools/validar-arquitectura/pruebas.mjs`: asegura que el validador y su suite de pruebas pasen al 100 % en verde.

Al finalizar, ejecuta las verificaciones y entrégame el resultado aplicando el Protocolo de Doble Salida (`§6` de `AGENTS.md`: 1. Telemetría JSON de nivel principal y 2. Cápsula didáctica de ingeniería).
~~~~

## A1

El "(S8)" que cita T2 ("escribe en D1/D4 (S8) los vectores Π_BigData") remite a esta fila del primer borrador, que T2 tenía delante. En AGENTS.md 1.0.0, S8 es otro supuesto: el costo en Redis de P13.

~~~~markdown
| S8 | `P13` no escribe en `D3`; solo lee de `D3` y escribe en `D1`/`D4` | `p13-motor-decision.md` |
~~~~
