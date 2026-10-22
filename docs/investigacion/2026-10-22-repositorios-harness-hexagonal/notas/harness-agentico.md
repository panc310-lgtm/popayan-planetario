# Harness agéntico de vanguardia (2025–2026) y repositorios TypeScript de base o referencia para Popayán Planetario

> Nota de investigación, 22-oct-2026. Solo investigación: presenta opciones, compromisos y riesgos; no decide nada.
>
> - **Datos de repositorios y paquetes**: GitHub (`gh api repos/...`), npm (`npm view`) y `api.npmjs.org` (descargas de la última semana), consultados el 22-oct-2026. Las estrellas y versiones son las que devolvió la API ese día, no valores de memoria.
> - **Contexto del proyecto**: el mapeo de la sección 2 se hace contra [ADR-0002](../../docs/adr/ADR-0002-arquitectura-multiagente.md), porque el repositorio todavía no tiene código de paquetes; solo hay un `package.json` raíz.
> - **Citas**: las fuentes se parafrasean; solo hay una cita textual breve.

## 1. ¿Qué dicen las fuentes primarias que es un harness y cuáles son sus partes?

### Takeaway
Entre 2025 y 2026 la industria convergió en la fórmula **Agente = Modelo + Harness**. El harness es todo lo que no es el modelo:

- **Funciones**: bucle, herramientas y sus permisos, ganchos o middleware, gestión de contexto (compactación, descarga a archivos, carga progresiva), memoria, subagentes, puntos de control durables, aprobación humana, sandbox y verificación.

No hay una lista canónica única, pero sí patrones repetidos:

- código determinista que controla el flujo y deja al modelo solo el juicio;
- contexto mínimo, de alta señal y estable para la caché;
- herramientas pocas, consolidadas y bien descritas;
- verificación externa al modelo.

### Cited Findings

