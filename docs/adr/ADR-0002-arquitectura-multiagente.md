# ADR-0002 — Arquitectura multiagente sobre el núcleo de dominio central

| Campo | Valor |
|---|---|
| Estado | **Aprobada** (opción C) |
| Fecha | 2026-10-20 |
| Decide | El usuario; aprobó la opción C el 2026-10-21 |
| Resuelve | PEN-15 (arquitectura multiagente sobre el núcleo de dominio) |
| Afecta | PEN-14 (capacidad de P7 y X3), ADR-0001 (agrega un servicio a la imagen), nodos N2 y N4 del kernel, nodos P7 y P8 del grafo |

## Contexto y problema

El objetivo fijado el 2026-10-20 es que los agentes de IA cumplan sus metas **centralizando el núcleo de dominio**, con ingeniería multiagente, y que el sistema sostenga 10.000 sesiones simultáneas calculando la integral de eventos sin pérdida.

Ya están decididos (kernel 1.2.1, grafo v0.3 y decisiones del usuario):

- **Agente del usuario**: un servicio compartido que carga el perfil de cada comprador al conversar. Recomienda, busca en lenguaje natural sobre el índice del catálogo (N4), organiza Mi universo, arma pedidos en borrador y atiende soporte las 24 horas. **Nunca paga ni confirma por el usuario.** Es real en la maqueta, sobre el catálogo ficticio, con 2 o 3 perfiles de ejemplo.
- **Agente de marca** (fase 2, enero a marzo): sesión aislada por marca, subordinada al Manual de Marca obligatorio. Flujo: manual → propuesta → vista previa → validaciones → aprobación del responsable → publicación. Sin acceso a pagos, reputación ni datos de otras marcas. Créditos limitados por plan.
- **Reglas que lo condicionan**:
  - Ω(u, m, t) vale 0 si una transacción viola el aislamiento entre marcas, el firewall de visibilidad o las prohibiciones financieras de los agentes.
  - INV_05: nunca una conexión SQL abierta durante una llamada al modelo.
  - INV_06: el dominio y los puertos no importan SDKs externos.
  - INV_02: idempotencia por clave de la fuente.
  - R05: las herramientas fijan la marca en el servidor.
  - rule_03: toda transición emite un evento.
- **Pila**: LangGraph.js para orquestar (kernel, L3) y Claude: Haiku 5.5 para el usuario y el soporte, Sonnet 5.5 para la marca (presupuesto del 17-oct).
- **Carga** ([modelo de carga v0.3](../modelo-de-carga.md)): en el pico de 10.000 sesiones hay 33 turnos del agente por segundo y unas 2.970 llamadas por minuto al modelo. El agente (P7) y la API de IA (X3) son los dos nodos que más hay que escalar. El modelo supone **1,5 llamadas al modelo por turno**.

**Pregunta:** ¿cómo se estructuran los agentes para que cumplan sus objetivos, actúen solo a través del dominio central y escalen al pico?

## Factores de decisión

| Factor | Peso | Por qué pesa así |
|---|---|---|
| F1 Integridad del dominio | 25 | Ninguna regla de negocio puede saltarse porque un modelo lo decida |
| F2 Seguridad financiera y de privacidad | 20 | Las prohibiciones de pagar, confirmar o cruzar marcas deben ser imposibles, no solo improbables |
| F3 Costo y latencia por turno | 15 | Presupuesto de 1,5 llamadas por turno; p95 del agente < 6 s (T03) |
| F4 Escalabilidad al pico | 15 | 33 turnos por segundo y nivel Scale de la API de IA |
| F5 Calidad y evolución | 10 | Agregar agentes y capacidades sin reescribir los existentes |
| F6 Verificabilidad | 10 | Evaluaciones por agente, pruebas automáticas y trazas por turno |
| F7 Tiempo de implementación | 5 | El agente del usuario debe estar en la maqueta y en la baseline v1.1 (29-nov) |

## Opciones consideradas

**A. Agente único generalista.** Un solo agente con todas las herramientas del usuario (búsqueda, Mi universo, borradores, soporte).

