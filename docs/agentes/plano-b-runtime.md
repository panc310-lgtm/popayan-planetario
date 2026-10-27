# Plano B — Runtime del sistema multiagente

> Se carga cuando la tarea toca el grafo de estados, candados, puntos de control, aprobación humana, pagos desde la conversación o memoria. Fuente de verdad: kernel `L1_agent_architecture`, ADR-0002, ADR-0003, `INV_05` e `INV_07`. Este documento los baja a reglas de construcción; si algo aquí los contradice, prevalecen ellos.

## 1. Topología de `flujo_usuario` (ADR-0002)

```text
START ─► entrada ─┬─ acción de la interfaz (botón, tarjeta) ─────────────────────► agente indicado
                  └─ texto libre ─► enrutador (Haiku 5.5, salida estructurada) ─► agente
agente ∈ { descubrimiento, mi_universo, pedido, soporte }
agente ─► compuerta de política (Ω) ─► herramienta (caso de uso del dominio) ─► respuesta
pedido ─► espera_aprobacion ── interrupt() ── la persona confirma en la interfaz ── reanudación ─► respuesta
```

- El enrutador con modelo **solo** corre con texto libre; la conversación se queda con el mismo agente mientras la intención no cambie.
- **Regla estructural:** `espera_aprobacion` contiene solo `interrupt()` y la validación del valor de reanudación con su esquema. La llamada al modelo y la herramienta que arma el borrador ocurren en el nodo `pedido`, cuyo resultado queda guardado antes de la pausa. Al reanudar, LangGraph ejecuta de nuevo desde el principio el nodo que llamó a `interrupt()`: si ese nodo llamara al modelo, saldría otra respuesta con otro identificador de llamada a herramienta, y la clave de idempotencia de `INV_02` cambiaría.

## 2. El turno, paso a paso

### 2.1 Entrada: un turno a la vez
- Candado por conversación en Upstash (`D4`) con vencimiento (ADR-0002). **El segundo mensaje espera su turno**; no se rechaza.
- (S4, ratificado) Vencimiento de 15 s y liberación por comparación de token (`SET … NX PX 15000`; se borra solo si el valor sigue siendo el token propio), para no soltar el candado de otro turno si el propio venció.
- El candado ahorra trabajo, no garantiza corrección: la corrección la dan la versión del punto de control y las claves de idempotencia.
- Control de flujo (ADR-0002): semáforo de llamadas al modelo por instancia, límite de turnos por usuario y por minuto, y un guardián global que lee los encabezados de límite de la API de IA y, cerca del tope, degrada a búsqueda clásica.

### 2.2 Hidratación: lectura corta
- Punto de control de la conversación desde `PostgresSaver` (`@langchain/langgraph-checkpoint-postgres`) en el esquema `agentes`, por el pooler de Supabase en modo sesión, con 1 conexión por réplica (PEN-17).
- Perfil reducido de menos de 800 tokens: intereses, comuna, favoritos recientes y pedidos abiertos, más los últimos turnos. Todo lo demás se pide con herramientas.
- Las lecturas del dominio pasan por `SlaveReadDatabasePort` precedido por la caché de `D4` (`INV_07`). Ese puerto va por el pooler en modo transacción (puerto 6543, `prepare: false`; PEN-17), así que cada lectura es una consulta sin estado de sesión: nada de sentencias preparadas, `SET` fuera de la transacción, `LISTEN`/`NOTIFY` ni tablas temporales.
- **`PostgresSaver` se construye sobre un pool, nunca sobre un cliente dedicado**, para que cada operación tome y devuelva su conexión. Escribe entre pasos del grafo, nunca durante una llamada al modelo (`INV_05`). Es un tercer pool por réplica, fuera de los dos puertos de `INV_07`, porque guarda estado de la conversación y no muta el dominio. Va en modo sesión, con 1 conexión por réplica (decisión del usuario del 2026-10-27, PEN-17): cuenta contra los 200 clientes del pooler y retiene una de las conexiones directas de la base mientras está abierta.
- Prueba de integración esperada: durante la llamada a `@anthropic-ai/sdk`, ninguna conexión del pool está prestada.

### 2.3 Enrutador
- Haiku 5.5 con salida estructurada y esfuerzo bajo; devuelve una intención tipada que valida Ajv contra `packages/contracts`.
- ⟨propuesto⟩ Salida inválida o confianza baja: un reintento con el error de validación y, si vuelve a fallar, el agente `soporte` pide una aclaración. Nunca se adivina una ruta que lleve a un comando.

### 2.4 Agente, compuerta y herramienta
- Cada herramienta corresponde uno a uno con una consulta o un comando de `packages/domain`, a través de `packages/ports`, y tiene esquema con `strict: true`.
- La compuerta de política evalúa Ω antes de cada comando; si falla, el comando no se ejecuta, se registra en `T12` y el agente recibe un error explicable.
- El contexto de autorización (actor, usuario, marca, sesión) lo pone el servidor; nunca es un argumento del modelo.
- (S6, ratificado) Máximo 3 llamadas a herramientas por turno.

### 2.5 Pausa con aprobación humana
- El agente `pedido` crea o actualiza el **borrador en el carril efímero `D4`** (`E64`). Un borrador no es un hecho de negocio y no entra a `D3` (`INV_01`).
- `espera_aprobacion` llama a `interrupt(tarjeta)`, donde la tarjeta resume el borrador: marca, ítems, total y modalidad. El estado queda guardado por conversación todo el tiempo que haga falta y la instancia de `agentes` queda libre.

