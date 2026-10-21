# ADR-0001 — Topología de despliegue

| Campo | Valor |
|---|---|
| Estado | **Aprobada** (opción C) |
| Fecha | 2026-10-20 |
| Decide | El usuario; aprobó la opción C el 2026-10-20 |
| Resuelve | AUD-12 (topología sin decidir), PEN-03 (host de procesos permanentes) |
| Afecta | PEN-04 (Redis), PEN-06 (presupuesto), filas de hosting, base de datos, objetos y Redis de la matriz AUD-13 |

## Contexto y problema

Popayán Planetario necesita alojar una API, procesos que corren todo el tiempo, una base PostgreSQL con registro de eventos, Redis, archivos 3D y el cliente web. Hoy hay tres respuestas distintas sobre dónde corre cada cosa:

- **Gemini (FG-03 T1)** propone un VPS con Docker Compose y Caddy, heredado de `@crm-erika`.
- **El presupuesto del 17-oct** (documento maestro) asume Vercel Pro, Supabase Pro y Cloudflare R2: US$46 al mes en infraestructura, más US$10 de WhatsApp que ya no aplica.
- **El grafo v0.2** describe la API como funciones serverless, y el kernel reconoce en PEN-03 que la cola pg-boss y los proyectores necesitan un proceso permanente que Vercel no aloja.

El periodo pagado va del 1-dic-2026 al 30-abr-2027; octubre y noviembre se desarrollan con planes gratuitos. Quedan 40 días para la baseline v1.1 (29-nov) y 51 para el lanzamiento del MVP (10-dic).

**Pregunta:** ¿dónde y cómo corren la API, los procesos permanentes, la base de datos, Redis, los archivos y el cliente web?

## Cargas que hay que alojar

Tomadas del grafo v0.2 y del kernel 1.1.1.

| # | Carga | Nodos | Naturaleza | Requisito que condiciona el despliegue |
|---|---|---|---|---|
| W1 | Cliente web 3D y archivos GLB | P1, D2 | Archivos estáticos | CDN con salida barata; GLB ≤ 1 MB por planeta y mapa ≤ 3 MB |
| W2 | API de la plataforma (Fastify) | P2, P3, P4, P11 | Solicitud y respuesta | p95 < 300 ms (T02); diseño de 200 solicitudes/s en pico |
| W3 | Webhooks de Telegram y del proveedor de pagos | P2 (E42, E46) | Entrantes, con reintentos del emisor | URL HTTPS estable y siempre disponible; idempotencia (INV_02, R10) |
| W4 | Procesos permanentes: relay de `planetario_events`, cola pg-boss, proyectores, notificador de Telegram, índice quincenal, fidelidad | P5, P6, P9, P10 | Larga vida o programados | Proceso siempre encendido; Telegram limita a ~30 mensajes/s en total y ~1/s por chat |
| W5 | Agentes de IA del usuario y de marca | P7, P8 | Llamadas largas al modelo | p95 de 6 s y 15 s por turno; nunca con una conexión SQL abierta (INV_05) |
| W6 | PostgreSQL: `planetario_events`, seguridad por fila (R01), trigger diferido y `pg_advisory_xact_lock` (INV_01) | D1, D3 | Fuente de verdad | Respaldos y restauración probada; versión ≥ 16 |
| W7 | Redis: borradores, caché y radios orbitales | D4 | Efímero | Nunca guarda hechos confirmados |
| W8 | Identidad: Facebook, Google o registro manual | X4, P2 | Externa | Proveedor por decidir (AUD-13) |

La carga del MVP es baja: el grafo estima 0,22 eventos de negocio/s y 100 pedidos por hora en el pico (AUD-11). El despliegue se elige por **corrección y operación**, no por volumen.

## Factores de decisión