**B. Supervisor con subagentes autónomos.** Un modelo supervisor decide en cada turno a qué subagente delegar; cada subagente corre su propio ciclo con el modelo y puede devolver el control o transferirlo a otro.

**C. Orquestación determinista con agentes especializados.** El flujo es un grafo de estados escrito en código. Un enrutador elige al agente especializado; cada agente tiene un contrato de rol y pocas herramientas. Una compuerta de política en código revisa cada comando antes de ejecutarlo, y los efectos irreversibles pasan por aprobación humana. El modelo se usa solo donde hace falta entender lenguaje.

**D. Agentes gestionados por Anthropic (Managed Agents).** Anthropic ejecuta el ciclo del agente y aloja un contenedor por sesión; las herramientas del dominio se exponen como herramientas propias.

## Análisis de las opciones

### A. Agente único

- A favor: lo más simple de construir; una llamada al modelo por turno más las de herramientas.
- En contra: carga en cada turno las instrucciones y herramientas de todas las tareas. Cada capacidad nueva agranda el contexto y diluye la calidad. Las evaluaciones mezclan tareas distintas. No es multiagente.

### B. Supervisor con subagentes

- A favor: flexible; el patrón multiagente más difundido.
- En contra:
  - Cada turno paga al menos dos llamadas al modelo (supervisor y subagente). Eso supera el presupuesto de 1,5 llamadas y empuja la API de IA por encima del nivel Scale en el pico.
  - El enrutamiento lo decide un modelo, así que no es reproducible.
  - Las prohibiciones dependen de que cada subagente respete su papel.

### C. Orquestación determinista con agentes especializados

- A favor:
  - El dominio decide y los agentes solo proponen.
  - Las prohibiciones se imponen **por construcción**: la herramienta prohibida no existe en el agente.
  - El grafo es código: se prueba, se versiona y se traza.
  - Los botones de la interfaz no necesitan modelo, y el texto libre se enruta con una clasificación barata. Así se cumple el presupuesto de llamadas.
  - Cada agente tiene su propio prefijo estable, lo que aprovecha mejor la caché de prompts.
- En contra:
  - Más diseño inicial: contratos de rol, esquemas de herramientas, grafo.
  - Menos autonomía: un caso no previsto se resuelve con una respuesta guiada o con un humano, no improvisando.

### D. Agentes gestionados por Anthropic

- A favor: Anthropic opera el ciclo, el estado y la ejecución.
- En contra:
  - Está pensado para sesiones largas con espacio de trabajo propio, no para miles de conversaciones cortas de compra.
  - Cada acción del dominio haría un viaje de ida y vuelta a nuestro servidor.
  - Los límites de creación de sesiones (300 por minuto) no cubren el pico.
  - Saca el ciclo del agente fuera de la región y la topología aprobadas en ADR-0001.
- Puede servir más adelante para tareas internas por lotes, por ejemplo enriquecer catálogos.

### Matriz de decisión

Puntajes de 1 a 5 por juicio de ingeniería; el total es el promedio ponderado.

| Factor (peso) | A. Único | B. Supervisor | C. Determinista | D. Gestionados |
|---|---|---|---|---|
| F1 Integridad del dominio (25) | 3 | 3 | 5 | 3 |
| F2 Seguridad (20) | 3 | 3 | 5 | 3 |
| F3 Costo y latencia (15) | 4 | 2 | 4 | 2 |
| F4 Escalabilidad (15) | 4 | 2 | 4 | 2 |
| F5 Calidad y evolución (10) | 2 | 4 | 4 | 4 |
| F6 Verificabilidad (10) | 3 | 2 | 5 | 3 |
| F7 Tiempo (5) | 5 | 3 | 3 | 3 |
| **Total ponderado** | **3,30** | **2,70** | **4,50** | **2,80** |

C gana con margen en cualquier reparto razonable de pesos: aun duplicando el peso del tiempo de implementación, sigue primera.

## Decisión

**Opción C: orquestación determinista con agentes especializados sobre el núcleo de dominio**, aprobada por el usuario el 2026-10-21.

### Principio rector: el agente propone, el dominio decide