### 2.6 Confirmación y pago: lo hace la API, nunca el agente
```text
Interfaz (sesión de la persona) ─► P2 API ─► P4 Pedidos
  1. Compuerta Ω por transacción (rule_01). Si vale 0, no se ejecuta y se registra en T12.
  2. Transacción corta por MasterWriteDatabasePort: pedido `creado` y su evento con appendCanonicalEvent (E33–E35). COMMIT.
  3. Sin conexión SQL abierta: VerificadorDePagos.emitirCobro (Bold, X7) devuelve referencia, QR y vencimiento.
  4. Transacción corta: `cobro_emitido` y su evento. COMMIT.
  5. El comprador paga por Bre-B a la llave de la marca (E40). Bold confirma por webhook firmado o consulta autenticada (E42, R10).
  6. Transacción corta: `pagado` y `PagoConfirmado`. Los avisos a la marca y al comprador salen después por el outbox (ADR-0003).
  7. El grafo se reanuda con Command({ resume }) solo para seguir la conversación; el valor de reanudación se valida con su esquema.
```
- El paso 3 puede correr en la misma petición después del `COMMIT` o desde el outbox; en ambos casos sin conexión abierta (`INV_05`).
- En la contingencia manual de ADR-0003, el pedido pasa por `pago_informado` y solo el botón del responsable de la marca lo lleva a `pagado`.
- El pago es asíncrono: el turno termina al reanudar, y el agente `soporte` consulta después el estado real.

### 2.7 Cierre
- Último punto de control, transmisión de la respuesta al navegador por Server-Sent Events, telemetría del turno (§5) y liberación del candado.

## 3. `INV_05` en una línea

**Lectura corta → llamada externa sin conexión SQL abierta → escritura corta.** Vale para el modelo de IA (`X3`), Bold (`X7`) y Telegram (`X1`). Los avisos a Telegram y al comprador nunca se envían dentro de una transacción: salen del outbox por el bus (`P5`).

## 4. Memoria: tres estratos

| Estrato | Dónde | Qué guarda | Retención | Es fuente de verdad de… |
| :--- | :--- | :--- | :--- | :--- |
| **1. Operativa** | `PostgresSaver` en el esquema `agentes` de `D1`; candados y borradores en `D4` | Puntos de control, historial solo de agregar, borradores de pedido | Conversaciones: 24 h sin actividad. Landings: al publicarse o a los 30 días | Solo de la conversación |
| **2. Canónica** | `D3` `planetario_events`, en la misma base que `D1` | Hechos de negocio confirmados, con posición al `COMMIT` | Permanente | Todo lo comercial |
| **3. Derivada** | Tablas públicas de `P9` en `D1` (`R04`) y tablas internas de `P10` en `D1` (contadores por usuario y marca, y el agregado por marca, que no se muestra: (S12, ratificado)); vectores Π de `P13` en `D4` | Índice, recompra, carga por marca, vectores de decisión | Ventanas de 90 y 15 días; Π se reemplaza | Nada: se reconstruye desde `D3` |

- Ningún flujo comercial decide leyendo un punto de control: el punto de control dice *qué se conversó*; `D3` dice *qué pasó*.
- `D4` nunca guarda hechos confirmados.
- Upstash no sirve como guardado de LangGraph porque el guardado en Redis requiere RediSearch, que Upstash no soporta (ADR-0002).

### 4.1 Vencimiento de los puntos de control
- La librería `PostgresSaver` no trae vencimiento propio; ADR-0002 lo resuelve con un trabajo programado del `worker` que borra las conversaciones vencidas (`deleteThread`).
- (S5, ratificado) El trabajo corre cada 15 minutos.
- Una conversación vencida con una pausa pendiente pierde su borrador, que vivía en `D4`; no se pierde ningún hecho, porque el pedido solo existe en `D3` cuando la persona lo confirma.

### 4.2 Espacios de claves en `D4` ⟨propuesto⟩

| Patrón | Contenido | Escribe |
| :--- | :--- | :--- |
| `candado:conv:{conversacion_id}` | Token del turno en curso | Servicio `agentes` |
| `borrador:{conversacion_id}` | Borrador de pedido | `P4` por el agente `pedido` |
| `pi:{galaxia_id}:{nicho_id}:{franja}` | Vector de decisión | Solo el consumidor de `P13` de ese nicho |
| `carga:marca:{marca_id}` | `L_m(t)`, `Theta_s` y `mu_m^Tg`, con su marca de tiempo y posición del registro | Solo el consumidor de `P13` de esa marca |

## 5. Degradación

| Falla | Comportamiento |
| :--- | :--- |
| API de IA lenta, caída o cerca de su límite | Búsqueda clásica (respaldo de `E29` y `E30`); sin borradores nuevos |
| El modelo rechaza un turno | La interfaz ofrece la búsqueda clásica |
| Falta la clave en `D4` | Lectura por `SlaveReadDatabasePort`; para Π, orden por evaluación (`E68`) |
| Telegram (`X1`) falla | Reintentos y alerta a operación comercial por canal alterno (`E38`) |
| No llega el webhook de Bold | Consulta del estado al proveedor (`E42`); si crece, lo muestra `T22` |
| Salida del modelo que no valida | Un reintento con el error; si falla, `soporte` |

## 6. Telemetría por turno

Existente (ADR-0002): latencia del agente (`T03`), costo por conversación (`T17`) y violaciones bloqueadas (`T12`). Nueva: llamadas al modelo por turno, rechazos del modelo y turnos degradados a búsqueda clásica. Los eventos que origina un agente llevan actor, agente, versión del contrato, modelo y turno (`rule_03`).