| Factor | Peso | Por qué pesa así |
|---|---|---|
| F1 Corrección del flujo de eventos | 25 | Procesos permanentes y funciones de PostgreSQL de las que dependen INV_01 a INV_05 |
| F2 Carga de operación para un equipo pequeño | 20 | Parches, respaldos, TLS, monitoreo y guardias entre diciembre y abril |
| F3 Tiempo hasta el primer despliegue | 15 | 40 días hasta la baseline v1.1 |
| F4 Costo mensual | 10 | Presupuesto de infraestructura de US$46 al mes |
| F5 Latencia desde Popayán | 10 | p95 < 300 ms en la API (T02) |
| F6 Protección de datos personales | 10 | Datos de compradores colombianos en servidores fuera del país |
| F7 Portabilidad | 5 | Poder cambiar de proveedor sin reescribir el dominio |
| F8 Camino al producto final | 5 | App móvil, 100 marcas y diseño hasta 50.000 usuarios |

## Opciones consideradas

**A. VPS autogestionado.** Un servidor con Docker Compose y Caddy aloja la API, los procesos permanentes, PostgreSQL y Redis. Los respaldos van a almacenamiento de objetos y el cliente web a un CDN.

**B. Vercel + Supabase + host de procesos.** El cliente web y la API corren en Vercel (funciones). PostgreSQL y, si se aprueba, la identidad van en Supabase. Los procesos permanentes corren en un host aparte (Railway, Render o Fly.io). Redis gestionado y archivos en R2.

**C. Supabase + host de contenedores para todo el código de servidor.** Variante de B sin funciones de Vercel: la API Fastify corre como servicio permanente **junto** a los procesos permanentes, en el mismo host de contenedores y desde la misma imagen. Supabase aloja PostgreSQL; el cliente web va a un CDN estático; los archivos a R2.

## Análisis de las opciones

### Hechos de plataforma que condicionan el análisis

Verificados el 2026-10-20 en las páginas oficiales (ver Fuentes).

- **Supabase crea las bases en PostgreSQL 17**, no en 16. No hay anuncio de PostgreSQL 18 en el servicio alojado, así que `uuidv7()` nativo no está disponible. El kernel ya prevé generar el UUIDv7 en la app (INV_02).
- **Conexiones a Supabase:** directa en el puerto 5432 (IPv6, o IPv4 con complemento pago); pooler en modo sesión en 5432 y en modo transacción en 6543. El modo transacción no admite sentencias preparadas, candados de sesión, `LISTEN`/`NOTIFY` ni tablas temporales.
- **`pg_advisory_xact_lock` en modo transacción:** Supabase no lo documenta. Por la semántica de PostgreSQL debería funcionar dentro de un `BEGIN … COMMIT` explícito, porque el candado se libera al cerrar la transacción. En la opción B, INV_01 depende de esto y habría que probarlo; las opciones A y C usan conexiones persistentes y no pasan por ese modo.
- **Supabase Pro** incluye cómputo Micro (1 GB de RAM, 60 conexiones directas, 200 clientes del pooler), respaldos diarios con 7 días de retención, 100.000 usuarios activos mensuales de Auth con Facebook y Google, y 250 GB de salida.
- **Vercel Pro** corre Fastify sin configuración como una sola función, con 300 s de duración por defecto y 800 s como máximo. Tiene regiones en Washington (`iad1`) y São Paulo (`gru1`), ninguna en Miami ni en Bogotá. Los WebSockets están en beta y se cortan al llegar a la duración máxima.

### A. VPS autogestionado

**A favor**
- Control completo de PostgreSQL: versión 18 con `uuidv7()` nativo, sin pooler intermedio ni sus restricciones.
- Procesos permanentes, conexiones persistentes y avisos en vivo al comprador (E63) sin límites de duración.
- Un solo servidor y una sola factura; el costo más bajo por recurso.
- Portable: la misma configuración de contenedores corre en cualquier proveedor.

**En contra**
- Todo lo operativo recae en el equipo: parches del sistema, respaldos de PostgreSQL y **pruebas de restauración**, monitoreo, firewall, renovación de certificados y guardias durante el MVP.
- Un solo servidor es un punto único de falla: si el disco falla, se pierde lo ocurrido desde el último respaldo.
- El argumento de Gemini ("probado en `@crm-erika`") no es evidencia para este producto (AUD-06).

