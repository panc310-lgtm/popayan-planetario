# Infraestructura transversal del harness: telemetría e IA, evaluaciones, compuertas de política, canal Telegram y defensas contra inyección de instrucciones

Nota de investigación con fecha de corte del 22-oct-2026. Las versiones y fechas de npm salen del registro público (`registry.npmjs.org/<paquete>`). Las estrellas, licencias, último push y estado de archivo de los repositorios salen de la API REST de GitHub, consultada el 22-oct-2026. En cada hallazgo se cita la URL del repo o paquete. Todo lo que aparece como "Inferencia" es razonamiento propio aplicado a Popayán Planetario, no un hecho de la fuente.

## 1. OpenTelemetry en Node 24: estado del SDK, convenciones GenAI, autoinstrumentación (Fastify, pg, pg-boss), trazas de LangGraph.js y del SDK de Anthropic, y backends baratos

### Takeaway
OpenTelemetry JS acaba de publicar el SDK 3.0.0 (20-oct-2026), que exige Node ≥ 22.15. Con Node 24 se cumple, pero la versión tiene dos días y la línea 2.x (2.12.0, del 6-oct) sigue siendo la que más usa el ecosistema. Las convenciones semánticas GenAI están en estado "Development" y viven ahora en un repo aparte. Incluyen spans de agente (`invoke_agent`, `execute_tool`) y declaran `anthropic` como proveedor reconocido. No hay instrumentación oficial de OTel para Anthropic ni para pg-boss: para el SDK de Anthropic y para LangChain/LangGraph están OpenInference (Arize), OpenLLMetry (Traceloop) o el handler de Langfuse, y pg-boss requiere propagar el contexto a mano. Para nuestro volumen, el plan gratuito de Grafana Cloud (50 GB de trazas al mes) o el de Honeycomb (20 M de eventos al mes) bastan con holgura.

