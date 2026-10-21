# Modelo de carga — resultados

> Generado por `tools/modelo-de-carga/calcular.mjs` desde `arquitectura/modelo-de-carga.json` (v0.4) y `arquitectura/grafo-operacional.json` (v0.6). No se edita a mano: se cambian los parámetros y se vuelve a ejecutar.

El requisito es sostener **10.000 sesiones simultáneas**. Con las capacidades actuales del grafo v0.6, ningún nodo de infraestructura queda en zona crítica en ese pico. Como referencia, el uso esperado es de 2,7 sesiones simultáneas en una hora pico normal del MVP, 45,9 el día de lanzamiento y 90 en el escenario de diseño.

## Lectura

- En el pico de capacidad la integral de eventos recibe 48,1 eventos de negocio por segundo, el 6,02 % del techo de ~800 por segundo de INV_01 (por medir en PEN-09). El registro de eventos no es el cuello de botella.
- El límite humano aparece antes que el técnico: la marca más activa acepta pedidos a mano en Telegram (1 por minuto) y en el escenario Capacidad objetivo recibiría 2,5 veces los pedidos que puede atender. La protección es la pausa automática al superar 15 pedidos pendientes (R06, T10).
- En el pico de capacidad hay 3.750 pedidos abiertos a la vez, cada uno con una conexión de aviso en vivo al comprador (E63).
- El pico de capacidad hace 2.970 llamadas por minuto a la API de IA y exige como mínimo el nivel **Scale** de la cuenta de Anthropic; una hora así cuesta unos US$65. Una cuenta nueva empieza en un nivel menor: el aumento se solicita antes del lanzamiento oficial.
- En el escenario Diseño, los eventos llenan los 8 GB incluidos en Supabase Pro en 14 meses; desde ahí, US$0,125 por GB al mes.
- En el escenario Diseño, Upstash por uso costaría US$24,9 al mes; por encima de US$10 conviene evaluar su plan fijo.
- Réplicas necesarias en el pico de capacidad: 4 de `api`, 2 de `worker`, 5 de `agentes`. En el MVP alcanzan 1 de `api`, 1 de `worker`, 1 de `agentes`.

## Escenarios

| Escenario | Periodo | Usuarios registrados | Sesiones simultáneas fijadas | Marcas | Descripción |
|---|---|---|---|---|---|
| MVP | Lanzamiento del 10-dic-2026 y primeros meses | 1.000 | — | Una por nicho (número de nichos por definir) | Objetivo de 1.000 usuarios el día de lanzamiento; ese día es el pico de evento del escenario. |
| Capacidad objetivo | Requisito vigente desde el lanzamiento oficial de Semana Santa 2027 | — | 10.000 | 100 en el lanzamiento oficial; hasta 1.000 | El sistema debe sostener 10.000 sesiones simultáneas y calcular la integral de eventos sin pérdida en ese pico. |
| Diseño | Sin fecha | 50.000 | — | Hasta 1.000 | Operación estable con la escala de diseño del kernel: 50.000 usuarios registrados. Sirve para estimar volúmenes mensuales, disco y costos. |

## Tasas en la hora pico

Pico normal y, entre paréntesis, pico de evento. En el escenario de capacidad los dos coinciden: el requisito ya es el pico.

| Magnitud | MVP | Capacidad objetivo | Diseño |
|---|---|---|---|
| Sesiones simultáneas | 2,7 (45,9) | 10.000 (10.000) | 90 (270) |
| Solicitudes a la API por segundo | 0,54 (9,18) | 2.000 (2.000) | 18 (54) |
| Pedidos en la hora pico | 5 (85) | 5.000 (5.000) | 333 (1.000) |
| Pedidos abiertos (conexiones de aviso en vivo) | 3,75 (63,8) | 3.750 (3.750) | 250 (750) |
| Eventos de negocio por segundo | 0,0211 (0,359) | 48,1 (48,1) | 1,07 (3,22) |
| Mensajes de Telegram por segundo | 0,00833 (0,142) | 8,33 (8,33) | 0,556 (1,67) |
| Turnos del agente por segundo | 0,00891 (0,151) | 33 (33) | 0,297 (0,891) |
| Llamadas a la API de IA por segundo | 0,0134 (0,227) | 49,5 (49,5) | 0,446 (1,34) |
| Operaciones en la base por segundo | 0,369 (6,27) | 1.280 (1.280) | 13,4 (40,2) |

## Plan de capacidad

Capacidad μ que necesita cada nodo para que el pico de evento más alto de los tres escenarios quede en ρ = 0,7, frente a la μ actual del grafo v0.6. Solo se listan los nodos que hay que escalar.