**Definición**
- LangChain define el harness como todo el código, la configuración y la lógica de ejecución que no son el modelo, con la fórmula *Agent = Model + Harness* (Vivek Trivedy, 10-mar-2026) — [LangChain, The Anatomy of an Agent Harness](https://langchain.com/blog/the-anatomy-of-an-agent-harness)
- LangChain separa tres capas (Sydney Runkle, 6-ago-2026) — [LangChain, Deep Agents vs LangChain vs LangGraph](https://langchain.com/blog/deep-agents-vs-langchain-vs-langgraph):
  - **LangGraph** es el *runtime*: máximo control, mínima abstracción.
  - **LangChain** es el *framework*.
  - **Deep Agents** es el *harness* listo para usar.
  - Recomienda LangGraph directo cuando el agente no encaja en un bucle estándar o hay que mezclar pasos deterministas y agénticos. Su ejemplo: una solicitud de arriendo donde solo la extracción de documentos usa LLM y aprobar, rechazar o escalar es código fijo.
- Anthropic presenta el Claude Agent SDK como un harness de propósito general: maneja uso de herramientas, recolección de contexto, planificación y ejecución. No da una definición formal del término (26-nov-2025) — [Anthropic, Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic describe los *dynamic workflows* de Claude Code como Claude escribiendo su propio harness a la medida de cada tarea (Thariq Shihipar y Sid Bidasaria, 2-jun-2026) — [Anthropic/Claude blog, A harness for every task](https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/)
  - Cada workflow es un script JS con `agent()`, `parallel()` y `pipeline()`, con esquema JSON por subagente, aislamiento por *worktree* y reanudación tras interrupción.
  - Principio central: el bucle determinista lleva la estructura (por ejemplo, el cuadro de un torneo) y cada juicio es un agente nuevo.
- La documentación de Claude Code distingue cuatro opciones — [Claude Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview):
  - **Agent SDK**: biblioteca que ejecuta el binario de Claude Code, con sus herramientas, permisos, sesiones y hooks.
  - **Client SDK**: el bucle lo escribe uno, o lo maneja el *tool runner* beta.
  - **Managed Agents**: harness alojado por Anthropic, con sandbox gestionado o propio.
  - **CLI**: la interfaz de terminal, para uso interactivo.
- OpenAI, "Harness engineering: leveraging Codex in an agent-first world" (Ryan Lopopolo, 11-feb-2026) — [OpenAI](https://openai.com/index/harness-engineering). **No verificado directamente**: la página devolvió 403 y el contenido viene del extracto de búsqueda y de cobertura secundaria.
  - Cuenta un experimento de cinco meses: un producto beta interno sin código escrito a mano, construido en aproximadamente una décima parte del tiempo. Su lema: "Humans steer. Agents execute."
  - La cobertura secundaria dice que se apoya en documentación legible por máquina, telemetría, pruebas estructurales y reglas de arquitectura por capas — [Let's Data Science](https://letsdatascience.com/news/openai-introduces-harness-engineering-for-automated-developm-703d90b6)
- Un preprint de arXiv propone condiciones necesarias y suficientes para llamar "harness" a algo y las aplica a Claude Code, Codex CLI, Aider, Cline, OpenHands y SWE-agent (8-jun-2026, autor único, sin revisión por pares) — [arXiv 2606.10106](https://arxiv.org/abs/2606.10106)
  - El resumen de búsqueda le atribuye cuatro elementos necesarios: bucle, herramientas, contexto y control. La página del resumen no los lista, así que esto no está verificado.

**Componentes que listan las fuentes**
- LangChain enumera 12 primitivas — [LangChain, Anatomy](https://langchain.com/blog/the-anatomy-of-an-agent-harness):
  1. prompts de sistema;
  2. herramientas, skills y servidores MCP;
  3. sistema de archivos (durabilidad, descarga de contexto, espacio compartido; git para versionar);
  4. bash y ejecución de código;
  5. sandbox (listas de comandos permitidos, aislamiento de red);
  6. memoria y búsqueda (AGENTS.md inyectado al iniciar);
  7. gestión de contexto (compactación; descarga de salidas largas guardando cabeza y cola; skills para evitar el *context rot*);
  8. subagentes y orquestación (traspasos, enrutamiento de modelos);
  9. planificación;
  10. bucles de verificación;
  11. hooks y middleware (compactación, continuación, lint);
  12. ejecución de largo horizonte (*Ralph Loops*).
  - Ese post no menciona la aprobación humana (HITL).
- Deep Agents es el agente base de LangChain más un conjunto de middleware; sus piezas son sistema de archivos, subagentes, skills, memoria y compactación — [LangChain, Deep Agents vs LangChain vs LangGraph](https://langchain.com/blog/deep-agents-vs-langchain-vs-langgraph)
- El middleware incorporado de LangChain JS — [LangChain JS, Built-in middleware](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in):
  - **Agnóstico del proveedor**:
    - reintentos de herramienta y de modelo con backoff exponencial;
    - modelo de respaldo;
    - resumen de historial;
    - human-in-the-loop (aprobar, editar o rechazar llamadas a herramientas);
    - límite de llamadas al modelo por ejecución o hilo, y límite de llamadas a herramientas;
    - detección de datos personales (redactar, enmascarar, hashear o bloquear);
    - lista de tareas;
    - selector de herramientas con LLM y búsqueda de herramientas del proveedor;
    - sistema de archivos y subagentes;
    - edición de contexto (borrar salidas viejas de herramientas);
    - emulador de herramientas para pruebas.
  - **Específico de Anthropic**: caché de prompts, bash, editor de texto, memoria y búsqueda de archivos.
- Los ganchos de middleware de LangChain JS son `beforeAgent`, `beforeModel` (puede saltar a `end`), `afterModel`, `afterAgent`, `wrapModelCall` (cortocircuito, reintento, cambiar modelo o herramientas) y `wrapToolCall` — [LangChain JS, Custom middleware](https://docs.langchain.com/oss/javascript/langchain/middleware/custom)
- El Agent SDK de Claude ofrece herramientas incorporadas, hooks, subagentes, MCP, permisos, sesiones (reanudar y bifurcar), skills, comandos, memoria y plugins — [Claude Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)
- El SDK de agentes de OpenAI para JS tiene estas primitivas — [OpenAI Agents SDK JS](https://openai.github.io/openai-agents-js/):
  - `Agent`, herramientas, `handoff`;
  - guardrails de entrada, salida y herramienta, con *tripwires*;
  - HITL (`RunToolApprovalItem`, `RunState`);
  - sesiones, tracing con procesadores y exportadores;
  - MCP (stdio, SSE, Streamable HTTP), realtime y voz, agentes en sandbox;
  - `ModelProvider`, más una extensión de integración con AI SDK.

**Patrones de diseño (gestión de contexto)**
- Anthropic trata el contexto como un recurso finito con rendimientos marginales decrecientes y propone buscar el conjunto más pequeño de tokens de alta señal (29-sep-2025). Técnicas — [Anthropic, Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents):
  - recuperación justo a tiempo (referencias ligeras más herramientas);
  - compactación (afinar primero para *recall*, luego para precisión);
  - borrar resultados viejos de herramientas, la forma más ligera de compactación;
  - notas estructuradas fuera del contexto (por ejemplo, NOTES.md);
  - subagentes con contexto limpio que devuelven resúmenes.
- Para tareas largas, Anthropic usa un agente inicializador más agentes de trabajo — [Anthropic, Effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents):
  - el inicializador crea un `init.sh`, un archivo de progreso y un commit inicial;
  - una lista de más de 200 funcionalidades en JSON (el modelo la sobrescribe menos que un Markdown), donde los agentes solo cambian el campo `passes`;
  - pruebas de extremo a extremo con navegador;
  - el post reconoce que la compactación no siempre transmite instrucciones claras al siguiente agente.
- Manus (Yichao "Peak" Ji, 18-jul-2025) — [Manus, Context Engineering for AI Agents](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus):
  - **La tasa de aciertos de la caché KV es la métrica más importante en producción.** Relación entrada:salida de ~100:1; con Claude Sonnet, la entrada en caché costaba US$0,30/MTok frente a US$3 sin caché.
  - **Prefijo estable**: un timestamp al inicio del prompt invalida la caché.
  - **Contexto solo de agregar**, con serialización JSON determinista.
  - **Enmascarar herramientas en vez de quitarlas**: una máquina de estados restringe logits sin cambiar las definiciones, con prefijos de nombre por grupo como `browser_` o `shell_`.
  - **Sistema de archivos como memoria**, con compresión restaurable.
  - **Recitación** con todo.md.
  - **Dejar los errores en el contexto.**
  - **Variar las plantillas** para evitar que el modelo imite ejemplos repetidos.
- Cognition (Walden Yan, 12-jun-2025) — [Cognition, Don't Build Multi-Agents](https://cognition.com/blog/dont-build-multi-agents):
  - Compartir el contexto completo, incluidas las trazas, y no solo mensajes sueltos.
  - Cada acción lleva decisiones implícitas; agentes en paralelo con supuestos distintos producen resultados contradictorios.
  - La arquitectura más simple y confiable es un agente lineal de un solo hilo.
- Los workflows dinámicos de Anthropic justifican los subagentes por tres fallas de un solo contexto: *agentic laziness*, *self-preferential bias* y *goal drift* por la compactación — [Anthropic/Claude blog, A harness for every task](https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/)
  - **Patrones**: clasificar y actuar, abanico y síntesis, verificación adversarial, generar y filtrar, torneo, y repetir hasta terminar.
  - **"Cuarentena"**: los agentes que leen contenido no confiable no reciben herramientas de alto privilegio.
  - La paralelización y la especialización tienen que justificar su costo de coordinación.
- Diseño de herramientas (11-sep-2025) — [Anthropic, Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents):
  - no envolver cada endpoint, porque más herramientas no siempre dan mejores resultados;
  - consolidar operaciones y usar espacios de nombres;
  - devolver contexto legible, con opción concisa o detallada;
  - paginar y truncar con mensajes que orienten el siguiente paso;
  - describir las herramientas como para un compañero nuevo;
  - iterar con evaluaciones realistas y lectura de transcripciones.
- Anthropic, "Building effective agents" (19-dic-2024) — [Anthropic](https://www.anthropic.com/engineering/building-effective-agents). **No re-verificado en esta sesión** (es la referencia clásica, citada de memoria).
  - Distingue *workflows* (rutas de código predefinidas) de *agentes* (el modelo dirige su proceso).
  - Patrones: encadenamiento, enrutamiento, paralelización, orquestador-trabajadores y evaluador-optimizador.

### Inferences
- **El concepto pasó de "framework" a "harness"** en 2026. Las tres grandes casas (Anthropic, OpenAI, LangChain) lo usan como nombre de producto; AI SDK incluso ejecuta harnesses de terceros como agentes (ver sección 3).
- **El patrón de Popayán ya está validado**: "el código controla el flujo, el modelo juzga" ([Anthropic workflows](https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/); [LangChain runtime vs harness](https://langchain.com/blog/deep-agents-vs-langchain-vs-langgraph)) coincide con "el agente propone, el dominio decide". LangChain da como caso de uso de LangGraph directo justamente un flujo con decisiones de negocio en código fijo.
- **Taxonomía de trabajo para el resto de la nota** (síntesis propia de las fuentes anteriores):
  - **Núcleo**: bucle, registro de herramientas y permisos, contexto, control y estado.
  - **Confiabilidad**: puntos de control durables, HITL, reintentos y modelo de respaldo, idempotencia.
  - **Seguridad**: compuerta de política, guardrails, cuarentena del contenido no confiable, sandbox.
  - **Operación**: observabilidad, evaluaciones, costo y throughput.
- **Mucho de lo que las fuentes llaman harness no aplica a Popayán.** Bash, sistema de archivos, sandbox de código y *Ralph Loops* son propios de agentes de código de largo horizonte. Popayán es un agente conversacional transaccional de turnos cortos; su harness se parece más a un "runtime con compuertas" que a Deep Agents.

### Gaps
- No pude leer el texto primario del post de OpenAI (403). Las afirmaciones sobre AGENTS.md como "mapa", linters estructurales y limpieza de entropía dependen de cobertura secundaria y quedan sin verificar.
- No encontré una definición canónica normativa (estándar o especificación) de "agent harness". El preprint de arXiv es de un solo autor y no pude leer sus condiciones.

## 2. ¿Cómo se mapea cada componente del harness sobre la arquitectura de Popayán Planetario (qué tiene y qué falta)?

### Takeaway
Popayán ya tiene, por diseño, varios componentes de harness más estrictos que los de los harnesses genéricos:

- autorización puesta por el servidor;
- herramientas prohibidas que no existen;
- compuerta Ω en código;
- aprobación humana donde la persona ejecuta el comando;
- historial solo de agregar;
- idempotencia por llamada.

Lo que falta o queda solo implícito es la "capa de operación del harness":

- un registro de herramientas con metadatos explícitos;
- ganchos pre y post de modelo y herramienta como bus formal;
- un tope duro de llamadas por turno (hoy solo se mide);
- una política de compactación;
- pre-calentar la caché;
- trazas estandarizadas con visor;
- guardrails de salida;
- un plan de MCP.

### Cited Findings
Mapa componente por componente. El "estado en Popayán" sale de ADR-0002; la referencia de vanguardia, de las fuentes citadas.

| Componente de harness | Estado en Popayán (ADR-0002) | Referencia de vanguardia | Brecha u observación |
|---|---|---|---|
| Bucle del agente | Dos `StateGraph`: `flujo_usuario` y `flujo_landing`. Enrutamiento sin modelo cuando la UI ya trae la intención. Presupuesto de 1,5 llamadas por turno, **medido** | `ToolLoopAgent` con `stopWhen`/`prepareStep` ([AI SDK](https://ai-sdk.dev/docs/agents/overview)); límite de llamadas por ejecución o hilo ([LangChain middleware](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in)) | Falta un **tope duro** por turno, no solo la medición |
| Registro de herramientas | Correspondencia 1:1 con casos de uso del dominio; esquema JSON `strict: true` validado con Ajv en `packages/contracts`; prueba estática en CI | Pocas herramientas consolidadas, con espacio de nombres y respuesta concisa o detallada ([Anthropic tools](https://www.anthropic.com/engineering/writing-tools-for-agents)) | Faltan metadatos por herramienta: consulta o comando, nivel de riesgo, requiere aprobación, clave de idempotencia, presupuesto de tokens de respuesta |
| Permisos y compuerta | Contexto de autorización puesto por el servidor; herramientas prohibidas inexistentes; compuerta Ω antes de cada comando con registro de violaciones (T12) | Agent SDK: hooks primero; luego reglas deny, ask, modo y allow; luego `canUseTool`. Un deny de `PreToolUse` aplica incluso en `bypassPermissions`, y un deny por nombre saca la herramienta del contexto del modelo ([permisos del Agent SDK](https://code.claude.com/docs/en/agent-sdk/permissions)) | Equivalente o más fuerte. Ω cumple el papel de `PreToolUse`; "no existe" equivale a deny por nombre |
| Hooks y middleware | Implícitos: Ω, telemetría y metadatos de actor en `appendCanonicalEvent` | `beforeModel`, `afterModel`, `wrapModelCall`, `wrapToolCall` ([LangChain custom middleware](https://docs.langchain.com/oss/javascript/langchain/middleware/custom)); hooks del Agent SDK | No hay un **bus de ganchos** formal para costo, redacción de datos personales, trazas y reintentos alrededor de `@anthropic-ai/sdk` |
| Subagentes | Agentes especializados por enrutador; sin creación dinámica | Subagentes con contexto aislado ([Anthropic contexto](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)); advertencia de [Cognition](https://cognition.com/blog/dont-build-multi-agents) | Coherente con "un solo hilo por conversación" |
| Gestión de contexto | Divulgación progresiva; prefijo estable en caché (contrato y herramientas); perfil de menos de 800 tokens; últimos turnos; historial solo de agregar | Compactación, borrado de salidas de herramientas, recitación ([Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents); [Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)) | Falta la **política de ventana**: qué pasa al llegar a N turnos dentro de las 24 h (resumen o recorte) sin romper la caché ni el "solo agregar" |
| Memoria | Memoria de negocio en el dominio ("Mi universo", perfil). El estado conversacional no guarda hechos de negocio | Memoria en archivos o Store entre hilos ([LangGraph persistencia](https://docs.langchain.com/oss/javascript/langgraph/durable-execution)) | No falta: la decisión de que la memoria sea del dominio es más segura. No se usa el `Store` de LangGraph |
| Puntos de control durables | `PostgresSaver` en el esquema `agentes`; TTL de 24 h; ~4 puntos por turno; respaldo con `BaseCheckpointSaver` propio sobre Upstash | Checkpointer más `thread_id` = ejecución durable; `thread_id` de menos de 255 caracteres; podar puntos viejos ([LangGraph](https://docs.langchain.com/oss/javascript/langgraph/durable-execution)) | Cubierto. Riesgo de carga en D1 (~1.280 operaciones/s en el pico, según ADR-0002) |
| Aprobación humana | `interrupt()` más `Command({resume})`; **la persona ejecuta el comando** desde la UI con su sesión; nodo idempotente; valor de reanudación validado con esquema | Reglas de `interrupt`: el nodo se reinicia desde el principio; coincidencia por índice; payload serializable; no envolver en try/catch ([LangGraph interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)). OpenAI advierte que restaurar un snapshot no lo autentica ([OpenAI HITL](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/)) | Cubierto y más estricto que el estándar. Conviene adoptar la regla de **orden fijo de interrupciones** y la verificación de propiedad del hilo al reanudar |
| Sandbox | No hay ejecución de código ni shell; contenedor por servicio | Sandbox con lista de comandos permitidos y aislamiento de red ([LangChain](https://langchain.com/blog/the-anatomy-of-an-agent-harness)) | No aplica: no existen herramientas de código |
| MCP | No decidido | SDK TS v2 (Apache-2.0); especificación 2026-07-28 sin estado ([MCP seguridad](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)) | Opcional y post-MVP (ver sección 4) |
| Observabilidad | T03 latencia, T17 costo por conversación, T12 violaciones; nuevas: llamadas por turno, rechazos, degradaciones | Tracing con spans y exportadores ([OpenAI SDK](https://openai.github.io/openai-agents-js/)); lectura de transcripciones ([Anthropic tools](https://www.anthropic.com/engineering/writing-tools-for-agents)); tasa de aciertos de caché como métrica principal ([Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)) | Falta la **tasa de aciertos de caché** como métrica de primer nivel y un visor de trazas por turno |
| Evaluaciones | Batería adversarial (pagar, confirmar, otra marca, inyección, repetición); evaluaciones por agente en español de Popayán | Desarrollo guiado por evaluaciones con conjuntos reservados ([Anthropic tools](https://www.anthropic.com/engineering/writing-tools-for-agents)) | Cubierto en diseño; falta elegir la herramienta (ver sección 3) |
| Guardrails | Ω, esquemas estrictos, contenido de terceros como dato, búsqueda clásica ante un rechazo | Guardrails de entrada, salida y herramienta con tripwire ([OpenAI SDK](https://openai.github.io/openai-agents-js/)); detección de datos personales ([LangChain](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in)); cuarentena ([Anthropic](https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/)) | Faltan **guardrails de salida**: validar que marcas, productos y precios mencionados existan en el resultado de la herramienta, y redactar datos personales |
| Verificación | Guardián de marca más verificador de evidencia (landing, fase 2) | Verificación adversarial y agentes escépticos ([Anthropic](https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/)) | Cubierto para landing |
| Control de flujo y degradación | Candado por conversación en Upstash; semáforo por instancia; límite por usuario; guardián global que lee los encabezados de límite y degrada a búsqueda clásica | Reintentos con backoff, modelo de respaldo ([LangChain](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in)); encabezados `anthropic-ratelimit-*` y `retry-after` ([Anthropic rate limits](https://platform.claude.com/docs/en/api/rate-limits)) | Cubierto. Ver sección 5 para límites concretos |
| Harness para construir el sistema (estilo OpenAI) | Esquemas JSON y validador estructural de la arquitectura (PEN-07, commit `088e21e`); vista del grafo | Reglas de capas con pruebas estructurales ([OpenAI, no verificado](https://openai.com/index/harness-engineering)) | No hay AGENTS.md ni CLAUDE.md en la raíz, ni reglas automáticas de dependencias entre paquetes (el repo aún no tiene paquetes) |

### Inferences
- **"Que todo el sistema parezca un harness"** tiene dos lecturas:
  1. **Harness de ejecución** (agentes en producción). Ya está en ~80 % por ADR-0002; las brechas son operativas, no estructurales.
  2. **Harness de construcción** (el repositorio preparado para que agentes de código lo construyan, al estilo OpenAI). Faltan AGENTS.md, reglas de dependencias verificadas en CI (por ejemplo, que `packages/domain` no importe Fastify, pg ni grammY) y pruebas estructurales. Esto es barato y encaja con el validador PEN-07 que ya existe.
- **Un bus de ganchos propio** (pre-modelo, post-modelo, pre-herramienta = Ω, post-herramienta) alrededor de `@anthropic-ai/sdk` reproduciría los ganchos de LangChain o del Agent SDK sin adoptar su bucle. Reuniría costo, trazas, redacción y reintentos en un solo lugar.
- **Ninguna fuente generalista trata la integración con un event store.** La regla de Popayán de que solo `appendCanonicalEvent` registra hechos y el checkpointer no es una idea propia que separa estado conversacional (efímero) de hechos (canónicos).

### Gaps
- ADR-0002 no especifica un tope duro de llamadas por turno, la política de compactación ni el visor de trazas. Habría que confirmar con el usuario si están en otros documentos (`docs/fuentes`, el kernel).
- No verifiqué si existe una regla de dependencias entre paquetes en CI: el repositorio solo tiene `package.json` raíz.

## 3. ¿Qué repositorios TypeScript sirven de base o de referencia, y cómo encajan con LangGraph.js?

### Takeaway
Ningún framework alternativo justifica reemplazar LangGraph.js antes del 10-dic-2026:

- **Mastra**, **OpenAI Agents JS**, **VoltAgent** y **Google ADK** son pilas completas que se solapan con LangGraph. Sirven como referencia de diseño (HITL, guardrails, tracing).
- **Complementos reales**:
  - el **middleware de LangChain** y **deepagentsjs**, como patrones o subgrafos del mismo ecosistema;
  - el **SDK TS de MCP**, como adaptador futuro;
  - **Langfuse** y **promptfoo**, para trazas y evaluaciones.
- El **Claude Agent SDK** es la referencia de harness más madura, pero no es open source (Términos Comerciales) y ejecuta el binario de Claude Code. No sirve de base para 10.000 sesiones de chat transaccional.
- **Inngest AgentKit** está prácticamente inactivo.

### Cited Findings
Datos de GitHub y npm del 22-oct-2026. "Descargas/sem" es la última semana en npm.

| Repositorio (paquete) | ¿Existe? | Licencia | Última release | Estrellas | Descargas/sem | Madurez | Encaje |
|---|---|---|---|---|---|---|---|
| [langchain-ai/langgraphjs](https://github.com/langchain-ai/langgraphjs) (`@langchain/langgraph`) | Sí | MIT | 1.5.2 (npm, 21-oct-2026) | 3.370 | 2.065.793 | 1.x estable; Node ≥18 | **Ya elegido**. `@langchain/langgraph-checkpoint-postgres` 1.1.2 (MIT, 308.715/sem) |
| [langchain-ai/deepagentsjs](https://github.com/langchain-ai/deepagentsjs) (`deepagents`) | Sí | MIT | 1.15.1 (16-oct-2026) | 1.616 | 219.225 | 1.x | Complemento o referencia (detalle abajo) |
| [langchain-ai/langchainjs](https://github.com/langchain-ai/langchainjs) (`langchain`) | Sí | MIT | 1.5.19 (22-oct-2026) | 18.289 | 1.734.370 | 1.x; Node ≥20 | Complemento: `createAgent` más middleware |
| [anthropics/claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript) (`@anthropic-ai/claude-agent-sdk`) | Sí | **No open source**: todos los derechos reservados por Anthropic; Términos Comerciales | 0.3.308 (22-oct-2026) | 1.830 | 7.328.410 | 0.x con releases casi diarias; el repo solo tiene CHANGELOG, ejemplos y scripts | Referencia, no base |
| [anthropics/anthropic-sdk-typescript](https://github.com/anthropics/anthropic-sdk-typescript) (`@anthropic-ai/sdk`) | Sí | Apache-2.0 | npm 1.1.0 (21-oct-2026) | 2.149 | 28.258.993 | 1.x | **Ya elegido** dentro de los nodos |
| [openai/openai-agents-js](https://github.com/openai/openai-agents-js) (`@openai/agents`) | Sí | MIT | 0.21.0 (20-oct-2026) | 3.936 | 1.155.073 | **0.x** | Referencia; reemplazaría a LangGraph |
| [mastra-ai/mastra](https://github.com/mastra-ai/mastra) (`@mastra/core`) | Sí | Apache-2.0 en el núcleo, pero **los directorios `ee/` tienen otra licencia** (ver nota) | 1.79.0 (21-oct-2026) | 29.013 | 1.329.534 | 1.x, muy activo; Node ≥22.13 | Referencia; reemplazaría a LangGraph |
| [vercel/ai](https://github.com/vercel/ai) (`ai`) | Sí | Apache-2.0 (archivo LICENSE; GitHub marca NOASSERTION) | 7.0.149 (22-oct-2026) | 27.458 | 18.352.661 | 7.x; Node ≥22 | Complemento posible como capa de modelo; ADR eligió el SDK directo |
| [inngest/agent-kit](https://github.com/inngest/agent-kit) (`@inngest/agent-kit`) | Sí | Apache-2.0 | 0.13.2 (13-nov-2025); último push 29-abr-2026 | 952 | 14.068 | **Baja actividad** | Descartable como base |
| [VoltAgent/voltagent](https://github.com/VoltAgent/voltagent) (`@voltagent/core`) | Sí | MIT | 2.11.0 (28-sep-2026) | 10.861 | 23.812 | 2.x; tracción en npm baja frente a sus estrellas | Referencia |
| [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) | Sí | En transición de MIT a Apache-2.0 | v2.3.1 (5-oct-2026) | 13.639 | v1 `@modelcontextprotocol/sdk` 1.32.1 (MIT): 39.432.481 | v2 estable, v1 en mantenimiento | Complemento futuro (adaptador primario) |
| [google/adk-js](https://github.com/google/adk-js) (`@google/adk`) | Sí | Apache-2.0 | 2.3.0 (13-oct-2026) | 1.448 | 138.235 | 2.x | Referencia |
| [cloudflare/agents](https://github.com/cloudflare/agents) (`agents`) | Sí | MIT | 0.30.0 (22-oct-2026) | 5.872 | 1.499.264 | 0.x | No encaja: es la plataforma Cloudflare, no Railway |
| [i-am-bee/beeai-framework](https://github.com/i-am-bee/beeai-framework) (`beeai-framework`) | Sí (Python primero) | Apache-2.0 | TS 0.1.31 (28-sep-2026) | 3.440 | 872 | TS marginal | Descartable |
| [temporalio/sdk-typescript](https://github.com/temporalio/sdk-typescript) (`@temporalio/ai-sdk`) | Sí | MIT | v1.24.0 (15-sep-2026) | 938 | 38.664 (`ai-sdk`) | Maduro; Node ≥22.12 | Alternativa de ejecución durable; suma infraestructura |
| [restatedev/sdk-typescript](https://github.com/restatedev/sdk-typescript) (`@restatedev/restate-sdk`) | Sí | MIT (SDK) | v1.17.4 (20-oct-2026) | 125 | 178.019 | Maduro | Ídem Temporal |
| [anomalyco/opencode](https://github.com/anomalyco/opencode) (antes `sst/opencode`) | Sí (redirige) | MIT | v1.19.4 (22-oct-2026) | 220.127 | — | Harness de código | Referencia de internals |
| [earendil-works/pi](https://github.com/earendil-works/pi) (antes `badlogic/pi-mono`) | Sí (redirige) | MIT | v1.4.0 (21-oct-2026) | 117.190 | — | Harness de código | Referencia de internals |
| [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui) | Sí | MIT | release/2026-10-21 | 16.765 | — | Activo | Referencia del protocolo de streaming agente↔UI frente a SSE propio |
| [openai/openai-guardrails-js](https://github.com/openai/openai-guardrails-js) (`@openai/guardrails`) | Sí | MIT | v0.3.0 (10-sep-2026) | 110 | 7.905 | 0.x, pequeño; Node ^22.13 o ≥24 | Referencia |
| [langfuse/langfuse](https://github.com/langfuse/langfuse) | Sí | MIT fuera de `ee/` | v4.68.0 (22-oct-2026) | 36.194 | — | Maduro | Complemento: trazas y costo, autoalojable |
| [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo) | Sí | MIT | 0.124.1 (8-oct-2026) | 26.296 | — | Maduro | Complemento: evaluaciones y red-teaming en CI |

Notas de licencia (archivos LICENSE leídos con `gh api`):
- **Mastra**: todo lo que esté en un directorio `ee/` (por ejemplo `@mastra/core/auth/ee`) se rige por `ee/LICENSE` — [mastra LICENSE.md](https://github.com/mastra-ai/mastra/blob/main/LICENSE.md)
- **Langfuse**: el mismo esquema `ee/`; el resto es MIT — [langfuse LICENSE](https://github.com/langfuse/langfuse/blob/main/LICENSE)
- **SDK de MCP**: el proyecto está pasando de MIT a Apache-2.0. Las contribuciones nuevas son Apache-2.0; las de autores que no han dado consentimiento de relicenciamiento siguen en MIT — [MCP TS SDK LICENSE](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/LICENSE)
  - Los paquetes v2 `@modelcontextprotocol/server`, `client` y `core` 2.3.1 se publican como Apache-2.0 en npm; también hay `server-legacy` y `codemod`.
- **Claude Agent SDK**: su uso se rige por los Términos Comerciales de Anthropic, también cuando impulsa productos para clientes propios — [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)

**Cómo maneja cada uno herramientas, permisos, HITL, durabilidad y estado**
- **LangGraph.js** — [LangGraph interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts); [persistencia](https://docs.langchain.com/oss/javascript/langgraph/durable-execution):
  - al reanudar, el runtime vuelve a ejecutar el nodo completo desde el principio;
  - las interrupciones se emparejan solo por su posición (índice);
  - los payloads deben ser tipos simples serializables en JSON;
  - checkpointer más `thread_id` obligatorios;
  - Store para datos entre hilos.
- **deepagentsjs** — [deepagentsjs README](https://github.com/langchain-ai/deepagentsjs):
  - `createDeepAgent` devuelve un grafo LangGraph compilado (streaming, Studio y checkpointers disponibles);
  - herramientas `write_todos`, `read_file`, `write_file`, `edit_file`, `ls`, `glob`, `grep` y `task` (subagentes con contexto aislado);
  - backends `StateBackend` y `FilesystemBackend`;
  - modelo de seguridad de "confiar en el LLM": los límites se imponen en la herramienta o el sandbox.
- **LangChain `createAgent`**: HITL, resumen, límites de llamadas, reintentos, respaldo, detección de datos personales y caché de prompts de Anthropic como middleware listo — [LangChain middleware](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in). La documentación de middleware propio solo muestra su uso vía `createAgent` y no dice si sirve dentro de un nodo `StateGraph` hecho a mano — [Custom middleware](https://docs.langchain.com/oss/javascript/langchain/middleware/custom)
- **OpenAI Agents JS** — [OpenAI HITL](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/):
  - `needsApproval` booleano o función asíncrona sobre los argumentos; con entrada mal formada falla cerrado y la herramienta no se ejecuta;
  - pausa con `result.interruptions`; aprobación o rechazo con `alwaysApprove`/`alwaysReject`;
  - serializa con `result.state.toString()` y restaura con `RunState.fromString(agent, …)`.
  - Advierte que el estado serializado es sensible y que restaurarlo no autentica ni al snapshot ni a quien lo envía. Hay que guardarlo del lado del servidor, verificar integridad y propiedad, e impedir repeticiones.
  - Consumir una aprobación no garantiza efectos exactamente una vez.
- **Mastra** — [Mastra agent approval](https://mastra.ai/docs/agents/agent-approval); [Mastra docs](https://mastra.ai/docs):
  - **Dos mecanismos de pausa**: aprobación previa (`requireToolApproval` por petición, `requireApproval` por herramienta, combinadas con OR) y suspensión en ejecución (`suspend()` más `resumeStream()` con `resumeSchema`).
  - Los agentes durables solo aceptan aprobación booleana, porque una función no se serializa.
  - Requiere un proveedor de almacenamiento para los snapshots; `listSuspendedRuns()` funciona tras reinicios y entre instancias.
  - `npm create mastra` genera lo que la documentación llama un harness de propósito general. Herramientas con `createTool` y esquemas zod de entrada y salida; integraciones con Next.js, Express, Hono y otros. Fastify no aparece en la página.
- **AI SDK (Vercel)** — [AI SDK agents](https://ai-sdk.dev/docs/agents/overview):
  - `ToolLoopAgent` con `stopWhen` y `prepareStep`;
  - `runtimeContext` compartido;
  - `toolsContext`: cada herramienta recibe solo su `context` tipado según su `contextSchema`;
  - `HarnessAgent` ejecuta harnesses preconfigurados (Claude Code, Codex, Pi);
  - herramientas con `tool()` y zod.
- **Claude Agent SDK**: permisos en seis pasos y modos `default`, `dontAsk`, `acceptEdits`, `bypassPermissions`, `plan` y `auto`. Los subagentes heredan el modo del padre, con excepciones — [permisos del Agent SDK](https://code.claude.com/docs/en/agent-sdk/permissions)

### Inferences
- **LangGraph.js sigue siendo la elección coherente.** Es el "runtime" de bajo nivel que LangChain recomienda para flujos con pasos deterministas; las alternativas (Mastra, OpenAI Agents JS, ADK, VoltAgent) traen su propio bucle y almacenamiento. Cambiar costaría rehacer ADR-0002 a 7 semanas del congelamiento del 29-nov-2026, sin ganancia en las garantías de dominio.
- **Mastra es la alternativa "harness completo" con más tracción** (29.013 estrellas; 1,33 M descargas/sem). Riesgos:
  - su licencia mixta (`ee/`);
  - Node ≥22.13 (compatible con Node 24);
  - su propio almacenamiento de snapshots, que duplicaría `PostgresSaver`;
  - no menciona Fastify.
  - Su diseño de aprobación (booleana en agentes durables) es una buena referencia.
- **OpenAI Agents JS está en 0.x**, con cambios de API probables. Su sección de advertencias de HITL es la mejor lista de verificación encontrada para la reanudación segura: propiedad del snapshot, repeticiones y efectos exactamente una vez. Aplica igual a `Command({resume})`.
- **deepagentsjs como base contradice ADR-0002**: sistema de archivos, subagentes libres y "confiar en el LLM". Como referencia de cómo empaquetar middleware sobre LangGraph es útil, y podría evaluarse solo para el agente de landing de la fase 2 (Sonnet, tarea más larga).
- **Middleware de LangChain como complemento.** Reintentos, respaldo, límites de llamadas y redacción de datos personales cubren brechas de la sección 2. Pero exigen `createAgent` y un modelo de LangChain, mientras ADR-0002 eligió `@anthropic-ai/sdk` directo en los nodos. Opciones:
  1. replicar esos ganchos a mano (simple, sin dependencia);
  2. usar `createAgent` como subgrafo dentro de un nodo, con `@langchain/anthropic`, la alternativa que ya contempla el ADR.
- **AI SDK (`ai` 7.x, 18 M descargas/sem) es el estándar de facto para la capa de modelo en TS.** Su patrón `toolsContext`/`contextSchema` es una buena idea para inyectar el contexto de autorización del servidor. Adoptarlo como capa de modelo cambiaría la decisión del SDK directo; queda solo como referencia.
- **Temporal o Restate** darían durabilidad de grado industrial, pero añaden un servidor más. Con pg-boss más `PostgresSaver` más idempotencia por clave, el MVP ya tiene durabilidad suficiente; su valor aparece si los flujos de landing crecen a muchos pasos con esperas largas.
- **Observabilidad y evaluaciones**:
  - **Langfuse** (MIT en su núcleo, autoalojable) y **promptfoo** (MIT, red-teaming en CI) encajan con presupuesto pequeño;
  - **LangSmith** es la opción natural del ecosistema LangGraph, pero es un SaaS pagado (no verificado en esta sesión).

### Gaps
- No verifiqué en documentación primaria:
  - el `needsApproval` del AI SDK 7, ni su integración con Workflow DevKit;
  - las capacidades de VoltAgent (VoltOps), de Cloudflare agents y de AG-UI;
  - la licencia del servidor de Restate.
- El número de estrellas de opencode (220k) y pi (117k) es el que devolvió la API tras la redirección de los repositorios; no investigué por qué son tan altos frente a los demás.
- No hay datos públicos de rendimiento de `PostgresSaver` a ~1.280 operaciones/s; queda para la prueba de carga que ya prevé ADR-0002.

## 4. ¿Cómo exponer los comandos y consultas del dominio hexagonal como herramientas y mantener la autorización fuera del modelo?

### Takeaway
El patrón consolidado es el siguiente:

- **Herramienta = adaptador primario** de un caso de uso, con esquema tipado (JSON Schema estricto o zod).
- **Identidad y alcance** derivados del token o sesión verificados del lado del servidor, nunca de argumentos del modelo.
- **Compuerta determinista antes de cada efecto.**
- **Ausencia física** de las herramientas no permitidas.

La especificación MCP 2026-07-28 formaliza exactamente esto (sin estado de protocolo, *handles* atados al usuario del token, prohibido reenviar tokens). Si algún día se expone el dominio vía MCP, el contrato ya es compatible.

### Cited Findings
- La especificación de MCP define un protocolo **sin estado** y sin sesiones de protocolo — [MCP, Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices):
  - el estado entre peticiones se maneja con *handles* explícitos que viajan como argumento de la herramienta;
  - los servidores no deben (MUST NOT) tratar la posesión de un *handle* como autenticación;
  - deberían (SHOULD) atar el *handle* del lado del servidor al usuario autenticado, con claves `<user_id>:<handle>` donde el usuario sale del token verificado y no del cliente.
- En la misma especificación — [MCP, Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices):
  - un servidor MCP no debe aceptar tokens que no se emitieron explícitamente para él, así que reenviar tokens ("token passthrough") está prohibido;
  - minimización de alcances: un alcance inicial mínimo y elevación progresiva con `WWW-Authenticate scope=…`;
  - entre los errores comunes lista los comodines y dar por suficientes los alcances del token sin lógica de autorización en el servidor.
- Proyectos hexagonales con MCP lo tratan como **adaptador primario** junto a API y CLI (adaptadores → puertos → casos de uso → dominio) y dejan la autenticación en el borde o en un gateway — [catalog-mcp rules (Glama)](https://glama.ai/mcp/servers/@MikeORed/catalog-mcp/blob/65fc4e023b7522630e4e9b4f4f1564f9c44d5089/.clinerules/core-rules.md); [Gravitee, MCP Server Adapters](https://gravitee.io/corpus/gen-1200/python-programming-language/mcp-server-adapters.html). Son fuentes secundarias de poca autoridad, útiles solo como ejemplo del patrón.
- El SDK TS de MCP v2 separa los paquetes `@modelcontextprotocol/server`, `client` y `core` 2.3.1 (Apache-2.0); v1 (`@modelcontextprotocol/sdk` 1.32.1) sigue publicándose — [releases del MCP TS SDK](https://github.com/modelcontextprotocol/typescript-sdk/releases)
- En el Agent SDK de Claude — [permisos del Agent SDK](https://code.claude.com/docs/en/agent-sdk/permissions):
  - un deny por nombre quita la definición de la herramienta de la petición, así que el modelo ni la ve;
  - para filtrar todas las llamadas sin importar modo y reglas, la documentación recomienda un hook `PreToolUse`;
  - las herramientas aprobadas automáticamente nunca llegan a `canUseTool`, así que los controles puestos ahí se saltan sin aviso.
- En AI SDK, cada herramienta recibe solo su `context` tipado según su `contextSchema` (`toolsContext`), separado de los argumentos que genera el modelo — [AI SDK agents](https://ai-sdk.dev/docs/agents/overview)
- En OpenAI Agents JS, `needsApproval` puede ser una función asíncrona sobre los argumentos ya parseados; si la entrada está mal formada, falla cerrado — [OpenAI HITL](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/)
- Herramientas tipadas con zod:
  - Mastra (`createTool` con `inputSchema` y `outputSchema`) — [Mastra docs](https://mastra.ai/docs)
  - AI SDK (`tool()` con `inputSchema` zod) — [AI SDK agents](https://ai-sdk.dev/docs/agents/overview)
  - OpenAI Agents JS expone `StandardSchemaWithJSON` — [OpenAI Agents SDK JS](https://openai.github.io/openai-agents-js/)
- Anthropic recomienda no envolver cada endpoint, consolidar, usar espacios de nombres y devolver errores que orienten al agente — [Anthropic, Writing tools](https://www.anthropic.com/engineering/writing-tools-for-agents)
- "Cuarentena": los agentes que leen contenido no confiable no reciben herramientas de alto privilegio; solo el agente actor actúa sobre sus resúmenes — [Anthropic/Claude blog, A harness for every task](https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/)
- Estabilidad de las definiciones de herramientas:
  - Manus las mantiene estables y restringe con enmascarado, porque añadir o quitar herramientas a mitad de tarea rompe la caché y confunde al modelo — [Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
  - En la API de Claude, cambiar definiciones de herramientas invalida toda la caché (herramientas, sistema y mensajes) — [Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

### Inferences
- **Patrón recomendable de "puerto de herramienta"**, coherente con ADR-0002 (sin decidir implementación):
  1. `packages/contracts` define cada herramienta como JSON Schema estricto, la fuente única que valida Ajv. Desde ahí se generan el `input_schema` para `@anthropic-ai/sdk` y, si hiciera falta, un esquema zod o un tool de MCP.
  2. Un descriptor por herramienta con metadatos:
     - tipo (`query` o `command`) y caso de uso destino;
     - `requiresHumanApproval`;
     - `idempotencyKey(convId, turno, toolCallId)`;
     - `riskLevel`;
     - presupuesto de respuesta (concisa o detallada).
  3. El adaptador del agente arma la llamada al caso de uso así: argumentos del modelo (validados) más `AuthContext` del servidor (actor, usuario, marca, sesión), y luego Ω, y luego el caso de uso.
- **Mapeo de patrones externos a Popayán**:
  - `toolsContext` de AI SDK y el `<user_id>:<handle>` de MCP son la misma idea que el principio 2 del ADR.
  - El `PreToolUse` del Agent SDK es el análogo de Ω.
  - El "deny por nombre que elimina la herramienta" es el análogo de "las prohibidas no existen".
- **Coherencia con la caché**: un conjunto **fijo** de herramientas por agente ya cumple el principio de Manus y evita invalidar la caché. Lo que no conviene es filtrar herramientas por turno según el estado; si hace falta restringir, se hace en Ω, no en la lista enviada al modelo.
- **MCP como adaptador primario adicional** permitiría exponer consultas públicas del dominio (descubrimiento de marcas) a clientes externos sin pasar por los agentes propios. Riesgos para el MVP:
  - implementar OAuth 2.1 completo con minimización de alcances y protección SSRF;
  - un SDK v2 reciente;
  - superficie de ataque nueva.
  - Parece más prudente después del 10-dic, con los mismos descriptores de `packages/contracts`.
- **HITL**: las advertencias de OpenAI (propiedad del snapshot, repetición, efectos exactamente una vez) aplican a `Command({resume})`. Antes de reanudar, verificar que la persona que aprueba sea la dueña de la conversación o de la marca, y que el valor de reanudación sea de un solo uso.

### Gaps
- No encontré fuentes primarias (Anthropic, LangChain, OpenAI) que describan explícitamente "arquitectura hexagonal + herramientas de agente"; los ejemplos hexagonales con MCP son repositorios y corpus secundarios.
- No verifiqué si `@anthropic-ai/sdk` 1.x trae utilidades para JSON Schema o zod (por ejemplo, ayudas para el tool runner), ni el soporte actual de `strict: true` por modelo.

## 5. ¿Cómo manejan los harnesses el costo y el throughput a escala (~3.000 llamadas/min)?

### Takeaway
Las palancas documentadas son:

- caché de prompts (que además **no consume ITPM** en Haiku 5.5);
- prefijos estables y solo de agregar;
- semáforos y colas con backoff guiado por `retry-after` y los encabezados `anthropic-ratelimit-*`;
- límites de llamadas por ejecución;
- modelo de respaldo o degradación;
- subir de nivel de cuenta de forma gradual.

Con los límites oficiales de Haiku 5.5, Build (5.000 RPM) ya cubre 2.970 llamadas/min en solicitudes. Lo que probablemente obliga a Scale es el **tope de gasto mensual de Build (US$1.000)** y los presupuestos de tokens por llamada, más que el RPM.

### Cited Findings
- **Límites estándar de Claude Haiku 5.5** (igual para Sonnet 5.5) — [Anthropic, Rate limits](https://platform.claude.com/docs/en/api/rate-limits):

  | Nivel | RPM | ITPM | OTPM | Tope de gasto mensual |
  |---|---|---|---|---|
  | Start | 1.000 | 2.000.000 | 400.000 | US$500 |
  | Build | 5.000 | 5.000.000 | 1.000.000 | US$1.000 |
  | Scale | 10.000 | 10.000.000 | 2.000.000 | US$200.000 |

  - Las organizaciones nuevas pueden empezar en un nivel "Evaluation" con límites menores.
- En la misma página — [Anthropic, Rate limits](https://platform.claude.com/docs/en/api/rate-limits):
  - el límite usa un *token bucket* y puede aplicarse en intervalos cortos (60 RPM pueden imponerse como 1 solicitud por segundo);
  - hay *acceleration limits* ante subidas bruscas de uso, con la recomendación de subir el tráfico gradualmente;
  - los límites se comparten entre los valores de `inference_geo`;
  - el 429 por tope de gasto **no trae `retry-after`** y se distingue por `error_code: enforced_spend_limit_reached`.
- **ITPM consciente de la caché**: en la mayoría de los modelos, solo los tokens de entrada no cacheados cuentan para el ITPM; la excepción es Haiku 3.5. Ejemplo oficial: con 2 M de ITPM y 80 % de aciertos se procesan 10 M de tokens de entrada por minuto. OTPM no depende de `max_tokens` — [Anthropic, Rate limits](https://platform.claude.com/docs/en/api/rate-limits)
- Hay encabezados `anthropic-ratelimit-{requests,tokens,input-tokens,output-tokens}-{limit,remaining,reset}` y `retry-after`, y una Rate Limits API para leer los límites configurados. Se pueden poner límites por workspace — [Anthropic, Rate limits](https://platform.claude.com/docs/en/api/rate-limits)
- **Caché de prompts** — [Anthropic, Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching):
  - **Configuración**: hasta 4 *breakpoints*; caché automática con un `cache_control` de nivel superior.
  - **Orden del prefijo**: `tools` → `system` → `messages`.
  - **TTL**: 5 minutos por defecto (se renueva gratis al leer) o 1 hora (escritura 2x).
  - **Precios de Haiku 5.5** (≤100K): base US$0,10/MTok; escritura 5 min US$0,125; escritura 1 h US$0,20; lectura US$0,01.
  - **Mínimo cacheable**: **512 tokens** para Haiku 5.5 y Sonnet 5.5; 4.096 para Haiku 4.5.
  - **Invalidación**: cambiar definiciones de herramientas invalida todo; `tool_choice` e imágenes invalidan los mensajes.
  - **Concurrencia**: las peticiones concurrentes no aciertan en la caché hasta que la primera respuesta empieza.
  - **Pre-calentamiento**: con `max_tokens: 0`.
  - **Aislamiento**: por organización y por workspace en la API de Claude.
- Manus cuenta una relación entrada:salida de ~100:1 y trata la tasa de aciertos de caché KV como la métrica principal de costo y latencia — [Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- LangChain incluye middleware para limitar llamadas al modelo y a herramientas con fines de costo, reintentos con backoff exponencial y modelo de respaldo — [LangChain middleware](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in)
- Anthropic advierte que los workflows multiagente consumen más tokens, que paralelizar debe justificar su costo de coordinación, y recomienda presupuestos explícitos de tokens — [Anthropic/Claude blog, A harness for every task](https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/)
- ADR-0002 calcula US$0,000365 por llamada del agente de usuario, unos US$548/mes en el escenario de diseño y US$65 por hora en el pico de 10.000 sesiones. Hoy asume Start para el MVP, Build para el escenario de diseño y Scale para el pico — [ADR-0002](../../docs/adr/ADR-0002-arquitectura-multiagente.md)

### Inferences
- **Aritmética en el pico** (2.970 llamadas/min ≈ 49,5 por segundo), con los límites oficiales:
  - **Build**: el RPM queda al 59 %. Los promedios por llamada que caben son ~1.683 tokens de entrada **no cacheados** (5 M / 2.970) y ~337 de salida (1 M / 2.970).
  - **Scale**: ~3.367 de entrada no cacheada y ~673 de salida por llamada.
  - Con un prefijo en caché (contrato más herramientas), solo cuentan el perfil (<800 tokens) y los últimos turnos, así que **Build podría alcanzar en tokens por minuto**.
  - Pero US$65/h de pico agotan el tope de Build (US$1.000/mes) en ~15 horas de pico acumulado, y el 429 por gasto no se reintenta. Esto refuerza el pedido de Scale (PEN-14) por **gasto**, no solo por RPM. Es un matiz para PEN-14, no una nueva decisión.
- **Caché en Popayán**: el prefijo estable de cada agente debe pasar de **512 tokens**, o no se cachea en Haiku 5.5. Hay que verificarlo midiendo `cache_creation_input_tokens` y `cache_read_input_tokens`. Además:
  - Con cinco agentes hay cinco prefijos; con TTL de 5 minutos y tráfico continuo se mantienen calientes. En horas valle, o justo al desplegar, conviene **pre-calentar** con `max_tokens: 0`, porque las peticiones concurrentes no aciertan hasta que la primera empieza a responder: es el efecto "estampida" del lanzamiento.
  - Un timestamp o un dato del usuario dentro del prompt de sistema rompería la caché (lección de Manus). El perfil de <800 tokens va después del último *breakpoint*.
- **Control de flujo recomendable** (ya casi todo en ADR-0002):
  1. Un **token bucket global** en Upstash por modelo, alimentado con los encabezados `anthropic-ratelimit-*-remaining`, además del semáforo por instancia.
  2. Prioridad de colas: los turnos interactivos van primero; los trabajos de fondo (por ejemplo, landings de la fase 2) van en pg-boss con su propio límite, o usan Message Batches API, que tiene límites aparte.
  3. Un tope duro de llamadas al modelo por turno, con corte a respuesta guiada.
  4. **Degradación escalonada**: esfuerzo bajo, luego respuesta sin herramientas, luego búsqueda clásica.
  5. Rampa de tráfico antes del 10-dic para no disparar los *acceleration limits*.
- **Métrica de primer nivel**: la tasa de aciertos de caché por agente (T17 nuevo o derivado), porque determina costo e ITPM a la vez.

### Gaps
- No encontré el precio de salida de Haiku 5.5 en las páginas consultadas (solo los precios de entrada y caché), así que no pude recalcular de forma independiente los US$0,000365 por llamada del ADR.
- No verifiqué si existe hoy un "Priority Tier" con capacidad garantizada para Haiku 5.5, ni su precio. La página solo lista sus encabezados.
- No hay fuentes primarias con datos de benchmarks de harnesses TS a ~3k llamadas/min. La validación depende de la prueba de carga con modelo simulado que ya prevé ADR-0002.
