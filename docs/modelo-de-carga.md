# Modelo de carga — resultados

> Generado por `tools/modelo-de-carga/calcular.mjs` desde `arquitectura/modelo-de-carga.json` (v0.2) y `arquitectura/grafo-operacional.json` (v0.3). No se edita a mano: se cambian los parámetros y se vuelve a ejecutar.

El requisito es sostener **10.000 sesiones simultáneas**. Con las capacidades actuales del grafo v0.3, 5 nodos de infraestructura quedan en zona crítica o saturados en ese pico (P2, P3, P5, P7, D1); el plan de capacidad dice cuánto hay que escalar cada uno. Como referencia, el uso esperado es de 2,7 sesiones simultáneas en una hora pico normal del MVP, 45,9 el día de lanzamiento y 90 en el escenario de diseño.

## Lectura

- En el pico de capacidad la integral de eventos recibe 48,1 eventos de negocio por segundo, el 6,02 % del techo de ~800 por segundo de INV_01 (por medir en PEN-09). El registro de eventos no es el cuello de botella.
- Lo que más hay que escalar es D1, Base transaccional con aislamiento por marca: 5,45 veces su capacidad actual. Subir el cómputo de Supabase, aumentar los aciertos de caché en Redis y agregar una réplica de lectura.
- X3, API de IA (Anthropic Claude), depende de un proveedor: necesita 70,7 por segundo frente a 10 supuestos hoy. Subir el nivel de límites de la cuenta de la API de IA y enrutar la búsqueda al modelo más rápido.
- El límite humano aparece antes que el técnico: la marca más activa acepta pedidos a mano en Telegram (1 por minuto) y en el escenario Capacidad objetivo recibiría 2,5 veces los pedidos que puede atender. La protección es la pausa automática al superar 15 pedidos pendientes (R06, T10).
- En el pico de capacidad hay 3.750 pedidos abiertos a la vez, cada uno con una conexión de aviso en vivo al comprador (E63).
- En el escenario Diseño, los eventos llenan los 8 GB incluidos en Supabase Pro en 14 meses; desde ahí, US$0,125 por GB al mes.
- En el escenario Diseño, Upstash por uso costaría US$24,9 al mes; por encima de US$10 conviene evaluar su plan fijo.

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
| Operaciones en la base por segundo | 0,333 (5,67) | 1.140 (1.140) | 12,2 (36,7) |

## Plan de capacidad

Capacidad μ que necesita cada nodo para que el pico de evento más alto de los tres escenarios quede en ρ = 0,7, frente a la μ actual del grafo v0.3. Solo se listan los nodos que hay que escalar.

| Nodo | Tipo | Escenario | Carga en el pico por segundo | μ actual | μ requerida | Veces | Cómo se escala |
|---|---|---|---|---|---|---|---|
| X3 API de IA (Anthropic Claude) | externo | Capacidad objetivo | 49,5 | 10 | 70,7 | 7,07 | Subir el nivel de límites de la cuenta de la API de IA y enrutar la búsqueda al modelo más rápido. |
| D1 Base transaccional con aislamiento por marca | infraestructura | Capacidad objetivo | 1.140 | 300 | 1.630 | 5,45 | Subir el cómputo de Supabase, aumentar los aciertos de caché en Redis y agregar una réplica de lectura. |
| P7 Agente de IA del usuario y soporte | infraestructura | Capacidad objetivo | 33 | 10 | 47,1 | 4,71 | Réplicas del servicio del agente y límite de turnos por usuario. |
| P3 Catálogo y búsqueda | infraestructura | Capacidad objetivo | 1.000 | 400 | 1.430 | 3,57 | Caché de resultados en Redis e índices de búsqueda; escala con las réplicas del servicio api. |
| A2 Marca (tenant) | humano | Capacidad objetivo | 0,0417 | 0,0167 | 0,0595 | 3,56 | Pausa automática al superar 15 pedidos pendientes (R06, T10) y espera visible para el comprador. |
| P2 API de la plataforma | infraestructura | Capacidad objetivo | 2.000 | 1.000 | 2.860 | 2,86 | Réplicas horizontales del servicio api en el host de contenedores. |
| P5 Bus de eventos | infraestructura | Capacidad objetivo | 48,1 | 50 | 68,8 | 1,38 | Más consumidores del relay en el servicio worker, particionados por pedido_id. |

## Utilización de los nodos del grafo

Utilización ρ = carga / capacidad actual del nodo (μ en el grafo v0.3). Alerta desde 0,7, crítico desde 0,9 (T01). Pico normal y, entre paréntesis, pico de evento; el estado corresponde al pico de evento.

| Nodo | Tipo | μ por segundo | MVP | Capacidad objetivo | Diseño | Estado más alto |
|---|---|---|---|---|---|---|
| P2 API de la plataforma | infraestructura | 1.000 | 0,00054 (0,00918) | 2 (2) | 0,018 (0,054) | saturado |
| P3 Catálogo y búsqueda | infraestructura | 400 | 0,000675 (0,0115) | 2,5 (2,5) | 0,0225 (0,0675) | saturado |
| P4 Servicio de pedidos | infraestructura | 50 | 0,000222 (0,00378) | 0,222 (0,222) | 0,0148 (0,0444) | ok |
| P5 Bus de eventos | infraestructura | 50 | 0,000422 (0,00718) | 0,963 (0,963) | 0,0215 (0,0644) | crítico |
| P6 Notificador de Telegram | infraestructura | 20 | 0,000417 (0,00708) | 0,417 (0,417) | 0,0278 (0,0833) | ok |
| X1 Bot API de Telegram | externo | 30 | 0,000278 (0,00472) | 0,278 (0,278) | 0,0185 (0,0556) | ok |
| P7 Agente de IA del usuario y soporte | infraestructura | 10 | 0,000891 (0,0151) | 3,3 (3,3) | 0,0297 (0,0891) | saturado |
| X3 API de IA (Anthropic Claude) | externo | 10 | 0,00134 (0,0227) | 4,95 (4,95) | 0,0446 (0,134) | saturado |
| D1 Base transaccional con aislamiento por marca | infraestructura | 300 | 0,00111 (0,0189) | 3,81 (3,81) | 0,0407 (0,122) | saturado |
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

## Comparación con los supuestos anteriores

| Magnitud | Grafo v0.3 | Gemini (FG-03) | MVP | Capacidad objetivo | Diseño |
|---|---|---|---|---|---|
| Sesiones simultáneas en pico | 1.000 | 1.000 a 10.000 | 2,7 | 10.000 | 90 |
| Pedidos en la hora pico | 100 | — | 5 | 5.000 | 333 |
| Eventos de negocio por segundo | 0,22 | 20 a 150 | 0,0211 | 48,1 | 1,07 |
| Solicitudes a la API por segundo | 200 | 2.000 a 15.000 (lecturas) | 0,54 | 2.000 | 18 |

El grafo v0.3 supone 100 pedidos en la hora pico y 1.000 pedidos al mes (33,3 por día): la hora pico tendría más pedidos que el día entero. Este modelo deriva las dos cifras de las mismas definiciones.

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
- **bytes_por_evento** (bytes): Tamaño de planetario_events con índices / filas.
- **mb_activos_por_mau_mes** (MB descargados del CDN por MAU por mes): Salida del CDN en el mes / MAU.
- **solicitudes_cdn_por_mau_mes** (solicitudes al CDN por MAU por mes): Operaciones de lectura de R2 en el mes / MAU.