### B. Vercel + Supabase + host de procesos

**A favor**
- Sin servidores que administrar; respaldos diarios de la base incluidos.
- Vercel da CDN, despliegues de vista previa por rama y Fastify sin configuración.
- Supabase Auth cubre Facebook y Google, el hueco de identidad de AUD-15.

**En contra**
- El código de servidor queda partido en **dos entornos**: la API en funciones de Vercel y los procesos permanentes en otro host. Son dos despliegues, dos juegos de secretos y dos lugares para buscar errores.
- Las funciones abren muchas conexiones cortas, lo que obliga al pooler en modo transacción: sin sentencias preparadas y con INV_01 dependiendo de un comportamiento no documentado.
- Los avisos en vivo al comprador (E63) por WebSocket están en beta en Vercel y se cortan a los 800 s.
- Cinco proveedores: Vercel, Supabase, host de procesos, Redis y Cloudflare.
- Vercel cobra por cada desarrollador con acceso: US$20 más por persona.

### C. Supabase + host de contenedores para todo el código de servidor

**A favor**
- Todo el código de servidor corre en un solo entorno y desde una sola imagen: la API y los procesos permanentes se despliegan juntos.
- Conexiones persistentes por el pooler en modo sesión (5432, IPv4) o directas: sentencias preparadas, `LISTEN`/`NOTIFY` y candados de sesión disponibles. INV_01 no depende del modo transacción.
- Avisos en vivo al comprador con Server-Sent Events o WebSocket sin límite de duración.
- Base de datos gestionada con respaldos diarios, como en B.
- La imagen de contenedor es portable: si el costo lo justifica más adelante, se puede mover a un VPS (opción A) sin tocar el dominio.

**En contra**
- Hay que elegir dónde va el cliente web estático (Cloudflare o Vercel) y configurarlo aparte.
- Sin vistas previas automáticas por rama para la API, salvo que el host las ofrezca.
- Sigue habiendo un pooler entre la API y la base; con conexiones persistentes, el límite son los 200 clientes del cómputo Micro.

## Protección de datos personales

Antecedente técnico, no asesoría legal; lo confirma la revisión legal de comercio electrónico y datos ya aprobada.

- **Ley 1581 de 2012, artículo 26:** prohíbe transferir datos personales a países sin un nivel adecuado de protección, con excepciones como la autorización expresa del titular.
- **Estados Unidos está en la lista de países adecuados** de la SIC (Circular Única, Título V, capítulo 3, numeral 3.2).
- **Brasil no aparece de forma expresa.** La lista incluye a los países que la Comisión Europea declaró adecuados, y la Comisión declaró adecuado a Brasil el 26-ene-2026, pero no se encontró un pronunciamiento de la SIC que confirme esa lectura. Un borrador de resolución de mayo de 2026 agregaría a Brasil; no se confirmó que esté adoptado.
- **Consecuencia para la región:** alojar los datos en el este de Estados Unidos tiene un camino legal más claro que hacerlo en São Paulo.
- **Proveedores de nube como encargados:** la SIC trata el alojamiento en la nube como transmisión a un encargado y recomienda un contrato de transmisión escrito (Decreto 1377 de 2013, artículo 25). Hay que revisar el acuerdo de tratamiento de datos de cada proveedor que guarde datos personales.
- **Registro Nacional de Bases de Datos:** solo es obligatorio para empresas con activos superiores a 100.000 UVT (unos COP 5.237 millones en 2026). Las demás obligaciones de la Ley 1581 siguen aplicando: política de tratamiento, autorizaciones y medidas de seguridad.

## Latencia desde Colombia

Mediciones de WonderNetwork entre servidores, del 7 al 21 de octubre de 2026. Un usuario en datos móviles verá más.

