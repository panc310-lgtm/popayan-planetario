# `P7` — Agentes de IA del usuario y soporte

> Se carga cuando la tarea toca la conversación del comprador, sus herramientas o sus contratos de rol. Fuente de verdad: ADR-0002 (tabla de agentes) y kernel `L1_agent_architecture`. El bucle y la memoria están en `plano-b-runtime.md`.

## 1. Ficha

| Campo | Valor |
| :--- | :--- |
| Nodo | `P7`, servicio `agentes`, gobernado por `G4` |
| Modelo | Claude Haiku 5.5 (`claude-haiku-5-5`) con `@anthropic-ai/sdk` dentro de nodos de `@langchain/langgraph` 1.5; ningún modelo superior en tiempo de ejecución |
| Agentes | Enrutador, descubrimiento, Mi universo, pedido y soporte, cada uno con su contrato de rol versionado |
| Presupuesto | 1,5 llamadas al modelo por turno en promedio · p95 del turno < 6 s (`T03`) · perfil de arranque < 800 tokens |
| Tope de herramientas | (S6, ratificado) 3 llamadas por turno |
| Nunca | Paga, confirma un pedido, aplica descuentos que la marca no definió, reembolsa, cancela por el usuario, lee la reputación, ni lee datos de otra marca o de otro usuario (ADR-0002) |

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
- **Tres modalidades de compra** (kernel, `N5_FULFILLMENT_SERVICES`), con los identificadores del contrato `packages/contracts/schemas/order-state-machine.schema.json`:

| Modalidad | Dato que exige |
| :--- | :--- |
| `domicilio` | Dirección de entrega (la marca la ve solo en esta modalidad, `R03`) |
| `recogida_en_establecimiento` | Ninguno adicional |
| `pedido_anticipado` | ⟨propuesto S20⟩ Hora estimada de llegada |

- **Servicios no son un borrador de pedido.** La cita y el anticipo se acuerdan por WhatsApp directo con la marca, tras una solicitud identificada en la plataforma (`E61`), que tiene su propio contrato (`solicitud_de_servicio`) y no pasa por los estados de `P4`. ⟨abierto⟩ ADR-0002 no le da al agente una herramienta para crear esa solicitud; hasta decidirlo, el agente lleva al comprador al paso de la interfaz que la crea.
- **Clave de idempotencia:** derivada de conversación, turno y llamada a la herramienta (`INV_02`). Es estable solo si el identificador del turno lo genera el cliente y se repite en los reintentos, y si la llamada al modelo que eligió la herramienta ocurrió antes del nodo que pausa (`plano-b-runtime.md` §1).

## 4. Cómo recomienda

El orden sale de Π. `P3` lo lee desde `D4`: el vector ya integra la amortiguación `Theta_s(L_m)`, las alternas con carga menor a 0,70 y los elegibles del cupo de exploración, todo calculado por `P13`. `P7` recibe ese orden a través de su herramienta de búsqueda (`E31`), porque los agentes no leen `D4` directamente (ADR-0002). Ninguno de los dos recalcula `Theta_s`, ni las alternas, ni el cupo. Lo que sí hace el agente es **explicar** la recomendación, solo con datos que recibió de las herramientas en ese turno y que puede mostrar:

1. **Calificación agregada en cuatro dimensiones:** atención, producto, precio y distribución (esta última solo con domicilio). (S10, ratificado) Llega en los resultados de búsqueda porque `R04` la declara pública, y eso no cuenta como "leer la reputación" que ADR-0002 prohíbe: así lo ratificó el usuario el 2026-10-27 (PEN-16, FG-08). El motor de reputación (`P9`) y las evaluaciones sueltas nunca son herramientas del agente.
2. **Cercanía:** la galaxia del comprador primero (`P3`), y la distancia entre el centroide de su comuna y la sede que lo atiende (`delta_hat`), sin exponer direcciones.
3. **Fidelidad:** las recompras del propio comprador con esa marca (`P10`), que son datos suyos y vienen en su perfil o en el detalle de la marca.
4. **Saturación (`rule_02`):** si una marca está amortiguada, el orden ya pone primero a las alternas que eligió `P13` (`p13-motor-decision.md` §3). El agente deja elegir sin ocultar ninguna opción. En el MVP no hay alternas (S11).
5. **Marcas nuevas (ADR-0004):** si un resultado viene marcado como *Nueva en el nicho*, el agente puede decirlo y explicar que su calificación todavía tiene pocas evaluaciones.
6. **Líder del nicho y Mejor evaluado son cosas distintas**, y el agente nunca los presenta como sinónimos.

(S12, ratificado) La carga de una marca, su velocidad de atención en Telegram (`mu_m^Tg`) y su recompra agregada sirven para ordenar, pero el agente no las muestra ni las cita al comprador mientras no se amplíe `R04`. Cualquier marca puede entrar como comprador.

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
| La marca favorita está saturada | Muestra primero las alternas que trae el orden, si las hay, y deja elegir, sin citar cifras de carga (S12) |
| "¿Ya me cobraron?" | `soporte` consulta el estado real del pedido y responde solo con lo que dice |
| "Agéndame un corte de pelo" | Explica que los servicios se acuerdan por WhatsApp con la marca y lleva a la solicitud en la interfaz |
| La API de IA no responde | Búsqueda clásica, sin borradores |