| Nodo | Tipo | Escenario | Carga en el pico por segundo | μ actual | μ requerida | Veces | Cómo se escala |
|---|---|---|---|---|---|---|---|
| A2 Marca (tenant) | humano | Capacidad objetivo | 0,0417 | 0,0167 | 0,0595 | 3,56 | Pausa automática al superar 15 pedidos pendientes (R06, T10) y espera visible para el comprador. |

## Réplicas por servicio

Réplicas que necesita cada servicio para que todos sus nodos queden en ρ ≤ 0,7 en el pico de evento, frente a las provistas en `servicios_de_despliegue` del grafo v0.6. La capacidad de cada nodo es su capacidad por réplica por las réplicas provistas.

| Servicio | Réplicas provistas | Necesarias: MVP | Necesarias: Capacidad objetivo | Necesarias: Diseño |
|---|---|---|---|---|
| `api` | 4 | 1 | 4 | 1 |
| `worker` | 2 | 1 | 2 | 1 |
| `agentes` | 5 | 1 | 5 | 1 |

## API de IA

Agente del usuario con Claude Haiku 5.5. Demanda en el pico de evento, costos y nivel mínimo de cuenta de Anthropic que la cubre con utilización 0,7 en llamadas, tokens y tope de gasto mensual. Los tokens leídos de caché no cuentan para el límite de entrada.

| Magnitud | MVP | Capacidad objetivo | Diseño |
|---|---|---|---|
| Llamadas al modelo por minuto | 13,6 | 2.970 | 80,2 |
| Tokens de entrada sin caché por minuto | 20.400 | 4.460.000 | 120.000 |
| Tokens de salida por minuto | 5.450 | 1.190.000 | 32.100 |
| Costo por llamada (US$) | 0,000365 | 0,000365 | 0,000365 |
| Costo de la IA al mes (US$) | 16,4 | — | 548 |
| Costo de una hora en el pico de evento (US$) | 0,299 | 65 | 1,76 |
| Nivel mínimo de cuenta de Anthropic | Start | Scale | Build |

## Utilización de los nodos del grafo

Utilización ρ = carga / capacidad actual del nodo (μ en el grafo v0.6). Alerta desde 0,7, crítico desde 0,9 (T01). Pico normal y, entre paréntesis, pico de evento; el estado corresponde al pico de evento.

| Nodo | Tipo | μ por segundo | MVP | Capacidad objetivo | Diseño | Estado más alto |
|---|---|---|---|---|---|---|
| P2 API de la plataforma | infraestructura | 4.000 | 0,000135 (0,00229) | 0,5 (0,5) | 0,0045 (0,0135) | ok |
| P3 Catálogo y búsqueda | infraestructura | 1.600 | 0,000169 (0,00287) | 0,625 (0,625) | 0,00563 (0,0169) | ok |
| P4 Servicio de pedidos | infraestructura | 200 | 0,0000556 (0,000944) | 0,0556 (0,0556) | 0,0037 (0,0111) | ok |
| P5 Bus de eventos | infraestructura | 100 | 0,000211 (0,00359) | 0,481 (0,481) | 0,0107 (0,0322) | ok |
| P6 Notificador de Telegram | infraestructura | 40 | 0,000208 (0,00354) | 0,208 (0,208) | 0,0139 (0,0417) | ok |
| X1 Bot API de Telegram | externo | 30 | 0,000278 (0,00472) | 0,278 (0,278) | 0,0185 (0,0556) | ok |
| P7 Agentes de IA del usuario y soporte | infraestructura | 50 | 0,000178 (0,00303) | 0,66 (0,66) | 0,00594 (0,0178) | ok |
| X3 API de IA (Anthropic Claude) | externo | 83,3 | 0,00016 (0,00273) | 0,594 (0,594) | 0,00535 (0,016) | ok |
| D1 Base transaccional con aislamiento por marca | infraestructura | 1.900 | 0,000194 (0,0033) | 0,672 (0,672) | 0,00706 (0,0212) | ok |
| D3 Registro de eventos | infraestructura | 300 | 0,0000704 (0,0012) | 0,16 (0,16) | 0,00358 (0,0107) | ok |
| A2 Marca (tenant) | humano | 0,0167 | 0,0166 (0,283) | 2,5 (2,5) | 0,166 (0,499) | saturado |

## Volúmenes mensuales

El escenario de capacidad describe un pico, no un mes, y no tiene volúmenes mensuales.

| Magnitud | MVP | Diseño |
|---|---|---|
| Usuarios activos en el mes (MAU) | 600 | 20.000 |
| Usuarios activos por día (DAU) | 120 | 4.000 |
| Pedidos al mes | 600 | 40.000 |
| Eventos al mes en planetario_events | 12.000 | 560.000 |
| Crecimiento de planetario_events (GB al mes) | 0,0123 | 0,573 |
| Meses hasta llenar los 8 GB incluidos en Supabase Pro (solo eventos) | 651 | 14 |
| Turnos del agente al mes | 30.000 | 1.000.000 |
| Comandos de Redis al mes | 389.000 | 13.000.000 |
| Costo de Upstash por encima del nivel gratuito (US$ al mes) | 0 | 24,9 |
| Salida del CDN (GB al mes) | 9 | 300 |
| Lecturas al CDN al mes | 24.000 | 800.000 |