1. **Los agentes son adaptadores primarios del hexágono**, como la API HTTP. No tocan la base, ni los SDK de pagos o Telegram, ni la memoria de otros agentes. Toda acción es una herramienta que corresponde uno a uno con un caso de uso del dominio: una consulta o un comando de `packages/domain`, a través de `packages/ports`.
2. **El contexto de autorización lo pone el servidor.** Actor, usuario, marca y sesión salen de la sesión autenticada; nunca son argumentos que el modelo pueda elegir. Esto generaliza R05 a todos los agentes.
3. **Prohibiciones por construcción.** Las herramientas para pagar, confirmar un pedido, cambiar la llave Bre-B, leer la reputación o leer datos de otra marca **no existen** en ningún agente. Confirmar un pedido y publicar una landing son comandos que solo ejecuta una persona desde la interfaz, con su propia sesión.
4. **Compuerta de política en código.** Antes de ejecutar un comando, una función determinista evalúa Ω: aislamiento, firewall de visibilidad y prohibiciones. Si falla, el comando no se ejecuta, se registra una violación (T12) y el agente recibe un error explicable.
5. **Idempotencia desde la fuente.** Cada comando lleva una clave derivada del identificador de la conversación, del turno y de la llamada a la herramienta. Un reintento no duplica efectos (INV_02).
6. **Trazabilidad.** Todo evento originado por un agente entra por `appendCanonicalEvent` con estos metadatos: tipo de actor (agente), agente, versión del contrato, modelo y turno. Alimenta N6 y cumple rule_03.
7. **Contenido de terceros como dato.** Las descripciones de catálogo, las Noticias y los manuales los escriben las marcas. Entran al contexto marcados como datos, nunca como instrucciones. Una instrucción incrustada en un catálogo no puede activar herramientas de otra marca, porque esas herramientas no aceptan la marca como argumento.

### Agentes

| Agente | Actor | Objetivo | Modelo | Herramientas | Prohibido | Fase |
|---|---|---|---|---|---|---|
| Enrutador | Usuario | Elegir el agente especializado para un mensaje de texto libre | Haiku 5.5, salida estructurada, esfuerzo bajo | Ninguna: devuelve una intención tipada | Todo lo que no sea clasificar | Maqueta |
| Descubrimiento | Usuario | Encontrar marcas y productos en lenguaje natural y recomendarlos | Haiku 5.5 | Consultas: buscar en el índice con un filtro tipado (interés → subcategoría → tipo de oferta → producto → variantes), detalle de marca, galaxia y sistema | Comandos | Maqueta |
| Mi universo | Usuario | Organizar favoritos y colecciones | Haiku 5.5 | Consulta: favoritos. Comandos: agregar, quitar y ordenar favoritos | Leer datos de otros usuarios | Maqueta |
| Pedido | Usuario | Armar un pedido en borrador con la modalidad correcta | Haiku 5.5 | Consultas: catálogo y disponibilidad de la marca, modalidades. Comandos: crear y actualizar el borrador (carril efímero) | Confirmar, pagar, aplicar descuentos que la marca no definió | Maqueta |
| Soporte | Usuario | Resolver dudas y casos las 24 horas | Haiku 5.5 | Consultas: estado de los pedidos propios, políticas de devolución. Comandos: abrir caso, escalar a una persona | Reembolsar, cancelar por el usuario | MVP |
| Landing | Marca | Proponer la landing desde el Manual de Marca | Sonnet 5.5 | Consultas: manual y catálogo propios, componentes aprobados. Comandos: crear y actualizar la propuesta, generar la vista previa | Publicar, pagos, reputación, otras marcas | Fase 2 |
| Guardián de marca | Marca | Validar la propuesta contra el manual | Reglas en código, más un juez Haiku 5.5 con veredicto estructurado | Solo lectura de la propuesta y el manual | Modificar la propuesta | Fase 2 |
| Verificador de evidencia | Plataforma | Bloquear la publicación si falta evidencia | Solo código | Comprueba vista previa generada, validaciones en verde y aprobación humana registrada | — | Fase 2 |