| Ruta | Promedio típico | Observación |
|---|---|---|
| Bogotá → Miami | ~58 ms | Picos por encima de 1 s el 8, 15 y 16 de octubre |
| Bogotá → Washington DC | ~77 ms | Estable entre 76 y 79 ms |
| Bogotá → São Paulo | ~113 ms | Muy estable |
| Medellín → Miami | ~60 ms | Picos ocasionales |
| Medellín → Washington DC | ~84 ms | Una sola medición |
| Medellín → São Paulo | ~145 ms | Picos frecuentes de 250 a 520 ms |

No hay mediciones desde Cali ni desde Popayán; se miden en la prueba de humo. El este de Estados Unidos es 30 a 60 ms más rápido que São Paulo, y coincide con la región que la SIC reconoce como adecuada. **Todo lo que guarda datos va en Virginia**, en el mismo sitio que la base, para que la API y PostgreSQL estén a 1 o 2 ms.

Ningún host gestionado tiene región en Colombia ni en Miami: Fly.io retiró Bogotá y Miami, y lo más cercano de Railway y Render es Virginia. Entre los VPS, Vultr es el único con Miami a precio base.

## Costos estimados

En dólares al mes, para el periodo pagado (diciembre a abril). El presupuesto del 17-oct asigna **US$46 al mes** a infraestructura (Vercel Pro, Supabase Pro y R2).

| Concepto | A. VPS | B. Vercel + Supabase + procesos | C. Supabase + contenedores |
|---|---|---|---|
| Cómputo de servidor | VPS 2 vCPU / 4 GB: Vultr Miami 20; DigitalOcean o Lightsail 24 | Vercel Pro 20 (un desarrollador; +20 por persona) + host de procesos 5–10 | Host de contenedores con `api` y `worker`: 10–25 |
| Base de datos | En el VPS: 0 | Supabase Pro 25 | Supabase Pro 25 |
| Respaldos | Copias del proveedor: 4–7; volcados a R2 | Incluidos: diarios, 7 días | Incluidos: diarios, 7 días |
| Redis | En el VPS: 0 | Upstash: 0–10 | Upstash: 0–10 |
| Web estática y GLB | Cloudflare: 0–1 | Vercel (incluido) + R2: 0–1 | Cloudflare: 0–1 |
| **Total** | **24–32** | **50–66** | **35–61** |
| En pesos (TRM 3.174,67) | 76.000–102.000 | 159.000–210.000 | 111.000–194.000 |

- Hetzner queda descartado: en Estados Unidos su plan de 4 GB subió a €31,99 el 15-jun-2026 y figuraba "no disponible" el día de la consulta.
- El host de contenedores en C: Railway cobra por uso real (US$20 por vCPU y US$10 por GB al mes); Fly.io cobra US$6,70 por máquina de 1 GB en Virginia; Render, US$7 por servicio de 512 MB.
- Upstash cuesta 0 dentro del nivel gratuito (500.000 comandos al mes) y US$0,20 por cada 100.000 comandos adicionales.
- Ninguna cifra incluye impuestos ni la contingencia del 15 % del presupuesto.
- A no cuenta las horas del equipo en operar el servidor, que es su costo principal.

## Matriz de decisión

Puntajes de 1 a 5 por juicio de ingeniería sobre los hechos de las secciones anteriores; el total es el promedio ponderado.

| Factor (peso) | A. VPS | B. Vercel + Supabase + procesos | C. Supabase + contenedores |
|---|---|---|---|
| F1 Corrección del flujo de eventos (25) | 5 | 3 | 4 |
| F2 Carga de operación (20) | 2 | 3 | 4 |
| F3 Tiempo al primer despliegue (15) | 3 | 3 | 4 |
| F4 Costo mensual (10) | 5 | 3 | 4 |
| F5 Latencia (10) | 5 | 4 | 4 |
| F6 Protección de datos (10) | 4 | 4 | 4 |
| F7 Portabilidad (5) | 4 | 2 | 4 |
| F8 Camino al producto final (5) | 3 | 4 | 4 |
| **Total ponderado** | **3,85** | **3,20** | **4,00** |