### Cited Findings
**SDK y versiones**
- OTel JS v3.0.0 (SDK) figura como "Latest" con fecha 20-oct y se empareja solo con experimental 0.300.0. Sube el mínimo a Node `>=22.15.0` y deja fuera Node 18 y 20 — [Releases opentelemetry-js](https://github.com/open-telemetry/opentelemetry-js/releases); [v3.0.0](https://github.com/open-telemetry/opentelemetry-js/releases/tag/v3.0.0)
- Cambios incompatibles de la 3.0.0:
  - Se eliminan `sdk-trace-node`, `sdk-trace-base` y `sdk-trace-web`, reemplazados por `@opentelemetry/sdk-trace`. También salen `shim-opentracing`, `propagator-jaeger` y `exporter-jaeger`.
  - El build pasa a tsdown con mapa `exports`, así que los imports profundos dejan de resolver.
  - Se elimina `AsyncHooksContextManager`.
  - `forceFlushTimeoutMillis` se sustituye por `forceFlush({ timeoutMillis })`.
  - La página no dice si 2.x seguirá recibiendo soporte. Fuente: [v3.0.0](https://github.com/open-telemetry/opentelemetry-js/releases/tag/v3.0.0)
- `@opentelemetry/sdk-trace` 3.0.0 y `@opentelemetry/sdk-node` 0.300.0 se publicaron en npm el 2026-10-20, con engines `>=22.15.0`. La línea 2.x continúa: `@opentelemetry/sdk-trace-node` 2.12.0 salió el 2026-10-06, y antes salieron 2.11.0 (31-ago) y 2.10.0 (21-jul). `@opentelemetry/api` está en 1.10.0 y `@opentelemetry/semantic-conventions` en 1.43.0 (2026-07-09). Licencia Apache-2.0 — [npm sdk-trace](https://registry.npmjs.org/@opentelemetry/sdk-trace); [npm sdk-trace-node](https://registry.npmjs.org/@opentelemetry/sdk-trace-node); [releases](https://github.com/open-telemetry/opentelemetry-js/releases)
- Repos: opentelemetry-js tiene 3.500★ y opentelemetry-js-contrib 938★. Ambos son Apache-2.0 y tienen push del 22-oct-2026 — [opentelemetry-js](https://github.com/open-telemetry/opentelemetry-js); [contrib](https://github.com/open-telemetry/opentelemetry-js-contrib)

**Autoinstrumentación**
- `@opentelemetry/auto-instrumentations-node` está en 0.82.0 (2026-10-20). Todas estas instrumentaciones exigen Node `>=22.15.0` — [npm](https://registry.npmjs.org/@opentelemetry/auto-instrumentations-node):
  - `instrumentation-pg` 0.77.0
  - `instrumentation-ioredis` 0.72.0
  - `instrumentation-undici` 0.34.0
  - `instrumentation-pino` 0.70.0
- **Fastify:** `@opentelemetry/instrumentation-fastify` (0.57.0) está deprecado en npm con el mensaje "Deprecated in favor of @fastify/otel, maintained by the Fastify authors". `@fastify/otel` está en 0.21.3 (2026-10-19), licencia MIT; el repo fastify/otel tiene 65★ y está activo — [npm instrumentation-fastify](https://registry.npmjs.org/@opentelemetry/instrumentation-fastify); [fastify/otel](https://github.com/fastify/otel)
- **Proveedores LLM en contrib:** existe `@opentelemetry/instrumentation-openai` 0.22.0, pero npm no tiene ningún `@opentelemetry/instrumentation-anthropic` (devuelve "not found") — [npm instrumentation-openai](https://registry.npmjs.org/@opentelemetry/instrumentation-openai); [npm anthropic (404)](https://registry.npmjs.org/@opentelemetry/instrumentation-anthropic)
- **pg-boss** está en 12.38.0 (2026-10-13), licencia MIT; el repo timgit/pg-boss tiene 4.077★. No encontré una instrumentación OTel específica de pg-boss. El patrón general para colas es serializar el `traceparent` W3C en el sobre del mensaje y extraerlo en el worker — [npm pg-boss](https://registry.npmjs.org/pg-boss); [patrón de propagación (SigNoz)](https://signoz.io/blog/opentelemetry-context-propagation/)

**Convenciones semánticas GenAI**
- La sección GenAI de opentelemetry.io ahora solo muestra "Moved" y remite al repo `open-telemetry/semantic-conventions-genai`. Tiene subpáginas de spans de agente, métricas, eventos, MCP y proveedores (Anthropic, OpenAI, Bedrock, Azure) — [opentelemetry.io GenAI](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- El repo semantic-conventions-genai es Apache-2.0, tiene 471★ y 151 issues abiertos, y no ha publicado ningún release. La URL de esquema aparece como "TODO" y usa Weaver para depender de las convenciones base — [repo](https://github.com/open-telemetry/semantic-conventions-genai)
- **Spans de agente** (estado Development) — [gen-ai-agent-spans.md](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md):
  - Operaciones: `create_agent` (span CLIENT con nombre `create_agent {gen_ai.agent.name}`), `invoke_agent` (variantes client e internal), `invoke_workflow` y `execute_tool`.
  - Atributos `gen_ai.agent.id`, `gen_ai.agent.name` y `gen_ai.agent.version`. Para `gen_ai.agent.id` la convención desaconseja usar IDs de instancia en memoria.
  - `gen_ai.system_instructions` es opt-in.
- **Spans de inferencia** (estado Development) — [gen-ai-spans.md](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md):
  - `gen_ai.provider.name` reconoce, entre otros, el valor `anthropic`.
  - `gen_ai.usage.input_tokens` incluye los tokens cacheados, y `gen_ai.usage.cache_read.input_tokens` es un subconjunto.
  - `gen_ai.output.messages` es opt-in porque la convención advierte que puede contener PII.

**Trazas de LLM y LangGraph**
- **OpenLLMetry-JS** (traceloop/openllmetry-js):
  - Apache-2.0, 411★, último push el 2026-06-18. `@traceloop/node-server-sdk` e `@traceloop/instrumentation-anthropic` están en 0.27.0 (2026-06-01).
  - Soporta Anthropic, OpenAI, Bedrock, Vertex, LangChain y LlamaIndex. LangGraph no aparece mencionado.
  - El README no confirma que emita las convenciones GenAI oficiales.
  - Fuentes: [repo](https://github.com/traceloop/openllmetry-js); [npm](https://registry.npmjs.org/@traceloop/node-server-sdk)
- **OpenInference (Arize):** el repo tiene 1.278★, es Apache-2.0 y estaba activo el 22-oct. En JS publica `@arizeai/openinference-instrumentation-anthropic` 0.2.11, `-langchain` 4.1.4 (ambas del 2026-10-01) y `-claude-agent-sdk` 0.3.4 — [Arize-ai/openinference](https://github.com/Arize-ai/openinference); [npm anthropic](https://registry.npmjs.org/@arizeai/openinference-instrumentation-anthropic)
- **Langfuse JS v6** se apoya en OTel. Se registra `LangfuseSpanProcessor` en el `NodeSDK` y luego se pasa un `CallbackHandler({ sessionId, userId, tags })` en `callbacks` al invocar el agente. LangGraph "sigue el mismo patrón" que LangChain. `@langfuse/langchain` v6 requiere `@langchain/core@^1` — [Langfuse LangChain/LangGraph](https://langfuse.com/integrations/frameworks/langchain)
- `@langfuse/otel`, `@langfuse/tracing` y `@langfuse/langchain` están en 6.0.2 (2026-10-22), con engines `node >=22` y licencia MIT — [npm @langfuse/otel](https://registry.npmjs.org/@langfuse/otel)
- Versiones vigentes del stack de agentes, todas del 21 y 22-oct-2026 — [npm langgraph](https://registry.npmjs.org/@langchain/langgraph); [npm sdk](https://registry.npmjs.org/@anthropic-ai/sdk):
  - `@langchain/langgraph` 1.5.2 (MIT); el repo langgraphjs tiene 3.370★.
  - `@langchain/anthropic` 1.6.0.
  - `@anthropic-ai/sdk` 1.1.0 (Apache-2.0).

**Backends**
- **Grafana Cloud Free** — [Grafana pricing](https://grafana.com/pricing/):
  - 10k series activas, 50 GB/mes de logs, 50 GB/mes de trazas y 50 GB/mes de perfiles, con 14 días de retención y 3 usuarios.
  - Incluye además "Agent Observability" con 30k generaciones al mes y 25 M tokens para "Evals and Guards".
  - El plan Pro cobra $19/mes de plataforma. Las trazas cuestan $0,05/GB de procesamiento, $0,40/GB de escritura y $0,10/GB de retención, con 30 días.
- **Honeycomb Free:** hasta 20 M de eventos y 100 M de puntos de métricas al mes; Pro desde $150/mes. La página no indica la retención del plan gratuito — [Honeycomb pricing](https://www.honeycomb.io/pricing)
- **Axiom Personal (gratis):** 500 GB/mes de "data loading compute", 30 días de retención y 25 GB de almacenamiento, con integración "OTel". El plan Axiom Cloud cuesta $25/mes más el uso — [Axiom pricing](https://axiom.co/pricing)
- **SigNoz Cloud Teams** — [SigNoz pricing](https://signoz.io/pricing/); [repo](https://github.com/SigNoz/signoz):
  - $49/mes con $49 de uso incluido. Trazas y logs a $0,30/GB con 15 días de retención; métricas a $0,10 por millón de muestras.
  - La edición Community autoalojada incluye "LLM observability" con OpenTelemetry e integración con OpenLLMetry.
  - El repo tiene 32,4k★ y la API de GitHub reporta su licencia como "NOASSERTION", porque mezcla licencias.
- grafana/docker-otel-lgtm (Apache-2.0, 2.070★, activo el 22-oct-2026) es una imagen todo en uno de OTel con Grafana para desarrollo local — [repo](https://github.com/grafana/docker-otel-lgtm)

### Inferences
- **Línea del SDK.** Con Node 24 se puede elegir SDK 3.0 o 2.12. La 3.0 tiene dos días y cambia el árbol de paquetes, porque `sdk-trace-base` pasa a ser `sdk-trace`. Es probable que procesadores de terceros como `LangfuseSpanProcessor` u OpenInference declaren dependencias de pares sobre la 2.x durante algunas semanas. Con el MVP en dic-2026, la opción conservadora es fijar SDK 2.12 / experimental 0.223 y migrar a la 3.x en 2027; la alternativa es arrancar directamente en 3.x. Esto se puede verificar con `npm ls` antes de elegir.
- **Un proceso, un SDK.** En la imagen única de Railway, cada proceso (api, worker, agentes) debe iniciar su propio SDK con un `service.name` distinto. Así ρ_max por nodo (T01) y la latencia p95 de la API (T02) quedan separados por servicio.
- **Aislar el vocabulario GenAI.** Como las convenciones GenAI están en "Development" y no tienen release, conviene encapsular los nombres de atributos en un adaptador del puerto de telemetría de la arquitectura hexagonal. Así T17 (costo de IA por conversación) puede mapearse a `gen_ai.usage.*` más un id de conversación sin acoplar el dominio a nombres que pueden cambiar.
- **Trazas de agentes sin dependencia oficial.** LangGraph.js se traza vía callbacks de LangChain, sea con el handler de Langfuse o con OpenInference para LangChain. Las llamadas directas a `@anthropic-ai/sdk` se cubren con OpenInference-Anthropic, que es más reciente (oct-2026) que OpenLLMetry-JS (jun-2026).
- **pg-boss.** pg-boss queda medio cubierto por `instrumentation-pg`, que ve el SQL. Para medir el retraso del bus (T04 > 5 s), los eventos perdidos y los duplicados (T05/T06) hay que inyectar el `traceparent` en el `data` del job y registrar spans y métricas propias (`created_on` → `started_on`).
- **Volumen.** Un MVP municipal con decenas o pocos cientos de marcas difícilmente pasa de unos pocos GB de trazas al mes, así que Grafana Cloud Free o Honeycomb Free bastan. El riesgo está en la cardinalidad de métricas: el límite de Grafana es 10k series activas, y usar `brand_id` × zona × estado como etiquetas puede agotarlo. Las métricas por marca de alta cardinalidad (cola > 15 → autopausa) pueden ir a Postgres o Redis y al tablero, no como etiquetas de series.

### Gaps
- No hallé una política publicada de soporte o EOL para la línea 2.x tras el lanzamiento de la 3.0.0.
- No verifiqué si `@langfuse/otel` 6.x y OpenInference ya aceptan `@opentelemetry/sdk-trace` 3.x como dependencia de pares.
- No pude leer completas las secciones de `gen_ai.conversation.id`, `gen_ai.usage.output_tokens` ni la variable de transición `OTEL_SEMCONV_STABILITY_OPT_IN` en el repo nuevo: las páginas se truncaron.
- Tampoco sé si LangGraph.js emite de forma nativa spans OTel con convenciones GenAI. Lo encontrado pasa por callbacks de LangChain o por LangSmith.
- No verifiqué la retención del plan gratuito de Honeycomb ni el detalle de "Agent Observability" de Grafana Cloud.

## 2. Plataformas de observabilidad y evaluación de LLM (autoalojables o asequibles) y costo por conversación (T17)

### Takeaway
Langfuse es la opción más completa con licencia permisiva: MIT, salvo las carpetas `ee`. Integra LangGraph.js por OTel o callbacks, calcula costos de Anthropic y tiene un plan gratuito de 50k unidades al mes. Desde enero de 2026 pertenece a ClickHouse, y autoalojarlo exige Postgres, ClickHouse, Redis y S3, lo que pesa para nuestro presupuesto en Railway. Phoenix es potente pero usa ELv2, que no es una licencia OSI. LangSmith y Braintrust son SaaS y solo se autoalojan en planes Enterprise. promptfoo, con licencia MIT, sirve para evals y red-teaming en CI, aunque OpenAI anunció su adquisición en mar-2026.

### Cited Findings
**Langfuse**
- El repo tiene 36,2k★ y está licenciado "MIT … except for the `ee` folders"; la API de GitHub reporta la licencia como "NOASSERTION". El README dice que "since January 2026 we're part of ClickHouse". La instancia autoalojada envía telemetría por defecto, que se desactiva con `TELEMETRY_ENABLED=false` — [langfuse/langfuse](https://github.com/langfuse/langfuse)
- **Autoalojamiento** — [Langfuse self-hosting](https://langfuse.com/self-hosting):
  - Componentes: Web, Worker, PostgreSQL, Redis/Valkey, ClickHouse (trazas, observaciones y puntajes) y almacenamiento S3/blob.
  - Requieren licencia (EE) solo tres complementos: "Organization Creators", "Instance Management API" y "UI Customization".
  - Docker Compose en una sola VM no ofrece alta disponibilidad ni backups.
- **Langfuse Cloud** — [Langfuse pricing](https://langfuse.com/pricing):
  - Hobby: gratis con 50k unidades al mes, 30 días y 2 usuarios.
  - Core: $29/mes con 100k unidades, $8 por cada 100k extra y 90 días.
  - Pro: $199/mes.
  - Una unidad es una traza, una observación (span, evento o generación) o un puntaje.
- **Costos** — [Langfuse token & cost tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking):
  - Langfuse prioriza el uso y el costo que se le envían; si faltan, los infiere de las definiciones de modelo.
  - Trae precios por defecto para modelos Anthropic y admite claves como `cache_read_input_tokens`.
  - La Metrics API agrega el costo por usuario o por tags. La documentación no menciona explícitamente el costo por sesión.

**Arize Phoenix**
- Usa licencia Elastic License 2.0 (ELv2) y tiene 12,0k★. Está construido sobre OTel y OpenInference.
- Paquetes TS: `@arizeai/phoenix-otel`, `phoenix-client` y `phoenix-evals` (este último en alfa).
- Instrumentaciones JS para LangChain.js y Claude Agent SDK. La página no lista una instrumentación JS de Anthropic, aunque existe en OpenInference (sección 1).
- Tiene botón de despliegue en Railway.
- Fuentes: [Arize-ai/phoenix](https://github.com/Arize-ai/phoenix); [npm phoenix-otel 2.3.0, 2026-10-21](https://registry.npmjs.org/@arizeai/phoenix-otel)

**Helicone**
- Apache-2.0 y 6,2k★, con push del 20-oct-2026. Funciona como AI Gateway (proxy, cambiando la base URL) o como logging asíncrono vía OpenLLMetry, y soporta Anthropic.
- Autoalojarlo implica Web, Worker (Cloudflare Workers), Jawn, Supabase, ClickHouse y Minio. `@helicone/helpers` tuvo su última publicación el 2025-11-07.
- Fuentes: [Helicone](https://github.com/Helicone/helicone); [npm](https://registry.npmjs.org/@helicone/helpers)

**LangSmith**
- Planes:
  - Developer: gratis con 5k trazas base al mes y 1 asiento.
  - Plus: $39 por asiento con 10k trazas.
  - Las trazas base se retienen 14 días y las extendidas 180.
- El autoalojamiento es solo para Enterprise — [LangChain pricing](https://www.langchain.com/pricing)
- El repo `langchain-ai/langsmith-sdk` se archivó el 16-oct-2026: el SDK de JS pasó a `langchain-ai/langsmith-javascript`. npm `langsmith` está en 0.11.0 (2026-10-15), licencia MIT — [langsmith-sdk](https://github.com/langchain-ai/langsmith-sdk); [npm](https://registry.npmjs.org/langsmith)

**Braintrust**
- Starter (gratis): 1 GB de datos procesados, 10k puntajes, 14 días de retención y usuarios ilimitados. Pro: $249/mes.
- On-prem solo en Enterprise.
- npm `braintrust` está en 3.39.0 (2026-10-21), licencia MIT.
- Fuentes: [Braintrust pricing](https://www.braintrust.dev/pricing); [npm](https://registry.npmjs.org/braintrust)

**promptfoo**
- MIT, 26,3k★, npm 0.124.1 (2026-10-08) — [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo); [npm](https://registry.npmjs.org/promptfoo)
- OpenAI anunció el 9-mar-2026 que adquiere Promptfoo e integrará su tecnología en OpenAI Frontier — [OpenAI](https://openai.com/zh-Hans-CN/index/openai-to-acquire-promptfoo/); [TechCrunch](https://www.techcrunch.com/2026/03/09/openai-acquires-promptfoo-to-secure-its-ai-agents/)

**Otros**
- openai/evals: 19,6k★, licencia "NOASSERTION" según la API de GitHub, último push el 2026-04-14 — [openai/evals](https://github.com/openai/evals)
- Grafana Cloud Free incluye "Agent Observability" (30k generaciones al mes) y SigNoz incluye "LLM observability" en todos sus planes. Es una alternativa a usar una plataforma LLM separada — [Grafana](https://grafana.com/pricing/); [SigNoz](https://signoz.io/pricing/)

### Inferences
- **T17 sin depender de un proveedor.** La respuesta de `@anthropic-ai/sdk` ya trae el uso de entrada, salida y caché. El nodo N6 puede persistir ese uso en Postgres por `conversation_id` y por marca, y calcular el costo con una tabla de precios propia. Langfuse queda así como visor y herramienta de evals, no como fuente de verdad. Si se usa Langfuse, `sessionId` = id de conversación permite filtrar, pero su documentación no garantiza la agregación de costo por sesión.
- **Capacidad de Langfuse Hobby.** Si una conversación produce 1 traza más unas 5–15 observaciones (nodos de LangGraph, llamadas a Claude, herramientas, compuerta Ω), 50k unidades al mes alcanzan para unas 3k–8k conversaciones. Esta estimación es propia y debe medirse. Autoalojar Langfuse (ClickHouse + Redis + S3) probablemente cuesta más en Railway que Langfuse Core ($29).
- **"Segunda auditoría IA" de N6.** Puede implementarse como un evaluador fuera de línea o muestreado, del tipo "LLM-as-judge" con Haiku, sobre trazas en Langfuse, Phoenix o el propio Postgres. promptfoo cubre las regresiones de prompts y el red-team de inyección en CI. La adquisición por OpenAI es un riesgo de gobernanza, aunque la licencia MIT permite hacer fork.
- **Licencias a revisar.** Phoenix (ELv2) prohíbe ofrecerlo como servicio gestionado a terceros, lo que no aplica a uso interno, pero no es OSI. Langfuse y SigNoz mezclan carpetas `ee`.

### Gaps
- No obtuve el precio de Langfuse Enterprise autoalojado ni requisitos mínimos de CPU y RAM para autoalojarlo.
- No verifiqué si Langfuse calcula automáticamente el costo de `cache_creation` para Claude Haiku/Sonnet 5.5, ni si su tabla de precios ya incluye esos modelos.
- No verifiqué la integración JS de Braintrust con LangGraph.js.
- No investigué Pydantic Logfire, que aparece en npm como `@pydantic/logfire-node` 0.18.30.

## 3. Motores de política y autorización para la compuerta Ω en proceso y el aislamiento por marca

### Takeaway
Para una compuerta en proceso, de baja latencia, evaluada antes de cada comando de dominio, el candidato más sólido es Cedar con `@cedar-policy/cedar-wasm`:

- es Apache-2.0 y está muy activo (4.14.0, 19-oct-2026);
- está en la CNCF Sandbox desde oct-2025;
- su semántica está verificada en Lean.

Hay además un repo específico para agentes (`cedar-for-agents`). Las alternativas en proceso son Casbin (ahora bajo la organización `apache/`, activo) y reglas escritas a mano en TypeScript. OPA es maduro, pero su SDK WASM para JS no se publica desde nov-2024. OpenFGA y SpiceDB son servidores aparte, lo que añade un salto de red. La librería open source de Oso está deprecada.

### Cited Findings
**Cedar**
- cedar-policy/cedar: 1.809★, Apache-2.0, push del 22-oct-2026. Afirma "bounded latency" y una estructura indexable. Tiene un crate WASM para JS/TS — [cedar-policy/cedar](https://github.com/cedar-policy/cedar)
- `@cedar-policy/cedar-wasm` 4.14.0 se publicó el 2026-10-19, con licencia Apache-2.0 — [npm](https://registry.npmjs.org/@cedar-policy/cedar-wasm)
- Entró en la CNCF como Sandbox el 8-oct-2025. Su especificación está verificada con un demostrador de teoremas (Lean) y soporta RBAC, ABAC y ReBAC. Entre los adoptantes reportados están Cloudflare y MongoDB — [CNCF Cedar](https://www.cncf.io/projects/cedar/); [InfoQ](https://infoq.com/news/2026/01/cedar-joins-cncf-sandbox/)
- El paper de Cedar (arXiv:2403.04651) modela el lenguaje en Lean. Afirma que Cedar "performs far better" que OpenFGA y Rego, pero el resumen no da cifras — [arXiv](https://arxiv.org/abs/2403.04651)
- cedar-policy/cedar-for-agents: Apache-2.0, 56★, activo. Genera esquemas Cedar y solicitudes de autorización a partir de descripciones de herramientas MCP, con bindings WASM publicados como `@cedar-policy/mcp-schema-generator-wasm` — [cedar-for-agents](https://github.com/cedar-policy/cedar-for-agents)

**OPA**
- open-policy-agent/opa tiene 12,4k★, es Apache-2.0 y está activo. Es un proyecto graduado de la CNCF (2021) — [opa](https://github.com/open-policy-agent/opa); [Cloud Native Now](https://cloudnativenow.com/features/apple-buys-styra-brains-opa-remains-open/)
- En ago-2025, mantenedores clave y personal de Styra se fueron a Apple. OPA sigue bajo la CNCF y los productos comerciales de Styra (EOPA, Regal, etc.) se liberan como open source. Hay versiones contradictorias sobre el futuro de Styra como empresa — [Cloud Native Now](https://cloudnativenow.com/features/apple-buys-styra-brains-opa-remains-open/); [heise](https://heise.de/-10574287)
- `@open-policy-agent/opa-wasm` está en 1.10.0 y su última publicación es del 2024-11-08; el repo npm-opa-wasm tuvo su último push el 2026-07-10 — [npm](https://registry.npmjs.org/@open-policy-agent/opa-wasm); [repo](https://github.com/open-policy-agent/npm-opa-wasm)

**Casbin**
- node-casbin ahora vive en `apache/casbin-node-casbin`: 2.923★, Apache-2.0, push del 20-oct-2026. npm `casbin` está en 5.51.1 (2026-06-25) — [apache/casbin-node-casbin](https://github.com/apache/casbin-node-casbin); [npm](https://registry.npmjs.org/casbin)

**Oso**
- El README dice: "We have deprecated the legacy Oso open source library". El proyecto seguirá dando soporte y corrigiendo errores críticos.
- Último push el 2025-02-26; npm `oso` 0.27.3 es de ene-2024; `oso-cloud` 2.6.0 es el cliente del servicio SaaS.
- Fuentes: [osohq/oso](https://github.com/osohq/oso); [npm oso-cloud](https://registry.npmjs.org/oso-cloud)

**Servidores de autorización y otros**
- OpenFGA: CNCF Incubating desde el 28-oct-2025, inspirado en Zanzibar. El repo tiene 6,0k★, Apache-2.0. `@openfga/sdk` está en 0.9.7 (2026-08-18) — [CNCF OpenFGA](https://www.cncf.io/projects/openfga/); [repo](https://github.com/openfga/openfga); [npm](https://registry.npmjs.org/@openfga/sdk)
- SpiceDB: 7,2k★, Apache-2.0, activo. `@authzed/authzed-node` está en 1.6.1 (2025-10-06) — [authzed/spicedb](https://github.com/authzed/spicedb); [npm](https://registry.npmjs.org/@authzed/authzed-node)
- Permit.io: el SDK npm `permitio` está en 2.7.6 (MIT), y el servicio es SaaS con PDP — [npm](https://registry.npmjs.org/permitio)
- Cerbos: `@cerbos/grpc` está en 0.29.1. `@cerbos/embedded` figura deprecado ("Migrate to @cerbos/embedded-client") — [npm @cerbos/embedded](https://registry.npmjs.org/@cerbos/embedded)

### Inferences
- **Encaje de Cedar con Ω.** Cedar en WASM se evalúa en el mismo proceso que el agente o el handler de comandos, con principal = sesión autenticada, action = comando y resource = pedido o marca. Encaja con la regla de que el contexto de autorización sale de la sesión.
- **Política como datos versionados.** Las políticas pueden versionarse como archivos `.cedar` y validarse contra un esquema en CI. Se complementa con el validador de esquemas JSON ya existente (PEN-07).
- **Registro de violaciones en T12.** Es plausible registrar en T12 la decisión y las políticas determinantes, aunque falta verificar la API exacta de diagnósticos de cedar-wasm.
- **Capas complementarias.** El aislamiento por `brand_id` (R01) ya lo garantiza la RLS de Postgres. La compuerta Ω es una segunda capa en la aplicación, no un reemplazo: reglas como "el agente solo actúa sobre la marca de la sesión" o "los botones de Telegram se validan contra chat, marca y pedido" son ABAC simple y caben en Cedar o en TS puro.
- **Descartes por arquitectura.** OpenFGA y SpiceDB (ReBAC con servidor) añaden un servicio y latencia de red sin que haya un grafo de relaciones complejo que lo justifique. OPA-wasm en JS parece estancado en npm (2024). Oso OSS está deprecado.
- **Opción mínima.** Una función TS pura con tablas de comandos permitidos por rol es la más barata y la más rápida. Pierde el análisis formal de Cedar y la separación entre política y código.

### Gaps
- No obtuve cifras de latencia de `cedar-wasm` en Node: ni μs por decisión ni el costo de inicializar el módulo WASM. El paper no da números en el resumen. Habría que medirlo con un benchmark propio.
- No verifiqué la fecha de la entrada de Casbin en la Apache Software Foundation, ni si es un proyecto incubado o graduado.
- No revisé la licencia ni el modelo de precios de Cerbos Hub o Permit.io en detalle.

## 4. Stack de Telegram: grammY (estado y plugins), webhook en Fastify, límites de tasa e idempotencia, y alternativas

### Takeaway
grammY 1.x está vivo (1.46.0, 26-ago-2026), es MIT y sigue la Bot API al día (10.3). Tiene un adaptador nativo `webhookCallback(bot, "fastify")`, y su guía recomienda `auto-retry` en lugar de throttling artificial. Varios plugins (runner, throttler, auto-retry) no se publican desde 2022–2024; son estables pero poco mantenidos. Telegram reintenta los webhooks que no responden 2XX y reenvía las actualizaciones lentas, así que la deduplicación por `update_id` y el patrón "responder rápido y encolar" son obligatorios. Telegraf no publica desde feb-2024.

### Cited Findings
**grammY y plugins**
- grammY 1.46.0 (Latest, 26-ago) soporta la Bot API 10.3. La cadencia de releases es aproximadamente mensual: 1.45.0 (jul), 1.44.0 (jun), 1.43.0 (may). La página de releases no menciona una v2 — [grammY releases](https://github.com/grammyjs/grammY/releases)
- npm `grammy` 1.46.0 es del 2026-08-26, licencia MIT; el repo tiene 3.783★ y push del 16-oct-2026 — [npm](https://registry.npmjs.org/grammy); [repo](https://github.com/grammyjs/grammY)
- Estado de los plugins en npm, todos MIT — [npm @grammyjs/runner](https://registry.npmjs.org/@grammyjs/runner); [npm @grammyjs/conversations](https://registry.npmjs.org/@grammyjs/conversations); [npm @grammyjs/menu](https://registry.npmjs.org/@grammyjs/menu):

  | Plugin | Versión | Última publicación | Nota |
  |---|---|---|---|
  | `@grammyjs/runner` | 2.0.3 | 2023-03-23 | último push del repo: 2024-09-27 |
  | `@grammyjs/auto-retry` | 2.0.2 | 2024-07-30 | |
  | `@grammyjs/transformer-throttler` | 1.2.1 | 2022-11-13 | |
  | `@grammyjs/ratelimiter` | 1.2.1 | 2024-11-25 | |
  | `@grammyjs/conversations` | 2.1.1 | 2025-11-20 | push del repo: 2026-07-23 |
  | `@grammyjs/menu` | 1.5.0 | 2026-08-27 | |

- **Throttler.** La página del throttler dice "Consider using the auto-retry plugin instead". Avisa que los límites no documentados no se cubren. Sus valores por defecto (sobre Bottleneck) son: global 30 cada 1000 ms, grupos 20 por minuto y chats privados 1 por segundo — [grammY transformer-throttler](https://grammy.dev/plugins/transformer-throttler)
- **Guía de flood de grammY** — [grammY flood](https://grammy.dev/advanced/flood):
  - Ante un 429 hay que esperar `retry_after` y reintentar; `auto-retry` lo automatiza.
  - Conocer los límites exactos es "useless and harmful".
  - Recomienda no más de unas 3 llamadas paralelas al difundir.
  - Con webhooks puede hacer falta una cola, o limitar las esperas de `auto-retry`.

**Límites de Telegram**
- Según la FAQ de Telegram — [Telegram Bots FAQ](https://core.telegram.org/bots/faq):
  - En un mismo chat, "avoid sending more than one message per second".
  - En grupos, 20 mensajes por minuto.
  - En difusión masiva, unos 30 mensajes por segundo.
  - Los "Paid broadcasts" permiten hasta 1000 mensajes por segundo y cobran 0,1 Stars por cada mensaje que pase de 30 por segundo. Requieren 100.000 Stars y 100.000 usuarios activos al mes.
  - **Discrepancia:** la guía de grammY habla de unos 10.000 Stars — [grammY flood](https://grammy.dev/advanced/flood)

**Webhooks**
- Requisitos: puertos 443, 80, 88 u 8443; SSL válido; sin redirecciones — [Telegram Bots FAQ](https://core.telegram.org/bots/faq)
- Según la Bot API — [Telegram Bot API](https://core.telegram.org/bots/api):
  - `update_id` es secuencial y sirve "to ignore repeated updates" con webhooks.
  - Si la respuesta no es 2XY, Telegram reintenta y se rinde "after a reasonable amount of attempts".
  - `secret_token` (1–256 caracteres) llega en el header `X-Telegram-Bot-Api-Secret-Token`.
  - `max_connections` vale 40 por defecto (rango 1–100).
  - Las actualizaciones se guardan como máximo 24 h.
  - Versión vigente: Bot API 10.3, del 24-ago-2026.
- **Adaptador de grammY** — [grammY deployment types](https://grammy.dev/guide/deployment-types):
  - `webhookCallback(bot, "fastify")` es un adaptador listado.
  - Tiene un timeout interno de 10 s que por defecto lanza un error ("throw"); la alternativa es "return".
  - Si el handler es lento, Telegram reenvía la actualización y se procesan duplicados.
  - Recomienda encolar las tareas largas (cola persistente) y terminar el middleware de inmediato.

**Telegraf**
- Telegraf 4.16.3 es del 2024-02-29 y sigue siendo el último publicado. El repo tiene 9.202★ y push del 24-sep-2026 — [npm telegraf](https://registry.npmjs.org/telegraf); [repo](https://github.com/telegraf/telegraf)
- La comparación escrita por el equipo de grammY, que admite su sesgo, dice que Telegraf "often lags behind by a few versions" de la Bot API y que sus tipos son difíciles — [grammY comparison](https://grammy.dev/resources/comparison)

### Inferences
- **Flujo de entrada recomendable.** Ruta Fastify con `webhookCallback(bot, "fastify", { secretToken })`. El handler solo hace tres cosas:
  1. Valida el header secreto.
  2. Inserta `update_id` con una restricción única en Postgres, o `SET NX` con TTL de unas 24 h en Upstash Redis, alineado con la retención de 24 h de Telegram.
  3. Encola un job en pg-boss y responde 200.

  Así se evitan los reenvíos por lentitud y se alimentan T05/T06 (perdidos y duplicados descartados).
- **Flujo de salida.** Un worker con `auto-retry` y límite de espera. El límite de 1 mensaje por segundo por chat rara vez se alcanza en notificaciones de pedidos. El de 30 por segundo global importa solo en difusiones; con ráfagas de muchas marcas, una cola por chat en pg-boss (`singletonKey`/throttle) evita los 429 sin usar el throttler.
- **T15 (fallos de entrega a Telegram).** Puede contarse a partir de los errores definitivos: reintentos agotados, 403 por bot bloqueado y 400 por chat inexistente.
- **Botones inline.** `callback_data` debería ser un id opaco, o firmado con HMAC, que referencie un registro del servidor. Al recibir el callback se revalidan `chat_id` ↔ marca ↔ pedido ↔ estado permitido mediante la compuerta Ω (R-reglas). Así se registran las transiciones inválidas (T07) aunque el botón sea viejo.
- **Plugins.** `conversations` 2.x sirve para el flujo de dos pasos del cambio de llave de pago (R10), aunque una máquina de estados propia persistida en Postgres puede ser más auditable. `runner` no hace falta con webhooks. La baja actividad de runner, throttler y auto-retry sugiere evitar acoplarse a ellos más allá de `auto-retry`, que es pequeño.
- **Por qué grammY y no Telegraf.** grammY tiene releases activos alineados con la Bot API 10.x, tipos TS y adaptador Fastify nativo. Telegraf no publica desde hace unos 2,5 años.

### Gaps
- No confirmé el límite de 64 bytes de `callback_data` en la versión 10.3 de la Bot API (no leí esa sección).
- No hallé el número exacto de reintentos de webhook de Telegram ni su backoff (la documentación dice "reasonable amount").
- No verifiqué la compatibilidad de `@grammyjs/auto-retry` 2.0.2 con grammY 1.46 más allá de que se use en la documentación actual.

## 5. Inyección de instrucciones y separación datos/instrucciones para agentes que leen contenido de marcas

### Takeaway
El consenso de 2025–2026 es que la inyección indirecta no está resuelta y que filtrar no basta: hay que diseñar el sistema para que el contenido no confiable no pueda disparar acciones consecuentes. Eso se logra combinando cuatro piezas:

- patrones arquitectónicos: CaMeL, Dual LLM, Action-Selector o Plan-Then-Execute, y la "Rule of Two" de Meta;
- mínimo privilegio y aprobación humana;
- marcado del contenido: `tool_result` + JSON en la guía de Anthropic, o spotlighting;
- un clasificador barato (Haiku) sobre la salida de las herramientas.

Las librerías open source de guardrails se debilitaron: LLM Guard y Rebuff están archivados, y Lakera fue absorbida por Check Point.

### Cited Findings
**Guía de Anthropic** — [Anthropic: Mitigate jailbreaks and prompt injections](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks)
- Distingue dos amenazas: (a) jailbreak o inyección directa, donde el usuario es el adversario; (b) inyección indirecta, donde el usuario es confiable pero Claude procesa contenido de terceros.
- Para la inyección indirecta recomienda:
  - Poner el contenido no confiable solo en bloques `tool_result`, nunca en `system`.
  - Describir su origen.
  - Declarar en el system prompt que ese contenido es dato y no instrucción.
  - Codificarlo como JSON.
  - No poner instrucciones propias dentro de `tool_result`.
  - Aplicar mínimo privilegio.
  - Filtrar las salidas de herramientas con una llamada a Claude Haiku 5.5 con salida estructurada (`injection_suspected`), tratando `stop_reason: "refusal"` como veredicto dañino.
  - Hacer red-team propio y monitoreo continuo.

**Investigación de Anthropic** — [Anthropic research (24-nov-2025)](https://www.anthropic.com/research/prompt-injection-defenses)
- Las defensas para agentes de navegador combinan entrenamiento con RL, clasificadores sobre el contenido no confiable y red-teaming humano.
- La tasa de éxito de ataques con salvaguardas mejoradas cayó, por ejemplo, a 1,4 % en Opus 4.5 y 2,4 % en Haiku 4.5. Anthropic advierte que incluso un 1 % "still represents meaningful risk".

**Patrones arquitectónicos**
- **CaMeL** (arXiv:2503.18813, Google, Google DeepMind y ETH Zürich, mar-2025) — [arXiv](https://arxiv.org/pdf/2503.18813):
  - Extrae el flujo de control y de datos de la consulta confiable, de modo que los datos no confiables no alteran la ejecución.
  - Usa *capabilities* para aplicar políticas en las llamadas a herramientas y un intérprete propio que rastrea la procedencia.
  - Resuelve el 77 % de las tareas de AgentDojo con seguridad demostrable, contra un 84 % sin defensa. Una reseña de terceros cita 67 %, en conflicto con el paper.
  - El código (google-research/camel-prompt-injection) es Python, Apache-2.0, 409★, con último push el 2025-06-20 — [repo](https://github.com/google-research/camel-prompt-injection)
- **Design Patterns for Securing LLM Agents against Prompt Injections** (arXiv:2506.08837, Beurer-Kellner, Tramèr, Debenedetti et al., jun-2025) propone seis patrones. El principio común: tras ingerir entrada no confiable, debe ser "impossible for that input to trigger any consequential actions" — [arXiv](https://arxiv.org/abs/2506.08837); [HTML](https://arxiv.org/html/2506.08837v3)

  | Patrón | Mecanismo y garantía |
  |---|---|
  | Action-Selector | El LLM solo elige entre acciones predefinidas y sus salidas no vuelven al agente. |
  | Plan-Then-Execute | El plan se fija antes de leer datos; aun así, los argumentos pueden ser alterados. |
  | LLM Map-Reduce | Sub-LLMs aislados, uno por ítem. |
  | Dual LLM | Un LLM privilegiado sin datos no confiables y uno en cuarentena sin herramientas, unidos por variables simbólicas. |
  | Code-Then-Execute | El LLM escribe un programa que luego corre sobre los datos. |
  | Context-Minimization | Se elimina el prompt original del contexto antes de la salida final. |

- **Spotlighting** (Hines et al., Microsoft, arXiv:2403.14720, mar-2024) bajó la tasa de éxito de ataques de más del 50 % a menos del 2 % en GPT — [arXiv](https://arxiv.org/abs/2403.14720); [HTML](https://arxiv.org/html/2403.14720):
  - **Delimitado:** reduce la tasa a la mitad, pero no se recomienda porque el atacante puede imitar los delimitadores.
  - **Datamarking:** intercala un marcador en lugar de los espacios y baja la tasa al 3,1 % en resumen y al 8 % en preguntas y respuestas, sin pérdida de desempeño.
  - **Codificación (base64):** baja la tasa a 0–1,8 %, pero requiere modelos capaces.
- **OWASP LLM01:2025** distingue inyección directa e indirecta y reconoce que puede no haber prevención infalible. Sus mitigaciones: restringir el comportamiento, validar formatos de salida de forma determinista, filtrar entrada y salida, mínimo privilegio (funciones privilegiadas en código, no en el modelo), aprobación humana para acciones de alto riesgo, segregar y etiquetar el contenido externo, y pruebas adversariales — [OWASP LLM01:2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- **"Agents Rule of Two"** de Meta (31-oct-2025): en una sesión, un agente debe tener como máximo dos de estas tres propiedades. Si necesita las tres, requiere supervisión, por ejemplo aprobación humana — [Meta AI](https://ai.meta.com/blog/practical-ai-agent-security/):
  - [A] procesa entradas no confiables;
  - [B] accede a sistemas o datos sensibles;
  - [C] cambia estado o se comunica hacia afuera.

**Librerías de guardrails**
- protectai/llm-guard está archivado (API de GitHub: `archived: true`, último push el 2026-07-08). Fuentes secundarias dicen que dejó de mantenerse en jul-2026 sin explicación — [repo](https://github.com/protectai/llm-guard); [Grepture](https://grepture.com/blog/llm-guard-archived-migration-guide)
- protectai/rebuff está archivado, con último push el 2024-08-07 — [repo](https://github.com/protectai/rebuff)
- Check Point anunció en sep-2025 la adquisición de Lakera (Lakera Guard). El benchmark lakeraai/pint-benchmark está archivado — [Check Point](https://blog.checkpoint.com/security/check-point-to-acquire-lakera-redefining-security-for-the-ai-era/); [pint-benchmark](https://github.com/lakeraai/pint-benchmark)
- meta-llama/PurpleLlama sigue activo (4,4k★, push del 12-oct-2026), con licencia "NOASSERTION" según la API de GitHub — [repo](https://github.com/meta-llama/PurpleLlama)
- promptfoo (MIT) ofrece red-teaming automatizado; ver la sección 2 — [promptfoo](https://github.com/promptfoo/promptfoo)

### Inferences
- **Mapeo a la Rule of Two.** Un agente que lee contenido de marcas (A), ve datos de compradores (B) y cambia el estado de pedidos o pagos (C) reúne las tres propiedades. El diseño ya aprobado rompe la tríada:
  - Las herramientas prohibidas no existen.
  - Ω evalúa cada comando en código, con la sesión como fuente de autorización.
  - La marca confirma por botón de Telegram, lo que funciona como aprobación humana.

  Encaja con Action-Selector o Plan-Then-Execute: el LLM elige entre un conjunto cerrado de comandos tipados y Ω valida sus argumentos de forma determinista.
- **Contenido de marcas en el contexto.** Debe entrar siempre como `tool_result` con JSON escapado y metadatos de origen (`source: "brand_catalog"`, `brand_id`), nunca en el system prompt. Es exactamente la regla aprobada: "contenido de marca = dato".
- **Cuarentena para texto libre.** Para resúmenes de catálogo o descripciones largas puede usarse un "LLM en cuarentena" (Haiku sin herramientas) que devuelva campos estructurados validados, al estilo Dual LLM o Map-Reduce.
- **Doble uso del filtro con Haiku.** El filtro de inyección con Haiku 5.5 sobre las salidas de herramientas que recomienda Anthropic sirve también como la "segunda auditoría IA" de N6. Cada `injection_suspected = true` o rechazo de Ω se registra en T12.
- **Dónde invertir.** Con LLM Guard y Rebuff archivados y Lakera ahora comercial dentro de Check Point, lo más barato y sostenible es:
  - arquitectura determinista: Ω, herramientas mínimas y validación de esquemas;
  - el clasificador Haiku;
  - una suite de red-team en promptfoo con fichas de marca maliciosas, ejecutada en CI.
- **CaMeL.** Es una referencia de diseño, no una librería de producción: es Python, prototipo de investigación y sin actividad desde jun-2025.

### Gaps
- No encontré guías de Anthropic de 2026 específicas para agentes LangGraph.js, ni métricas de éxito de ataques publicadas para Haiku 5.5 o Sonnet 5.5 contra inyección indirecta. Las cifras primarias halladas son de la generación 4.5 (nov-2025).
- No verifiqué el contenido actual de PurpleLlama (LlamaFirewall, Prompt Guard 2), su licencia exacta ni si tiene binding JS.
- No confirmé si se cerró la compra de Lakera por Check Point.
- La adquisición de Protect AI por Palo Alto Networks (jul-2025) solo aparece en fuentes secundarias.