Cada agente tiene un **contrato de rol** versionado en el repositorio: identidad, misión, reglas críticas ("debe" y "nunca"), herramientas permitidas y criterios de éxito. Es el patrón de `msitarzewski/agency-agents` que ya está en el kernel. Separar **agente** (identidad y permisos), **conocimiento** (contrato e instrucciones) y **orquestación** (el grafo) sigue el patrón de `wshobson/agents`.

### Orquestación

- **Dos grafos de estados**: `flujo_usuario` (enrutador → agente especializado → compuerta → herramienta → respuesta) y `flujo_landing` (manual → propuesta → guardián → vista previa → verificador → espera de aprobación humana → publicación por la persona).
- **Enrutamiento sin modelo cuando se puede**: una acción de la interfaz (un botón, una tarjeta) ya trae su intención y va directo al agente. El enrutador con modelo solo corre con texto libre, y la conversación se queda con el mismo agente mientras la intención no cambie.
- **Presupuesto de 1,5 llamadas al modelo por turno**, medido por turno. Si se excede de forma sostenida, el enrutador se integra al agente especializado más usado.
- **Historial solo de agregar**: los mensajes nunca se editan ni se reordenan. En las cuentas creadas desde el 31-ago-2026, Sonnet 5.5 rechaza un historial editado porque invalida el razonamiento guardado entre turnos. Con cualquier modelo, editar el historial también rompe la caché de prompts.
- **Patrones documentados, sin paquetes adicionales**: los grafos se construyen con `StateGraph` de `@langchain/langgraph` 1.5, siguiendo los patrones "enrutador" y "flujo propio" de su documentación. No se usan `@langchain/langgraph-supervisor` ni `@langchain/langgraph-swarm`:
  - quedan fuera del camino principal de la documentación;
  - el segundo depende de `createReactAgent`, que LangGraph 1.x marcó como obsoleto.

### Estado, aprobación humana y concurrencia

- **Estado de la conversación en PostgreSQL**:
  - Se guarda con `@langchain/langgraph-checkpoint-postgres` (`PostgresSaver`), en un esquema propio, `agentes`, separado de las tablas del dominio y de `planetario_events`.
  - Guarda solo el trabajo de la conversación, nunca hechos de negocio.
  - Se conecta por el pooler en modo sesión, como el resto (ADR-0001).
  - Escribe entre pasos del grafo, nunca durante una llamada al modelo, así que respeta INV_05.
- **Por qué no Redis**: el guardado oficial en Redis de LangGraph.js requiere los módulos RedisJSON y RediSearch, y Upstash no es compatible con RediSearch. Upstash queda para caché, límites de uso y candados.
- **Costo en la base**:
  - Cada turno escribe unos 4 puntos de control, y el modelo de carga v0.3 ya los suma a D1.
  - En el pico de 10.000 sesiones, la base pasa a unas 1.280 operaciones por segundo y hay que escalarla 6,1 veces su capacidad actual.
  - Si D1 resulta ser el límite, el estado sale a un guardado propio sobre Upstash, que LangGraph.js permite implementando `BaseCheckpointSaver`.
- **Vencimiento**: un trabajo programado del `worker` borra el estado de las conversaciones sin actividad por 24 horas, y el de las landings al publicarse o a los 30 días.
- **Aprobación humana**:
  - El grafo se pausa con `interrupt()` y queda guardado por conversación todo el tiempo que haga falta.
  - La persona aprueba en la interfaz, y la API ejecuta el comando del dominio (confirmar pedido, publicar landing) con la sesión de esa persona.
  - Después, el grafo se reanuda con `Command({ resume })` solo para seguir la conversación.
  - Al reanudar, LangGraph ejecuta el nodo de nuevo desde el principio. Por eso todo lo que el nodo hace antes de pausar es idempotente (claves de INV_02), y el valor de reanudación se valida con un esquema.
