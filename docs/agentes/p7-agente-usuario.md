# `P7` — Agentes de IA del usuario y soporte

> Se carga cuando la tarea toca la conversación del comprador, sus herramientas o sus contratos de rol. Fuente de verdad: ADR-0002 (tabla de agentes) y kernel `L1_agent_architecture`. El bucle y la memoria están en `plano-b-runtime.md`.

## 1. Ficha

| Campo | Valor |
| :--- | :--- |
| Nodo | `P7`, servicio `agentes`, gobernado por `G4` |
| Modelo | Claude Haiku 5.5 (`claude-haiku-5-5`) con `@anthropic-ai/sdk` dentro de nodos de `@langchain/langgraph` 1.5; ningún modelo superior en tiempo de ejecución |
| Agentes | Enrutador, descubrimiento, Mi universo, pedido y soporte, cada uno con su contrato de rol versionado |
| Presupuesto | 1,5 llamadas al modelo por turno en promedio · p95 del turno < 6 s (`T03`) · perfil de arranque < 800 tokens |
| Tope de herramientas | ⟨propuesto S6⟩ 3 llamadas por turno |
| Nunca | Paga, confirma un pedido, aplica descuentos que la marca no definió, reembolsa, cancela por el usuario, lee la reputación interna o datos de otra marca u otro usuario |

## 2. Contexto de arranque (< 800 tokens)

Exactamente lo que fija ADR-0002: **intereses, comuna, favoritos recientes y pedidos abiertos**, más los últimos turnos de la conversación. El contrato del agente y sus herramientas forman un prefijo estable que se lee de la caché de prompts.

Los vectores Π de `P13` no entran al arranque: llegan ya aplicados en el orden de los resultados de la búsqueda (`P3`, `E31`). Así el agente nunca recibe más que lo que pidió.

## 3. Agentes y herramientas

Cada herramienta corresponde uno a uno con un caso de uso del dominio (ADR-0002). Los identificadores son propuestos; los definitivos se fijan en `packages/contracts`.

| Agente | Consultas | Comandos | Prohibido |
| :--- | :--- | :--- | :--- |
| **Enrutador** | — (devuelve una intención tipada) | — | Todo lo que no sea clasificar |
| **Descubrimiento** | `buscarEnIndice` (filtro tipado: interés → subcategoría → tipo de oferta → producto → variantes), `verDetalleDeMarca`, `verGalaxiaYSistema` | — | Comandos |
| **Mi universo** | `listarFavoritos` | `agregarFavorito`, `quitarFavorito`, `ordenarFavoritos` | Leer datos de otros usuarios |
| **Pedido** | `consultarCatalogoDeMarca`, `consultarModalidades` | `crearBorrador`, `actualizarBorrador` (carril efímero `D4`) | Confirmar, pagar, aplicar descuentos no definidos por la marca |
| **Soporte** | `consultarMisPedidos`, `consultarPoliticaDeDevolucion` | `abrirCaso`, `escalarAPersona` | Reembolsar, cancelar por el usuario |

### 3.1 Borrador de pedido
- **Una sola marca por borrador.** Si el comprador quiere productos de dos marcas, son dos borradores con dos confirmaciones. La regla la hace cumplir el comando del dominio, no el modelo.
- **Tres modalidades de compra** (kernel, `N5_FULFILLMENT_SERVICES`). Los nombres que siguen vienen del insumo FG-05; los identificadores definitivos se fijan en el contrato.

| Modalidad | Dato que exige |
| :--- | :--- |
| `DOMICILIO` | Dirección de entrega (la marca la ve solo en esta modalidad, `R03`) |
| `RECOGIDA_EN_ESTABLECIMIENTO` | Ninguno adicional |
| `PEDIDO_ANTICIPADO_PARA_TU_LLEGADA` | ⟨propuesto⟩ Hora estimada de llegada |

- **Servicios no son un borrador de pedido.** La cita y el anticipo se acuerdan por WhatsApp directo con la marca, tras una solicitud identificada en la plataforma (`E61`). ⟨abierto⟩ ADR-0002 no le da al agente una herramienta para crear esa solicitud; hasta decidirlo, el agente lleva al comprador al paso de la interfaz que la crea.
- **Clave de idempotencia:** derivada de conversación, turno y llamada a la herramienta (`INV_02`). Es estable solo si el identificador del turno lo genera el cliente y se repite en los reintentos, y si la llamada al modelo que eligió la herramienta ocurrió antes del nodo que pausa (`plano-b-runtime.md` §1).

## 4. Cómo recomienda

El orden de los resultados lo da `P3` con el vector Π de `P13`; el agente no calcula rankings. Lo que sí hace es **explicar** la recomendación con datos que recibió de las herramientas en ese turno:

1. **Calificación agregada en cuatro dimensiones:** atención, producto, precio y distribución (esta última solo con domicilio). Es información pública (`R04`); el motor de reputación (`P9`) no es una herramienta del agente.
2. **Cercanía:** la galaxia del comprador primero (`P3`), y la distancia entre el centroide de su comuna y la sede que lo atiende (`delta_hat`), sin exponer direcciones.
3. **Fidelidad:** las recompras del propio comprador con esa marca (`P10`), que vienen en su perfil o en el detalle de la marca.
4. **Velocidad real de la marca en Telegram** (`mu_m^Tg`, `T19`).
5. **Saturación (`rule_02`):** si la marca está cerca de su límite, el resultado trae alternas del mismo nicho y galaxia con calificación de al menos 4,0; el agente lo dice con transparencia y deja elegir. En el MVP no hay alternas: una marca por nicho.
6. **Líder del nicho y Mejor evaluado son cosas distintas**, y el agente nunca los presenta como sinónimos.

Nunca cita un precio, horario o disponibilidad que no haya llegado en la salida de una herramienta en ese turno.

## 5. Contenido de terceros

Las descripciones de catálogo, Noticias y manuales los escriben las marcas y entran al contexto marcados como datos. Una instrucción incrustada en un catálogo no puede activar nada, porque ninguna herramienta acepta la marca como argumento.

## 6. Verificación (ADR-0002)

- **Prueba estática en CI:** ningún conjunto de herramientas de un agente contiene un comando prohibido; todas tienen esquema válido.
- **Batería adversarial** que debe fallar siempre en la herramienta o en la compuerta, nunca en la buena voluntad del modelo: pedir que pague; pedir que confirme; leer otra marca; instrucciones incrustadas en un catálogo; repetir una llamada.
- **Evaluaciones por agente** con casos reales en el español de Popayán, antes de cada cambio de contrato o de modelo.

## 7. Casos de comportamiento esperado

| Situación | Respuesta correcta |
| :--- | :--- |
| "Quiero el pan de A y el café de B" | Dos borradores; explica que cada pedido es de una sola marca |
| "Lo más barato que haya" | Ordena por precio real del catálogo y muestra la dimensión de precio de la calificación, sin ocultar en qué pierde |
| La marca favorita está saturada | Lo dice, propone una alterna del mismo nicho y galaxia si la hay, y deja elegir |
| "¿Ya me cobraron?" | `soporte` consulta el estado real del pedido y responde solo con lo que dice |
| "Agéndame un corte de pelo" | Explica que los servicios se acuerdan por WhatsApp con la marca y lleva a la solicitud en la interfaz |
| La API de IA no responde | Búsqueda clásica, sin borradores |