## Límites externos

| Límite | Valor | MVP | Capacidad objetivo | Diseño |
|---|---|---|---|---|
| Telegram, mensajes por segundo en total | 30 | 0,000278 (0,00472) | 0,278 (0,278) | 0,0185 (0,0556) |
| Telegram, mensajes por segundo al chat de la marca más activa | 1 | 0,00167 (0,0283) | 0,25 (0,25) | 0,0167 (0,05) |
| Techo de eventos por segundo (INV_01, por medir) | 800 | 0,0000264 (0,000449) | 0,0602 (0,0602) | 0,00134 (0,00403) |

Fracción del límite usada en el pico normal y, entre paréntesis, en el pico de evento.

## Tasas por arista

Tasa en la hora pico de cada arista del grafo v0.6 que lleva carga en tiempo de ejecución, por segundo: pico normal y, entre paréntesis, pico de evento. El factor es estructural (por ejemplo, tres botones por pedido).

| Arista | Origen → destino | Magnitud | Factor | MVP | Capacidad objetivo | Diseño |
|---|---|---|---|---|---|---|
| E21 | P1 → P2 | api_s | 1 | 0,54 (9,18) | 2.000 (2.000) | 18 (54) |
| E25 | P2 → P3 | catalogo_s | 1 | 0,27 (4,59) | 1.000 (1.000) | 9 (27) |
| E26 | P3 → D1 | lecturas_catalogo_base_s | 1 | 0,135 (2,3) | 500 (500) | 4,5 (13,5) |
| E29 | P2 → P7 | turnos_agente_s | 1 | 0,00891 (0,151) | 33 (33) | 0,297 (0,891) |
| E30 | P7 → X3 | llamadas_modelo_s | 1 | 0,0134 (0,227) | 49,5 (49,5) | 0,446 (1,34) |
| E33 | P2 → P4 | eventos_pedido_s | 1 | 0,0111 (0,189) | 11,1 (11,1) | 0,741 (2,22) |
| E34 | P4 → D1 | eventos_pedido_s | 1 | 0,0111 (0,189) | 11,1 (11,1) | 0,741 (2,22) |
| E35 | P4 → D3 | eventos_pedido_s | 1 | 0,0111 (0,189) | 11,1 (11,1) | 0,741 (2,22) |
| E36 | D3 → P5 | eventos_negocio_s | 1 | 0,0211 (0,359) | 48,1 (48,1) | 1,07 (3,22) |
| E37 | P5 → P6 | telegram_s | 1 | 0,00833 (0,142) | 8,33 (8,33) | 0,556 (1,67) |
| E38 | P6 → X1 | telegram_s | 1 | 0,00833 (0,142) | 8,33 (8,33) | 0,556 (1,67) |
| E39 | X1 → A2 | telegram_s | 1 | 0,00833 (0,142) | 8,33 (8,33) | 0,556 (1,67) |
| E40 | A1 → X2 | pedidos_s | 1 | 0,00139 (0,0236) | 1,39 (1,39) | 0,0926 (0,278) |
| E41 | X2 → A2 | pedidos_s | 1 | 0,00139 (0,0236) | 1,39 (1,39) | 0,0926 (0,278) |
| E62 | X2 → X7 | pedidos_s | 1 | 0,00139 (0,0236) | 1,39 (1,39) | 0,0926 (0,278) |
| E42 | X7 → P2 | pedidos_s | 1 | 0,00139 (0,0236) | 1,39 (1,39) | 0,0926 (0,278) |
| E43 | A2 → X1 | pedidos_s | 1 | 0,00139 (0,0236) | 1,39 (1,39) | 0,0926 (0,278) |
| E44 | A2 → X1 | pedidos_s | 1 | 0,00139 (0,0236) | 1,39 (1,39) | 0,0926 (0,278) |
| E45 | A2 → X1 | pedidos_s | 1 | 0,00139 (0,0236) | 1,39 (1,39) | 0,0926 (0,278) |
| E46 | X1 → P2 | pedidos_s | 3 | 0,00417 (0,0708) | 4,17 (4,17) | 0,278 (0,833) |
| E47 | P5 → P9 | eventos_negocio_s | 1 | 0,0211 (0,359) | 48,1 (48,1) | 1,07 (3,22) |
| E48 | P5 → P10 | pedidos_s | 1 | 0,00139 (0,0236) | 1,39 (1,39) | 0,0926 (0,278) |
| E49 | P5 → P12 | eventos_negocio_s | 1 | 0,0211 (0,359) | 48,1 (48,1) | 1,07 (3,22) |
| E63 | P5 → P1 | telegram_s | 1 | 0,00833 (0,142) | 8,33 (8,33) | 0,556 (1,67) |
| E65 | P3 → D4 | redis_s | 1 | 0,54 (9,18) | 2.000 (2.000) | 18 (54) |