**Sensibilidad:** la decisión depende de F2. Si el equipo tiene a alguien que pueda operar Linux y PostgreSQL, con guardia de diciembre a abril, A sube a 4,25 y supera a C. B queda última en cualquier escenario razonable: paga la complejidad de dos entornos de servidor sin ganar nada que C no tenga.

## Decisión

**Opción C**, aprobada por el usuario el 2026-10-20, con estos componentes:

| Componente | Propuesta | Región |
|---|---|---|
| Base de datos | Supabase Pro, PostgreSQL 17, cómputo Micro al inicio; UUIDv7 generado en la app | `us-east-1` (Virginia) |
| Código de servidor | Una imagen de contenedor del monorepo con dos servicios: `api` (Fastify, webhooks de Telegram y de pagos, avisos al comprador por Server-Sent Events) y `worker` (pg-boss, relay de `planetario_events`, proyectores, notificador de Telegram, tareas programadas) | Este de Estados Unidos, Virginia |
| Host de contenedores | Railway; alternativa: Fly.io (`iad`). Se elige en la prueba de humo | Virginia |
| Conexión a la base | Pooler en modo sesión (puerto 5432, IPv4) desde los dos servicios | — |
| Redis | Upstash, pago por uso | `us-east-1` |
| Web estática y GLB | Cloudflare: R2 con CDN. Verificar las condiciones de uso comercial del plan gratuito de Cloudflare Pages antes de usarlo | Global |
| Vercel | No se usa, salvo que el cliente web necesite renderizado en servidor | — |

### Consecuencias

**Positivas**
- Un solo entorno para todo el código de servidor: un despliegue, un juego de secretos, un lugar para los registros.
- INV_01 a INV_05 se implementan sobre conexiones persistentes, sin depender del modo transacción del pooler.
- Base gestionada con respaldos diarios y sin servidores que parchear.
- Costo estimado de US$35 a 61 al mes frente a US$46 presupuestados; además sale la línea de WhatsApp (US$10).

**Negativas y riesgos**
- **Pérdida máxima de datos de 24 horas** con respaldos diarios. La recuperación a un punto en el tiempo cuesta US$100 al mes y exige cómputo Small. Mitigación propuesta: exportar cada hora a R2 los eventos nuevos de `planetario_events`, que solo crece.
- Dependencia de Supabase: PostgreSQL 17 sin fecha para el 18 y 200 clientes de pooler con cómputo Micro.
- Railway cobra por uso: hay que configurar alertas de gasto.
- Cuatro proveedores que coordinar: Supabase, el host de contenedores, Cloudflare y Upstash.

**Cambios aplicados en el kernel y el grafo (2026-10-20)**
- Kernel 1.2.0: nueva sección `L1_deployment_topology`; PEN-03 y PEN-04 resueltos; PEN-06 actualizado; nuevos PEN-11 (prueba de humo) y PEN-12 (exportación horaria de eventos); PostgreSQL 16 pasa a 17 (Supabase).
- Grafo v0.3: P2 pasa de "funciones serverless" a "servicio Fastify permanente en contenedor"; P5 corre en el servicio `worker`; D1 pasa a "Supabase PostgreSQL 17, `us-east-1`"; D2 a Cloudflare R2; D4 a "Upstash, `us-east-1`".
- La identidad (Supabase Auth, con Facebook y Google y 100.000 usuarios activos mensuales incluidos) queda como candidata para un ADR aparte.

### Cómo se confirma

Una prueba de humo de unos tres días, antes del 10-nov-2026. Si alguno de estos puntos falla, se reconsidera A.

1. Desplegar `api` y `worker` desde la misma imagen en el host elegido, conectados a Supabase `us-east-1` por el pooler en modo sesión.
2. Probar INV_01: dos transacciones concurrentes con `pg_advisory_xact_lock` y el trigger diferido; ningún hueco en las posiciones.
3. Probar INV_02 y R10: un bot de Telegram de prueba y un webhook de pagos simulado con entregas duplicadas producen un solo evento.
4. Medir la latencia p95 a la API desde Popayán, por fibra y por datos móviles. Meta: menos de 300 ms (T02).
5. Restaurar un respaldo diario de Supabase en un proyecto aparte y medir cuánto tarda.
6. Revisar el gasto real a los 7 días y proyectar el mes.