- **Un turno a la vez por conversación**: un candado por conversación en Upstash, con vencimiento, impide dos turnos simultáneos cuando el comprador envía mensajes seguidos. El segundo mensaje espera su turno.
- **Respuesta en vivo**: el grafo transmite sus pasos y el texto del modelo, y el servicio `agentes` los reenvía al navegador por Server-Sent Events.
- **Llamadas al modelo con el SDK oficial**:
  - Dentro de cada nodo se llama a Claude con `@anthropic-ai/sdk`, no con el envoltorio de LangChain. Así hay acceso directo a herramientas estrictas, salida estructurada, caché de prompts y manejo de rechazos a medida que Anthropic los publica.
  - El SDK solo vive en el adaptador de cada agente (INV_06).
  - Alternativa: `@langchain/anthropic`, que también soporta herramientas, salida estructurada y caché de prompts.
- **Sin plataforma administrada**:
  - LangGraph.js corre dentro del servidor Node.js propio; LangSmith Deployment no hace falta.
  - Las instancias del servicio `agentes` no guardan estado y comparten los puntos de control por identificador de conversación, así que escalan horizontalmente.

### Contexto y modelos

- **Divulgación progresiva**: cada turno arranca con el contrato del agente y sus herramientas (prefijo estable, en caché), un perfil reducido de menos de 800 tokens (intereses, comuna, favoritos recientes, pedidos abiertos) y los últimos turnos. Todo lo demás se pide con herramientas.
- **Herramientas estrictas**: cada herramienta tiene un esquema JSON con `strict: true`, el mismo que valida Ajv en `packages/contracts`. Sonnet 5.5 no admite forzar una herramienta; para que todos los agentes funcionen igual, el enrutador usa salida estructurada y los demás eligen herramientas en modo automático.
- **Modelos por nivel**: Haiku 5.5 para todo lo que conversa con compradores; Sonnet 5.5 solo para generar landings; ningún modelo superior en tiempo de ejecución. Si el modelo rechaza un turno, la interfaz ofrece la búsqueda clásica.
- **Costo** (modelo de carga v0.3): US$0,000365 por llamada al agente del usuario, unos US$16 al mes en el MVP, US$548 al mes en el escenario de diseño y US$65 por cada hora en el pico de 10.000 sesiones.

### Despliegue

- **Tercer servicio `agentes`** en la misma imagen de ADR-0001, junto a `api` y `worker`. Separa la latencia larga del modelo de la API (P2) y escala aparte: P7 necesita 4,7 veces su capacidad y P2, 2,9.
- El servicio importa el dominio y los puertos del monorepo. Sigue el patrón de INV_05: lectura corta, llamada al modelo sin conexión SQL abierta, escritura corta.
- **Control de flujo**:
  - un semáforo de llamadas al modelo por instancia;
  - un límite de turnos por usuario y por minuto;
  - un guardián global que lee los encabezados de límite de la API de IA y, cerca del tope, degrada a búsqueda clásica (el respaldo que ya prevén E29 y E30).
- **Nivel de cuenta de Anthropic**:
  - Start alcanza para el MVP.
  - El escenario de diseño necesita Build.
  - El pico de 10.000 sesiones necesita **Scale**, unas 2.970 llamadas por minuto.
  - Una cuenta nueva puede empezar por debajo de Start, así que el aumento se solicita antes del lanzamiento oficial (PEN-14).

### Verificación continua

- **Prueba estática en CI**: ningún conjunto de herramientas de un agente contiene un comando prohibido, y todas las herramientas tienen esquema válido.
- **Batería adversarial** que debe fallar siempre en la herramienta o en la compuerta, nunca en la buena voluntad del modelo:
  - pedir que pague;
  - pedir que confirme;
  - leer otra marca;
  - instrucciones incrustadas en un catálogo;
  - repetir una llamada.
- **Evaluaciones por agente** con casos reales en el español de Popayán (búsquedas, borradores, soporte), ejecutadas antes de cada cambio de contrato o de modelo.
- **Telemetría**:
  - la existente: latencia del agente (T03), costo por conversación (T17) y violaciones bloqueadas (T12);
  - nueva: llamadas al modelo por turno, rechazos del modelo y turnos degradados a búsqueda clásica.

### Consecuencias