Sin tasa modelada (36): E01, E02, E03, E04, E05, E06, E07, E08, E09, E10, E11, E12, E13, E14, E20, E22, E23, E24, E27, E28, E31, E32, E50, E51, E52, E53, E54, E55, E56, E57, E58, E59, E60, E61, E64, E66. Son aristas de control y gobierno, de construcción, del cliente, de Noticias, de telemetría o de fase 2; su tasa se agrega al modelo cuando haga falta dimensionarlas.

## Comparación con los supuestos anteriores

| Magnitud | Grafo v0.3 (supuestos_pico) | Gemini (FG-03) | MVP | Capacidad objetivo | Diseño |
|---|---|---|---|---|---|
| Sesiones simultáneas en pico | 1.000 | 1.000 a 10.000 | 2,7 | 10.000 | 90 |
| Pedidos en la hora pico | 100 | — | 5 | 5.000 | 333 |
| Eventos de negocio por segundo | 0,22 | 20 a 150 | 0,0211 | 48,1 | 1,07 |
| Solicitudes a la API por segundo | 200 | 2.000 a 15.000 (lecturas) | 0,54 | 2.000 | 18 |

Los supuestos_pico del grafo v0.3 ponían 100 pedidos en la hora pico y 1.000 pedidos al mes (33,3 por día): la hora pico tenía más pedidos que el día entero. Este modelo los reemplazó y deriva las dos cifras de las mismas definiciones.

## Por definir

- **Marcas** en MVP: Una por nicho (número de nichos por definir). No cambia las tasas del sistema; solo la carga por marca, que usa fraccion_pedidos_marca_mas_activa.

## Supuestos que se calibran con la telemetría del MVP

- **fraccion_mau** (MAU / registrados): Usuarios con sesión en 30 días / registrados (P12).
- **fraccion_dau_de_mau** (DAU / MAU): Promedio diario de DAU / MAU del mes (P12).
- **sesiones_por_dau** (sesiones por usuario por día): Sesiones del día / DAU (P12).
- **duracion_sesion_s** (segundos): Mediana de duración de sesión (P12).
- **fraccion_sesiones_hora_pico** (sesiones en la hora pico / sesiones del día): Sesiones iniciadas en la hora con más sesiones / sesiones del día (P12).
- **factor_pico_evento** (multiplicador): Concurrentes en la peor hora del mes / concurrentes en la hora pico típica (P12).
- **fraccion_api_a_base** (consultas a D1 por solicitud): Consultas a D1 / solicitudes a P2.
- **comandos_redis_por_solicitud_api** (comandos por solicitud): Comandos facturados por Upstash / solicitudes a P2.
- **pedidos_por_mau_mes** (pedidos por MAU por mes): Pedidos creados en el mes / MAU.
- **pedidos_por_sesion** (pedidos por sesión): Pedidos / sesiones en la hora pico (P12).
- **fraccion_pedidos_hora_pico** (pedidos en la hora pico / pedidos del día): Pedidos en la hora con más pedidos / pedidos del día.
- **fraccion_pedidos_marca_mas_activa** (pedidos de la marca más activa / pedidos totales): Pedidos de la marca líder del mes / pedidos totales.
- **otros_eventos_por_dau** (eventos por usuario por día): Eventos que no son de pedido / DAU.
- **escrituras_base_por_evento** (escrituras en D1 por evento): Escrituras en D1 / eventos (estadísticas de PostgreSQL).
- **escrituras_estado_agente_por_turno** (escrituras en D1 por turno del agente): Filas escritas en el esquema de puntos de control de los agentes / turnos.
- **bytes_por_evento** (bytes): Tamaño de planetario_events con índices / filas.
- **tokens_entrada_por_llamada** (tokens): Promedio de input_tokens + cache_read_input_tokens + cache_creation_input_tokens por llamada (T17).
- **fraccion_entrada_cacheada** (tokens leídos de caché / tokens de entrada): cache_read_input_tokens / tokens de entrada totales (T17).
- **tokens_salida_por_llamada** (tokens): Promedio de output_tokens por llamada (T17).
- **mb_activos_por_mau_mes** (MB descargados del CDN por MAU por mes): Salida del CDN en el mes / MAU.
- **solicitudes_cdn_por_mau_mes** (solicitudes al CDN por MAU por mes): Operaciones de lectura de R2 en el mes / MAU.