### Cuándo reconsiderar

- El gasto gestionado supera el doble del costo de A durante dos meses seguidos.
- Hace falta una función de PostgreSQL 18 o más de 200 conexiones simultáneas a la base.
- El cliente web pasa a renderizarse en servidor (por ejemplo con Next.js): entonces Vercel vuelve a tener sentido para la web, no para la API.

## Enmiendas

| Fecha | Origen | Cambio |
|---|---|---|
| 2026-10-21 | [ADR-0002](ADR-0002-arquitectura-multiagente.md) | La imagen suma un tercer servicio, `agentes`, con los grafos de los agentes de IA. Escala aparte de `api` y usa la misma conexión a la base (pooler en modo sesión). El resto de esta decisión no cambia. |

## Fuentes

Consultadas el 2026-10-20.

- Presupuesto de producción del 17-oct: documento maestro (FD-01), pestaña "Presupuesto de producción".
- Vercel: [plan Pro](https://vercel.com/docs/plans/pro-plan), [duración de funciones](https://vercel.com/docs/functions/configuring-functions/duration), [regiones](https://vercel.com/docs/regions), [Fastify](https://vercel.com/docs/frameworks/backend/fastify), [WebSockets en beta](https://vercel.com/changelog/websocket-support-is-now-in-public-beta).
- Supabase: [precios](https://supabase.com/pricing), [cómputo](https://supabase.com/docs/guides/platform/compute-and-disk), [respaldos](https://supabase.com/docs/guides/platform/backups), [regiones](https://supabase.com/docs/guides/platform/regions), [conexiones y poolers](https://supabase.com/docs/guides/database/connecting-to-postgres), [PostgreSQL 17 por defecto](https://supabase.com/changelog/46080-self-hosted-supabase-upgrading-from-pg-15-to-17-breaking-change), [inicio de sesión social](https://supabase.com/docs/guides/auth/social-login).
- PostgreSQL: [funciones UUID](https://www.postgresql.org/docs/current/functions-uuid.html).
- Upstash: [precios de Redis](https://upstash.com/pricing/redis). Cloudflare: [precios de R2](https://developers.cloudflare.com/r2/pricing/).
- Railway: [precios](https://railway.com/pricing), [regiones](https://docs.railway.com/reference/deployment-regions). Render: [precios](https://render.com/pricing.md), [regiones](https://render.com/docs/regions). Fly.io: [precios](https://docs.fly.io/about/pricing), [regiones](https://docs.fly.io/reference/regions), [consolidación de regiones](https://fly.io/blog/the-region-consolidation-project/).
- VPS: [Hetzner, ajuste de precios](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/), [DigitalOcean](https://www.digitalocean.com/pricing/droplets), [Vultr, planes](https://api.vultr.com/v2/plans?type=vc2&per_page=50), [Lightsail](https://aws.amazon.com/lightsail/pricing/).
- Latencia: WonderNetwork, [Bogotá → Washington](https://wondernetwork.com/pings/Bogota/Washington), [Bogotá → Miami](https://wondernetwork.com/pings/Bogota/Miami), [Bogotá → São Paulo](https://wondernetwork.com/pings/Bogota/Sao%20Paulo), [Medellín](https://wondernetwork.com/pings/Medellin).
- Datos personales: [Ley 1581 de 2012](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=49981), [Circular Externa 005 de 2017 de la SIC](https://cancilleria.gov.co/sites/default/files/Normograma/docs/circular_superindustria_0005_2017.htm), [Decreto 1377 de 2013](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=53646), [concepto SIC sobre almacenamiento en la nube](https://sedeelectronica.sic.gov.co/publicaciones/boletin-juridico/concepto/uso-de-firebase-en-almacenamiento-de-datos-y-cumplimiento-normativo-en-colombia), [Decreto 090 de 2018 (RNBD)](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?dt=S&i=74862).