**Positivas**
- El núcleo de dominio es la única fuente de verdad también para la IA: la integral de eventos solo cuenta hechos que pasaron por el dominio.
- Las prohibiciones financieras y de privacidad se pueden demostrar con pruebas, no solo con instrucciones.
- El costo y la carga de la API de IA quedan acotados por diseño.
- Agregar un agente es agregar un contrato, sus herramientas y un nodo del grafo, sin tocar los demás.

**Negativas y riesgos**
- Requiere definir contratos y esquemas antes de programar los agentes.
- Un caso que ningún agente cubre termina en respuesta guiada o en una persona.
- Dependencia de un proveedor de IA: el respaldo es la búsqueda clásica, no otro modelo.
- El estado de las conversaciones suma escrituras a la base, que ya es el nodo de infraestructura más exigido en el pico.

**Cambios aplicados en el kernel y el grafo (2026-10-21)**
- Kernel 1.3.0: nueva sección `L1_agent_architecture`; N2 y N4 apuntan a ella; el despliegue suma el servicio `agentes`; PEN-15 resuelto; PEN-14 incorpora el nivel Scale de la API de IA y el servicio `agentes`.
- Grafo v0.4: P7 es el servicio `agentes` (enrutador, cuatro agentes del usuario y compuerta de política); P8 incorpora el guardián de marca y el verificador de evidencia.
- ADR-0001 recibe una enmienda: un tercer servicio en la misma imagen.

### Cómo se confirma

La prueba se hace con el agente de la maqueta, sobre el catálogo ficticio y 2 o 3 perfiles de ejemplo.

1. Construir `flujo_usuario` con el enrutador y los agentes de descubrimiento y pedido.
2. Medir las llamadas al modelo por turno (meta: ≤ 1,5), la latencia p95 (meta: < 6 s), el costo por turno y las escrituras de estado por turno (supuesto del modelo: 4).
3. Pausar un borrador con `interrupt()`, confirmarlo desde la interfaz y reanudar la conversación sin duplicar el borrador.
4. Pasar la batería adversarial al 100 %.
5. Hacer una prueba de carga del servicio `agentes` con el modelo simulado, para validar su escalado sin gastar en la API de IA.

## Fuentes

Consultadas el 2026-10-20.

- Precios de Claude: [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing).
- Límites de tasa por nivel: [platform.claude.com/docs/en/api/rate-limits](https://platform.claude.com/docs/en/api/rate-limits).
- LangGraph.js:
  - [persistencia](https://docs.langchain.com/oss/javascript/langgraph/persistence);
  - [interrupciones](https://docs.langchain.com/oss/javascript/langgraph/interrupts);
  - [transmisión](https://docs.langchain.com/oss/javascript/langgraph/streaming);
  - [patrones multiagente](https://docs.langchain.com/oss/javascript/langchain/multi-agent);
  - [migración a v1](https://docs.langchain.com/oss/javascript/migrate/langgraph-v1);
  - [guardado en PostgreSQL](https://github.com/langchain-ai/langgraphjs/tree/main/libs/checkpoint-postgres) y [en Redis](https://github.com/langchain-ai/langgraphjs/tree/main/libs/checkpoint-redis);
  - [supervisor](https://github.com/langchain-ai/langgraphjs/tree/main/libs/langgraph-supervisor) y [enjambre](https://github.com/langchain-ai/langgraphjs/tree/main/libs/langgraph-swarm).
  - Versiones según el registro de npm: `@langchain/langgraph` 1.5.1 (2026-10-16) y `@langchain/langgraph-checkpoint-postgres` 1.1.0 (2026-10-12).
- Compatibilidad de Upstash con los módulos de Redis: [upstash.com/docs/redis/overall/rediscompatibility](https://upstash.com/docs/redis/overall/rediscompatibility).
- Integración de LangChain con Anthropic: [docs.langchain.com/oss/javascript/integrations/chat/anthropic](https://docs.langchain.com/oss/javascript/integrations/chat/anthropic).
- Patrones de referencia del kernel (L3): `wshobson/agents`, `msitarzewski/agency-agents`, `langchain-ai/langgraphjs`.
- Insumos: FG-03, turnos 3 y 4 (patrones de agentes y contratos de rol).
