# Event store, outbox, colas y ejecución durable sobre PostgreSQL en TypeScript (estado al 22-oct-2026)

*Las cifras de estrellas, licencias, versiones y fechas de push/release se consultaron el 22-oct-2026 en la API de GitHub (`gh api repos/...`) y en el registro npm (`npm view`). Lo que dice "Inferencia" es razonamiento propio y no viene de las fuentes.*

## 1. Event store en PostgreSQL con TypeScript: Emmett frente a las alternativas, orden global y riesgos de las secuencias

### Takeaway
Emmett (event-driven-io) es la única biblioteca TypeScript activa con un event store PostgreSQL completo: proyecciones inline, consumidores asíncronos con checkpoints y rebuild blue-green. Ordena por `(transaction_id xid8, global_position)` y los lectores solo avanzan bajo `pg_snapshot_xmin`, sin serializar a los escritores. Pero **no tiene licencia publicada**, así que hoy rige "todos los derechos reservados", y hay un RFC abierto para pasarla a AGPLv3/SSPL con licencia dual. Tampoco trae deduplicación por clave de idempotencia. Las alternativas en TS/Postgres están inactivas (Message DB, castore) o son un servidor aparte con licencia source-available (KurrentDB).

### Cited Findings

**Emmett: actividad, versiones y licencia**
- Repo `event-driven-io/emmett`: 552 estrellas, último push el 22-oct-2026, último release 0.42.4 (12-ago-2026), 28 issues abiertos. En npm, `@event-driven-io/emmett` y `@event-driven-io/emmett-postgresql` están en 0.42.4, y en `main` el paquete ya va por `0.43.0-beta.54`. — [GitHub event-driven-io/emmett](https://github.com/event-driven-io/emmett); [npm @event-driven-io/emmett-postgresql](https://www.npmjs.com/package/@event-driven-io/emmett-postgresql)
- Paquetes del monorepo: `emmett`, `emmett-postgresql`, `emmett-esdb` (EventStoreDB/KurrentDB), `emmett-mongodb`, `emmett-sqlite`, `emmett-fastify`, `emmett-expressjs`, `emmett-honojs` y `emmett-testcontainers`. — [árbol de src/packages](https://github.com/event-driven-io/emmett/tree/main/src/packages)
- **Sin licencia.** GitHub reporta `license: none`, en la raíz no hay archivo LICENSE y npm no declara campo `license`. El README tiene una sección "Why there's no license?" que dice que la licencia será "(probably) AGPLv3 and/or SSPL and open/core model with paid tools around Emmett". — [README de Emmett](https://github.com/event-driven-io/emmett#why-theres-no-license)
- El RFC "[RFC] Introducing Dual Licensing strategy in Emmett and Pongo" (PR #260) sigue **abierto**: se creó el 4-ago-2025 y se actualizó por última vez el 22-oct-2026. — [PR #260](https://github.com/event-driven-io/emmett/pull/260)
- Pongo (también de event-driven-io) muestra Apache-2.0 en GitHub: 1.378 estrellas y último release 0.16.11 (10-feb-2026); en npm ya publica betas de 0.17.0. Aun así, el RFC de licencia dual también lo incluye. Emmett usa Pongo para sus proyecciones de documentos (`projections/pongo`). — [GitHub event-driven-io/Pongo](https://github.com/event-driven-io/Pongo); [Emmett projections/pongo](https://github.com/event-driven-io/emmett/tree/main/src/packages/emmett-postgresql/src/eventStore/projections/pongo)

**Emmett: cómo asigna el orden global (código fuente)**
- La tabla de mensajes tiene `global_position BIGINT DEFAULT nextval(<secuencia>)`, `transaction_id XID8 NOT NULL` y `message_id TEXT NOT NULL`, con `PRIMARY KEY (stream_id, stream_position, partition, is_archived)`, `PARTITION BY LIST (partition)` y un índice sobre `(transaction_id, global_position)`. **`message_id` no lleva restricción UNIQUE.** — [tables.ts](https://github.com/event-driven-io/emmett/blob/main/src/packages/emmett-postgresql/src/eventStore/schema/tables.ts)
- La función de append guarda `v_transaction_id := pg_current_xact_id()` y devuelve `global_positions` y `transaction_id`. Si la condición de versión del stream no se cumple, devuelve `FALSE`, que es concurrencia optimista por stream. — [appendToStream.ts](https://github.com/event-driven-io/emmett/blob/main/src/packages/emmett-postgresql/src/eventStore/schema/appendToStream.ts)
- La lectura por lotes filtra con `AND transaction_id < pg_snapshot_xmin(pg_current_snapshot())`, ordena por `transaction_id, global_position` y compara el checkpoint como tupla `(transaction_id, global_position) > (...)`. La tabla de procesadores guarda `last_processed_transaction_id XID8`. — [readMessagesBatch.ts](https://github.com/event-driven-io/emmett/blob/main/src/packages/emmett-postgresql/src/eventStore/schema/readMessagesBatch.ts); [tables.ts](https://github.com/event-driven-io/emmett/blob/main/src/packages/emmett-postgresql/src/eventStore/schema/tables.ts)
- El consumidor PostgreSQL se construye sobre `pollingMessageSource`, es decir, **por polling**, con un `batchSize` configurable. — [postgreSQLMessageSource.ts](https://github.com/event-driven-io/emmett/blob/main/src/packages/emmett-postgresql/src/eventStore/consumers/messageSource/postgreSQLMessageSource.ts)
- En el árbol del repo no hay archivos sobre `idempot*`, `dedup*`, `inbox` ni `outbox` (búsqueda sobre el árbol completo de `main`). — [árbol del repo](https://github.com/event-driven-io/emmett)

**Emmett: proyecciones y consumidores**
- La documentación lo presenta así: "The PostgreSQL event store is the recommended choice for most production applications". Ofrece *inline projections* "within the same transaction as event appends" y *async consumers* "with batch processing and checkpointing", con checkpoints en la tabla `emt_subscriptions`. Un consumidor también puede correr sin event store, solo con un `connectionString`. — [docs/event-stores/postgresql.md](https://github.com/event-driven-io/emmett/blob/main/src/docs/event-stores/postgresql.md)
- La versión 0.42.0 (10-feb-2026) añadió el rebuild blue-green de proyecciones y bloqueo para múltiples instancias, de modo que solo corre una instancia por procesador. El id por defecto es `emt:processor:projector:${projectionName}` y hay toma de control configurable cuando otra instancia deja de reportar progreso. — [release 0.42.0](https://github.com/event-driven-io/emmett/releases/tag/0.42.0)
- El lock del procesador hashea el texto de la clave a `bigint` y tiene un timeout por defecto, lo que apunta a advisory locks. — [tryAcquireProcessorLock.ts](https://github.com/event-driven-io/emmett/blob/main/src/packages/emmett-postgresql/src/eventStore/projections/locks/tryAcquireProcessorLock.ts)

**Riesgos de las secuencias de Postgres (huecos y visibilidad fuera de orden)**
- Oskar Dudycz (28-oct-2022) explica que las secuencias y `BIGSERIAL` "are evaluated before the transaction commit". Por eso una transacción posterior puede hacer commit antes que otra con posición menor, y un rollback deja un hueco. Un poller que avanza su `last_processed_position` no distingue un rollback de una transacción en vuelo y puede **saltarse mensajes**. — [event-driven.io: ordering in Postgres outbox](https://event-driven.io/en/ordering_in_postgres_outbox/)
- La solución que propone es una columna `transaction_id xid8`, filtrar por `transaction_id < pg_snapshot_xmin(pg_current_snapshot())` y ordenar por `transaction_id, position`. Tiene dos costes: las transacciones largas retrasan a los lectores, y el orden sigue el **inicio** de la transacción, no el commit. — [mismo artículo](https://event-driven.io/en/ordering_in_postgres_outbox/)
- Alternativas que analiza el artículo: (a) números sin huecos desde una tabla singleton con `UPDATE ... RETURNING`, que "locks the table and serializes all writers" y que el autor descartó por rendimiento; (b) el *high water mark* de Marten, que detecta huecos y los rellena con tombstones y que el artículo califica de no trivial; (c) convivir con los huecos, que rechaza. El artículo **no** menciona advisory locks. — [mismo artículo](https://event-driven.io/en/ordering_in_postgres_outbox/)
- Marten (.NET, MIT) sigue muy activo: 3.467 estrellas y v9.51.0 (19-oct-2026). — [GitHub JasperFx/marten](https://github.com/JasperFx/marten)

**Alternativas de event store**
- **Message DB** (MIT): 1.653 estrellas, último push el 13-abr-2024 y último release v1.3.0 en oct-2022. Usa `global_position bigserial` como PK y su `write_message` toma `acquire_lock(stream_name)`, un lock por stream, no global. Por tanto tiene el mismo problema de visibilidad fuera de orden entre streams. — [GitHub message-db](https://github.com/message-db/message-db); [write-message.sql](https://github.com/message-db/message-db/blob/master/database/functions/write-message.sql); [messages.sql](https://github.com/message-db/message-db/blob/master/database/tables/messages.sql)
- **castore** (MIT): 276 estrellas, tiene el paquete `event-storage-adapter-postgres`, pero su último push y release (v2.5.0) son del 12-oct-2025, así que lleva un año sin actividad. — [GitHub castore-dev/castore](https://github.com/castore-dev/castore)
- **KurrentDB** (antes EventStoreDB): 5.873 estrellas, v26.2.3 (19-oct-2026). Es un servidor propio, no Postgres, bajo la **Kurrent License v1**, que es source-available y prohíbe ofrecerlo "as a hosted or managed service". El cliente Node `@kurrent/kurrentdb-client` 1.3.1 es Apache-2.0. — [GitHub kurrent-io/KurrentDB](https://github.com/kurrent-io/KurrentDB); [LICENSE.md](https://github.com/kurrent-io/KurrentDB/blob/master/LICENSE.md); [cliente Node](https://github.com/kurrent-io/KurrentDB-Client-NodeJS)
- `oskardudycz/EventSourcing.NodeJS` es material de ejemplo con licencia CC-BY-SA-4.0 y último push en mayo de 2025, no una biblioteca. — [GitHub](https://github.com/oskardudycz/EventSourcing.NodeJS)

### Inferences
- **INV_01 frente a Emmett.** Son dos estrategias opuestas para el mismo problema:
  - INV_01 (posición asignada al COMMIT con trigger diferido y `pg_advisory_xact_lock`) **serializa la cola del commit**. El lock xact se libera al terminar la transacción, después de volver visible el commit, así que el orden de posición coincide con el orden de commit y un lector nunca ve la posición N+1 sin ver antes la N. Aun así pueden quedar **huecos permanentes** si la transacción falla después de tomar la posición (otro trigger diferido, error en el commit), de modo que los consumidores deben tolerar huecos sin suponer que estén "en vuelo". El techo de throughput es aproximadamente 1 / (duración de la sección crítica, que incluye el flush del WAL) y crece con los eventos por transacción. Esto es coherente con los ~800 eventos/s estimados, pero falta medirlo en Supabase.
  - Emmett **no serializa a los escritores**: ordena por xid de inicio de escritura y empuja el coste a los lectores, que esperan a que termine toda transacción con xid menor.
  - En Supabase el riesgo de Emmett es que una transacción larga de **cualquier** origen en el clúster (pg_cron, migraciones, un análisis con escritura) congela a todos los consumidores. El riesgo de INV_01 es la contención en el lock global ante picos de escritura.
  - Hay que verificar con una prueba de carga que el lock se libera solo después de que el commit es visible (comportamiento de `CommitTransaction` en PG17).
- **INV_02 con Emmett.** Emmett no da `UNIQUE(idempotency_key)` ni compara payloads JSONB. Habría que añadir una tabla de deduplicación en la misma transacción, lo que exige que Emmett permita ejecutar el append dentro de una transacción del llamador. No lo verifiqué; ver Gaps. Su concurrencia optimista por versión de stream es complementaria, no sustituye a la clave de idempotencia.
- **PEN-02.** Adoptar Emmett hoy implica: (1) depender de código sin licencia otorgada, con un cambio previsto a AGPLv3/SSPL más licencia comercial, delicado para un piloto municipal y para cualquier SaaS futuro; (2) ser 0.x con cambios de esquema que traen migraciones (0_36_0, 0_38_7, 0_42_0, 0_43_0); (3) consumidores por polling, compatibles con el pooler de sesión. Lo que se gana: proyecciones inline y asíncronas, rebuild blue-green y lock de procesador ya resueltos. Un `appendCanonicalEvent` propio puede copiar la idea de `xid8` + `pg_snapshot_xmin` o mantener INV_01, sin dependencia de licencia.
- Ni Message DB, ni castore, ni KurrentDB encajan: los dos primeros por inactividad y el modelo de lock por stream de Message DB, y KurrentDB por requerir infraestructura extra con licencia source-available.

### Gaps
- No encontré benchmarks publicados con metodología del throughput de append de Emmett sobre Postgres, ni medición del techo de INV_01; ambos requieren una prueba propia en Supabase Micro/Small.
- No verifiqué si `appendToStream` de Emmett acepta una conexión o transacción externa para combinar el append con una tabla de deduplicación propia; está en el código de Dumbo/`postgreSQLEventStore.ts` y no lo revisé a fondo.
- No se sabe cuándo se resolverá el RFC #260 ni con qué licencia exacta; tampoco qué pasa con los usos de versiones publicadas sin licencia (consulta legal).
- No investigué "Eventual" (el antiguo proyecto functionless/eventual).

## 2. Outbox/relay y proyecciones a través del pooler de sesión de Supabase

### Takeaway
Con Supavisor en modo sesión (puerto 5432) funcionan LISTEN/NOTIFY, los advisory locks de sesión y las sentencias preparadas, así que valen tanto el polling con `SKIP LOCKED` o `xid8` como el "polling con NOTIFY como despertador". La replicación lógica **no** pasa por el pooler: necesita conexión directa, que es IPv6 salvo que se compre el add-on IPv4. El presupuesto de conexiones (Micro: 60 directas) y el coste de NOTIFY en el commit son las restricciones prácticas.

### Cited Findings
- Según Supabase, la conexión directa es IPv6 ("or on IPv4 if the project has the IPv4 add-on"). El pooler compartido (sesión 5432 y transacción 6543) es solo IPv4. El modo transacción no soporta sentencias preparadas, `set/reset`, advisory locks de sesión, `LISTEN`/`NOTIFY` ni tablas temporales; "Direct connections and session mode support all four". — [Supabase: Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- Para "Migrations, `pg_dump`, backup and restore, or replication" Supabase recomienda la conexión directa. El pooler dedicado (PgBouncer, planes de pago) solo ofrece modo transacción. — [misma página](https://supabase.com/docs/guides/database/connecting-to-postgres)
- Límites por cómputo: Micro (~US$10/mes, 1 GB) 60 conexiones directas y 200 clientes en el pooler; Small (~US$15/mes, 2 GB) 90/400; Medium (~US$60/mes, 4 GB) 120/600. — [Supabase: Compute and disk](https://supabase.com/docs/guides/platform/compute-and-disk)
- En Supavisor, el *pool size* limita las conexiones directas por combinación usuario+base+modo, y sesión y transacción comparten ese tope. En modo sesión se abre una conexión directa nueva por cliente hasta llegar al pool size y se cierra en cuanto el cliente se va. — [Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI)
- Railway ofrece **IPv6 saliente opcional por servicio** (`railway outbound-network ipv6 enable`), y el tráfico entrante público sigue siendo IPv4. En hilos más antiguos del foro, el staff decía que el IPv6 saliente no estaba soportado. Esto viene de resúmenes de búsqueda, no de lectura directa. — [Railway changelog 2026-07-03](https://railway.com/changelog/2026-07-03-the-peaceful-way-to-ship-software); [Railway CLI outbound-network](https://docs.railway.com/cli/outbound-network); [foro Railway: Supabase IPv6](https://station.railway.com/questions/i-pv6-feature-flag-can-t-connect-to-sup-38b41ca1)
- **NOTIFY y el lock global.** Recall.ai documentó que una transacción que emite `NOTIFY` toma un lock global durante el commit, lo que serializa los commits. DBOS replicó que el lock es real pero alcanzó 60K escrituras/s en un solo servidor tras optimizar su uso. En pgsql-hackers se discute si el lock es la causa o un síntoma. — [Recall.ai](https://recall.ai/blog/postgres-listen-notify-does-not-scale); [DBOS: LISTEN/NOTIFY Actually Scales](https://dbos.dev/blog/postgres-listen-notify-scalability); [pgsql-hackers](https://www.postgresql.org/message-id/ab1b986a-8ae2-469e-a680-11c1ce8fd4e8%40app.fastmail.com)
- DBOS combina LISTEN/NOTIFY, con notificaciones agrupadas fuera del camino de escritura, con polling ocasional porque las notificaciones pueden perderse. Los comentarios de su código dicen que un NOTIFY puede descartarse "and only the PG server log may note it". — [dbos-transact-ts system_database.ts](https://github.com/dbos-inc/dbos-transact-ts/blob/main/src/system_database.ts)
- Graphile Worker usa `LISTEN`/`NOTIFY` para enterarse de trabajos nuevos y `SKIP LOCKED` para tomarlos. — [Graphile Worker docs](https://worker.graphile.org/docs)
- pg-boss "relies on Postgres's SKIP LOCKED". Sus workers hacen polling y LISTEN/NOTIFY está disponible para entregas de baja latencia; permite crear trabajos dentro de una transacción existente (adaptadores para Drizzle, Knex, Kysely y Prisma). — [README pg-boss](https://github.com/timgit/pg-boss)
- `pg-transactional-outbox` (Zehelein, MIT): 36 estrellas, 0.6.7, último push el 9-oct-2026. Implementa los patrones outbox e *inbox* para PostgreSQL y trae un ejemplo con RabbitMQ. — [GitHub Zehelein/pg-transactional-outbox](https://github.com/Zehelein/pg-transactional-outbox)
- Los consumidores de Emmett son relays por polling con `xid8` y checkpoints, y se pueden lanzar solo con `connectionString`. — [docs Emmett PostgreSQL](https://github.com/event-driven-io/emmett/blob/main/src/docs/event-stores/postgresql.md); [readMessagesBatch.ts](https://github.com/event-driven-io/emmett/blob/main/src/packages/emmett-postgresql/src/eventStore/schema/readMessagesBatch.ts)

### Inferences
- **Patrón más compatible con las restricciones:** relay por polling sobre `planetario_events` usando la posición canónica de INV_01, o `xid8` + `xmin` si se cambia el diseño. Opcionalmente se añade NOTIFY como despertador, nunca como única señal (DBOS y Emmett mantienen el polling por esta razón). Funciona por el pooler de sesión y no requiere IPv6.
- Si INV_01 ya serializa los commits, añadir `NOTIFY` en las mismas transacciones suma un segundo punto de serialización. A ~0,4 eventos/s en el MVP no importa; a 48 eventos/s probablemente tampoco, pero conviene medirlo. Alternativa: el relay emite el NOTIFY tras leer, o se usa solo polling con intervalo corto.
- La **replicación lógica** (Debezium, `pgoutput` o bibliotecas que la usen) implica conexión directa: IPv6 saliente opcional en Railway o el add-on IPv4 de Supabase. Además es un slot de replicación que hay que vigilar porque retiene WAL. Para el MVP aporta poco frente al polling.
- **Presupuesto de conexiones.** En modo sesión cada cliente ocupa una conexión real y Micro tiene 60 directas. Cada biblioteca que abre su propio pool (pg-boss, Graphile Worker, DBOS, el checkpointer de LangGraph, Dumbo/Emmett) en 3 servicios × N réplicas puede agotarlas. Conviene preferir bibliotecas que acepten un `pg.Pool` o un adaptador inyectado y fijar topes explícitos por servicio.
- Cumplir INV_05 es independiente de la biblioteca: los relays que hacen HTTP (notificador de Telegram, pasarelas) deben liberar la conexión antes de la llamada. Por eso conviene un diseño de "reclamar (lease) → soltar conexión → llamar → registrar resultado".

### Gaps
- No encontré documentación de Supabase sobre el pool size por defecto de Supavisor por tamaño de cómputo; hay que mirarlo en el dashboard del proyecto.
- No confirmé en la documentación primaria de Railway la fecha ni el alcance exactos del IPv6 saliente (solo changelog y foro vía resumen de búsqueda).
- No verifiqué si `pg-transactional-outbox` soporta replicación lógica, polling o ambos; el README principal que revisé no lo detalla.

## 3. Colas de trabajos: pg-boss, Graphile Worker, BullMQ y Supabase Queues (pgmq)

### Takeaway
pg-boss (v12, MIT, muy activo) y Graphile Worker (v0.18, MIT) son las dos colas Postgres maduras para Node 24. Las dos funcionan por el pooler de sesión y permiten encolar en la misma transacción que el hecho de negocio. pg-boss trae más funciones de "plataforma" (políticas de cola, DLQ con redrive, cron/RRULE, dependencias entre trabajos, dashboard) y Graphile Worker prioriza la latencia (<3 ms con LISTEN/NOTIFY). BullMQ depende de Redis, lo que choca con la regla de no confiar hechos a Redis. pgmq/Supabase Queues es una primitiva tipo SQS sin reintentos, backoff ni cron integrados.

### Cited Findings

**pg-boss**
- 4.077 estrellas, licencia MIT, último push el 21-oct-2026. En npm está en `12.38.0` (13-oct-2026) y requiere Node ≥22.12 y PostgreSQL ≥13. Del 23-sep al 13-oct-2026 salieron 12.34.0, 12.35.0, 12.35.1, 12.36.0, 12.37.0, 12.37.1 y 12.38.0, más releases de `dashboard` y `proxy`. — [GitHub timgit/pg-boss](https://github.com/timgit/pg-boss); [releases](https://github.com/timgit/pg-boss/releases); [npm pg-boss](https://www.npmjs.com/package/pg-boss)
- Funciones según el README: creación transaccional de trabajos; workers con backpressure y LISTEN/NOTIFY; orquestación de dependencias entre trabajos; programación cron y RRULE; políticas de almacenamiento para rate limiting, debouncing y concurrencia; colas con prioridad; DLQ con redrive; reintentos con backoff exponencial; pub/sub (fan-out); SQL para otros runtimes; OpenTelemetry; compatibilidad multi-master; PGlite embebido; CLI de migraciones; `@pg-boss/dashboard` y `@pg-boss/proxy`. El README no da cifras de throughput. — [README pg-boss](https://github.com/timgit/pg-boss)
- **v10** (17-ago-2024): tabla de trabajos particionada; las colas deben crearse antes de usarse y cada una tiene una política (`standard`, `short`, ...); "Job retries are now opt-out", con `retryLimit` 2 por defecto, lo que puede romper handlers no idempotentes; sin migración automática desde v9. — [release 10.0.0](https://github.com/timgit/pg-boss/releases/tag/10.0.0)
- **v11** (26-sep-2025): sin migración automática desde v10; la partición dedicada por cola pasa a ser opcional (`partition: true`) porque miles de colas, y por tanto miles de tablas, "combined with some connection poolers produced OOMs related to how query plan caching works"; se eliminan las tablas de archivo. — [release 11.0.0](https://github.com/timgit/pg-boss/releases/tag/11.0.0)
- **v12** (9-nov-2025): migración a ESM y TypeScript, sin export por defecto (`import { PgBoss }`), y Node ≥22.12. — [release 12.0.0](https://github.com/timgit/pg-boss/releases/tag/12.0.0)

**Graphile Worker**
- 2.421 estrellas, MIT, v0.18.0 (8-sep-2026), publicado como ESM puro. Requiere Node ≥22.18 según `engines` en npm y se configura con `graphile.config.ts` (abandona cosmiconfig). — [GitHub graphile/worker](https://github.com/graphile/worker); [release v0.18.0](https://github.com/graphile/worker/releases/tag/v0.18.0); [npm graphile-worker](https://www.npmjs.com/package/graphile-worker)
- Latencia "typically under 3ms from task schedule to execution". Usa LISTEN/NOTIFY y SKIP LOCKED, tiene crontab con backfill, deduplicación por `job_key` y trabajos por lotes, y reintenta con backoff exponencial (25 intentos en ~3 días por defecto). Se puede encolar desde SQL en transacción ("Adding jobs through SQL"). No publica cifras de jobs/s en esa página. — [Graphile Worker docs](https://worker.graphile.org/docs)
- El World PostgreSQL de Vercel Workflow DevKit depende de `graphile-worker` 0.16.6. — [package.json world-postgres](https://github.com/vercel/workflow/blob/main/packages/world-postgres/package.json)

**BullMQ**
- 9.529 estrellas, MIT, v6.4.0 (21-oct-2026). — [GitHub taskforcesh/bullmq](https://github.com/taskforcesh/bullmq)

**pgmq / Supabase Queues / pgflow**
- `pgmq`: 5.344 estrellas, licencia PostgreSQL, v1.13.1 (20-oct-2026). Se presenta "Like AWS SQS ... but on Postgres": entrega "exactly once" dentro de un *visibility timeout*, colas FIFO con claves de grupo, archivado y contador `read_ct`. — [GitHub pgmq/pgmq](https://github.com/pgmq/pgmq)
- Supabase Queues se define como "a Postgres-native durable Message Queue system with guaranteed delivery built on the pgmq database extension", con control por RLS, archivado y monitorización en el dashboard. La página no menciona reintentos, backoff, DLQ, cron, precios ni límites. — [Supabase Queues](https://supabase.com/docs/guides/queues)
- `pgflow` (Apache-2.0, 311 estrellas, 0.17.2): "AI workflows in Supabase, no extra infra", construido sobre Postgres + **Edge Functions** (pgmq, pg_cron y tablas de estado). — [GitHub pgflow-dev/pgflow](https://github.com/pgflow-dev/pgflow)

### Inferences

| Criterio | pg-boss 12 | Graphile Worker 0.18 | pgmq / Supabase Queues | BullMQ 6 |
|---|---|---|---|---|
| Almacén | Postgres | Postgres | Postgres (extensión) | Redis |
| Encolar en la misma transacción del hecho | Sí (adaptadores y SQL) | Sí (SQL `add_job`) | Sí (SQL) | No |
| Reintentos, backoff y DLQ integrados | Sí (DLQ con redrive) | Reintentos y backoff (DLQ no documentada en la página revisada) | No (visibility timeout y `read_ct`, lo demás a mano) | Sí |
| Cron | Cron y RRULE | Crontab | pg_cron aparte | Sí |
| Wake-up | Polling + LISTEN/NOTIFY | LISTEN/NOTIFY | Polling | Redis |
| Pooler de sesión | Compatible | Compatible (requiere sesión para LISTEN) | Compatible | N/A |

- pg-boss ya está en la arquitectura y cubre colas, cron, DLQ y concurrencia por cola. Su riesgo histórico son las **migraciones mayores sin migración automática** (v9→v10, v10→v11) y el cambio a reintentos por defecto. Hay que fijar la versión mayor y probar las actualizaciones. A 0,4 o 48 eventos/s ninguna de las dos colas Postgres debería ser un cuello de botella, pero no hay benchmark publicado que lo confirme.
- Graphile Worker sería la alternativa si la latencia de notificación importa (SSE al comprador). Ganar latencia por LISTEN/NOTIFY implica asumir la discusión sobre el lock global de NOTIFY (sección 2).
- pgmq encaja como primitiva, no como sustituto de pg-boss: faltarían backoff, DLQ y cron. pgflow ata los workers a Edge Functions y no encaja con un worker en Railway.
- Usar BullMQ obligaría a mover hechos confirmados (trabajos derivados de pagos) a Redis o a hacer dual-write, lo que contradice la regla del proyecto.

### Gaps
- No hay benchmarks primarios con metodología para pg-boss 12 ni para Graphile Worker 0.18 (jobs/s en Postgres gestionado).
- No verifiqué el nombre exacto ni la semántica actual de las políticas de pg-boss 12 (singleton, stately, grupos) en pgboss.io; el README las menciona de forma genérica.
- No encontré si Supabase Queues cobra aparte (la página no lo indica).

## 4. Motores de ejecución durable usables desde TypeScript en 2026

### Takeaway
Solo un grupo pequeño corre **sobre nuestra propia Postgres sin servicio adicional**: DBOS Transact (MIT, v5.3, con documentación oficial para Supabase vía Session pooler), Absurd (Apache-2.0, 0.5, experimental), OpenWorkflow (Apache-2.0, 0.11) y el World Postgres de Vercel Workflow (implementación de referencia sin autenticación). Temporal, Restate, Inngest, Trigger.dev y Hatchet exigen su propio servidor o su nube. Restate (BSL) e Inngest (SSPL con conversión diferida a Apache) son source-available. Cloudflare Workflows solo corre en Workers.

### Cited Findings

**DBOS Transact (TypeScript)**
- `dbos-inc/dbos-transact-ts`: 1.409 estrellas, MIT, v5.3 (15-oct-2026). En npm, `@dbos-inc/dbos-sdk` 5.3.0 requiere Node ≥20. — [GitHub](https://github.com/dbos-inc/dbos-transact-ts); [npm](https://www.npmjs.com/package/@dbos-inc/dbos-sdk)
- "DBOS provides lightweight durable workflows built on top of Postgres", con colas durables que ofrecen concurrencia por cola o por proceso, timeouts, rate limit, deduplicación y prioridad, "They don't require a separate queueing service or message broker—just Postgres". También trae notificaciones y programación. — [README DBOS](https://github.com/dbos-inc/dbos-transact-ts)
- Semántica: los pasos "are tried at least once but are never re-executed after they complete"; las transacciones "commit exactly once"; "An assigned workflow ID acts as an idempotency key". Los workflows deben ser deterministas (`DBOSStepNondeterminismError`). `DBOS.sleep()` y los timeouts son durables. Una excepción no capturada deja el workflow en `ERROR` sin recuperación automática. — [DBOS workflow tutorial](https://docs.dbos.dev/typescript/tutorials/workflow-tutorial)
- Con Supabase: "Make sure your connection method is set to 'Direct connection' (if your database supports it) or to 'Session pooler'". Se configura con `DBOS_SYSTEM_DATABASE_URL` y las tablas quedan en el esquema `dbos`. — [DBOS docs: Supabase](https://github.com/dbos-inc/dbos-docs/blob/main/docs/integrations/supabase.md); [blog Supabase + DBOS](https://supabase.com/blog/durable-workflows-in-postgres-dbos)
- Precios: Transact es "free forever". Conductor, el plano de control opcional, cuesta US$99/mes en Pro (1M checkpoints) y US$499/mes en Teams. DBOS Cloud se negocia con ventas. — [DBOS pricing](https://www.dbos.dev/pricing)

**Absurd**
- `earendil-works/absurd`: 2.506 estrellas, Apache-2.0, 0.5.1 (20-oct-2026). Es un solo archivo `absurd.sql` sin otros servicios, pull-based ("does not support push at all"), con pasos checkpointed, sleep, eventos, SDKs TypeScript y Python (Go experimental), CLI `absurdctl` y UI "habitat". Se describe como "An experiment in durability". Lo anunció un post del 3-nov-2025 en lucumr.pocoo.org. — [GitHub absurd](https://github.com/earendil-works/absurd); [anuncio](https://lucumr.pocoo.org/2025/11/3/absurd-workflows/)

**OpenWorkflow**
- `openworkflowdev/openworkflow`: 1.339 estrellas, Apache-2.0. En npm, `openworkflow` 0.11.0 requiere Node ≥22.22. Soporta backends PostgreSQL o SQLite, tiene una API `step.run` y publica un "Production Checklist". — [GitHub](https://github.com/openworkflowdev/openworkflow); [npm](https://www.npmjs.com/package/openworkflow)

**Vercel Workflow DevKit ("Workflow SDK")**
- `vercel/workflow`: 2.470 estrellas, Apache-2.0. En npm, `workflow` 5.2.3 y `@workflow/world-postgres` 5.0.5. La documentación se mudó a workflow-sdk.dev. — [GitHub vercel/workflow](https://github.com/vercel/workflow); [npm workflow](https://www.npmjs.com/package/workflow)
- El README de `@workflow/world-postgres` dice "This is a reference implementation": se distribuye "**without authentication**", la ruta `POST /.well-known/workflow/v1/flow` "is publicly reachable by default" y "we highly recommend cloning this reference implementation and adapting it" para producción. Depende de `graphile-worker`, `drizzle-orm` y `pg`. — [README world-postgres](https://github.com/vercel/workflow/tree/main/packages/world-postgres)

**Temporal**
- El servidor `temporalio/temporal` es MIT, con 23.921 estrellas y v1.31.4. El SDK TS es MIT, con 938 estrellas y v1.24.0 (Node ≥20.3). — [GitHub temporal](https://github.com/temporalio/temporal); [GitHub sdk-typescript](https://github.com/temporalio/sdk-typescript)
- Temporal Cloud pay-as-you-go no tiene cuota base, cuesta "Starting at $50 per million actions" y ofrece US$150 de crédito por 90 días; Business arranca en US$500/mes. — [Temporal pricing](https://temporal.io/pricing)

**Restate**
- El servidor está bajo **Business Source License 1.1**, con un "Additional Use Grant" que prohíbe ofrecer una "Public Restate Platform Service". Tiene 4.591 estrellas y v1.7.14 (22-oct-2026). El SDK TS es MIT (v1.17.4). — [LICENSE restate](https://github.com/restatedev/restate/blob/main/LICENSE); [SDK TS](https://github.com/restatedev/sdk-typescript)
- Es "a single binary" con almacenamiento propio embebido: metadatos Raft, log durable replicado y cachés RocksDB. Requiere volumen persistente y no usa Postgres. — [Restate server overview](https://docs.restate.dev/server/overview)

**Inngest**
- El servidor está bajo **SSPL v1 con "Apache 2.0 Future License"**: 5.971 estrellas, v1.47.0. El SDK `inngest` en npm (4.25.0) declara Apache-2.0, **pero** la API de GitHub reporta GPL-3.0 para el repo `inngest/inngest-js`; es una discrepancia sin resolver. — [LICENSE inngest](https://github.com/inngest/inngest/blob/main/LICENSE.md); [npm inngest](https://www.npmjs.com/package/inngest); [GitHub inngest-js](https://github.com/inngest/inngest-js)
- Self-hosting: es "a single binary that includes all Inngest services"; SQLite por defecto "does not support scaling beyond a single node"; Postgres y Redis externos son opcionales. El soporte para self-host no está garantizado y no hay limpieza automática de filas antiguas. — [Inngest self-hosting](https://www.inngest.com/docs/self-hosting)
- Cloud: Free con 50k ejecuciones/mes y 5 pasos concurrentes; Pro desde US$99/mes. Las ejecuciones se cuentan como runs × (steps + 1). — [Inngest pricing](https://www.inngest.com/pricing)

**Trigger.dev**
- Repo Apache-2.0 con 16.604 estrellas y v4.7.7; SDK MIT. En self-host la "Webapp" incluye Redis y Postgres, además de un supervisor y builds de imágenes de despliegue. — [GitHub](https://github.com/triggerdotdev/trigger.dev); [self-hosting overview](https://github.com/triggerdotdev/trigger.dev/blob/main/docs/self-hosting/overview.mdx)
- Cloud: Free US$0 (US$5 de crédito, 20 runs concurrentes), Hobby US$10 y Pro US$50, a US$0,000025 por invocación. — [Trigger.dev pricing](https://trigger.dev/pricing)

**Hatchet**
- MIT, 8.167 estrellas; SDK TS 1.40.0. Self-host con Docker Compose usa Postgres y RabbitMQ opcional (`SERVER_MSGQUEUE_KIND=postgres` para usar solo Postgres). El compose de ejemplo levanta Postgres con `max_connections=1000`, y hay una guía "using-pgbouncer". — [GitHub hatchet](https://github.com/hatchet-dev/hatchet); [docker-compose.mdx](https://github.com/hatchet-dev/hatchet/blob/main/frontend/docs/content/docs/self-hosting/docker-compose.mdx)
- Cloud de pago por uso: 1M task runs/mes incluidos y luego US$30 por millón. Se declara "100% open-source and MIT licensed". — [Hatchet pricing](https://hatchet.run/pricing)

**Cloudflare Workflows**
- "Build durable multi-step applications on Cloudflare Workers with Workflows", con `step.do`, `step.sleep` y `step.waitForEvent`, disponible en planes Free y Paid. — [Cloudflare Workflows](https://developers.cloudflare.com/workflows/)

**LangGraph**
- `langchain-ai/langgraphjs` (MIT, 3.370 estrellas) y `@langchain/langgraph-checkpoint-postgres` 1.1.2 (MIT). — [GitHub](https://github.com/langchain-ai/langgraphjs); [npm](https://www.npmjs.com/package/@langchain/langgraph-checkpoint-postgres)

### Inferences

| Motor | Corre sobre nuestra Postgres sin servicio extra | Licencia | Coste MVP | Madurez | Encaje con Supabase sesión |
|---|---|---|---|---|---|
| DBOS Transact | Sí (biblioteca + esquema `dbos`) | MIT (Conductor de pago opcional) | US$0 | v5, activo | Documentado (Session pooler) |
| Absurd | Sí (un SQL + SDK) | Apache-2.0 | US$0 | 0.5, "experiment" | Probable (pull, sin push); no verificado |
| OpenWorkflow | Sí (backend Postgres) | Apache-2.0 | US$0 | 0.11 | No verificado |
| Vercel Workflow + world-postgres | Sí (usa graphile-worker) | Apache-2.0 | US$0 | Referencia, sin auth | Necesita ruta HTTP propia protegida |
| Hatchet | No (motor Go + Postgres) | MIT | Cloud gratis hasta 1M runs | Activo | Pide muchas conexiones |
| Inngest | No (binario + Postgres/Redis) | SSPL → Apache diferido | Free 50k ejecuciones | Activo | Servicio extra |
| Trigger.dev | No (webapp, Redis, Postgres, builds) | Apache-2.0 | Free con US$5 | v4, activo | Servicio extra |
| Temporal | No (Temporal Service o Cloud) | MIT | Cloud: US$50/M actions | Muy maduro | Servicio extra |
| Restate | No (binario con almacenamiento propio) | BSL 1.1 | Self-host o Cloud | Activo | No usa Postgres |
| Cloudflare Workflows | No (solo Workers) | Propietario | Plan de CF | GA (no confirmado en la página) | No aplica a Railway |

- **¿Puede sustituir algo de lo hecho a mano?** DBOS es el único candidato serio que cumple "solo Postgres + pooler de sesión + MIT + TS":
  - Sus colas, con concurrencia, rate limit, deduplicación y prioridad, y sus workflows programados podrían **sustituir a pg-boss**.
  - Sus workflows, con el ID como clave de idempotencia (por ejemplo `update_id` de Telegram o el id de evento del proveedor de pago), podrían modelar los procesos largos del pedido (cobro emitido → vencimiento → aceptado...).
  - **No sustituye al event store canónico** (INV_01/INV_02). DBOS guarda checkpoints de workflows, no un log global ordenado de hechos de negocio, así que el outbox/relay sigue siendo nuestro o pasa a ser "el append canónico inicia un workflow" en la misma transacción. Esto último depende de que el "transaction step" de DBOS comparta transacción con nuestro esquema (ver Gaps).
  - Su modelo de "steps" fuera de transacción encaja con INV_05.
  - Introducirlo **además** de pg-boss duplicaría colas, crons y conexiones: habría que elegir uno.
- **Riesgos de DBOS:** reglas de determinismo y versionado de workflows (un cambio de código con workflows en vuelo), usa LISTEN/NOTIFY (sección 2), consume conexiones propias y un `ERROR` no se recupera solo. Sin Conductor, la observabilidad depende de consultar el esquema `dbos`.
- Absurd y OpenWorkflow son atractivos por su simplicidad (SQL más SDK), pero están en 0.x y el primero se declara experimental, lo que es arriesgado como base de pagos para el 10-dic-2026. El World Postgres de Vercel exige añadir autenticación y es de referencia.
- Temporal, Restate, Inngest, Trigger.dev y Hatchet añaden un servicio (o una nube) a la factura y a la operación. Con un presupuesto de US$35–61/mes, sus niveles gratuitos podrían bastar para el MVP, pero los datos de workflow vivirían fuera de Supabase (Restate e Inngest además son source-available), lo que rompe la idea de "una sola Postgres como fuente de verdad".
- **LangGraph:** ninguno de los motores revisados reemplaza de forma documentada el checkpointer de LangGraph.js. Lo razonable es mantener `@langchain/langgraph-checkpoint-postgres` para el estado del agente y, si se adopta un motor durable, envolver las invocaciones del grafo como pasos.

### Gaps
- No verifiqué si los "transaction steps" o datasources de DBOS v5 pueden ejecutar escrituras en nuestro esquema dentro de la misma transacción que su checkpoint, que es clave para el exactly-once con `planetario_events`.
- No encontré benchmarks independientes con metodología para DBOS, Absurd u OpenWorkflow sobre Postgres gestionado.
- No revisé el detalle de versionado de workflows en DBOS ("Upgrading Workflow Code"), ni la estabilidad de esquema de Absurd y OpenWorkflow entre versiones 0.x.
- No confirmé la "Change Date" ni la licencia de conversión del BSL de Restate (solo leí el encabezado del LICENSE).
- No verifiqué si existe integración documentada DBOS–LangGraph para JS.

## 5. Máquina de estados del pedido: XState v5 frente a una tabla de transiciones en el dominio

### Takeaway
XState v5 está activo y es MIT (`xstate` 5.33.3, más de 30.000 estrellas), pero su valor principal (actores, statecharts jerárquicos, inspección visual) excede lo que pide un ciclo de pedido de 11 estados persistido como eventos. Una tabla de transiciones pura en el dominio encaja mejor con event sourcing y con la arquitectura hexagonal. No encontré fuentes primarias que comparen ambos enfoques para el caso concreto.

### Cited Findings
- `statelyai/xstate`: 30.342 estrellas, MIT, último push el 21-oct-2026. En npm, `xstate` 5.33.3 se modificó el 19-oct-2026. — [GitHub statelyai/xstate](https://github.com/statelyai/xstate); [npm xstate](https://www.npmjs.com/package/xstate)
- Los motores durables documentan sus propias primitivas de espera y temporización: `DBOS.sleep()` durable y timeouts persistidos, y en Cloudflare `step.waitForEvent` con timeout de 24 h como ejemplo. Son el mecanismo natural para estados con caducidad como `cobro_vencido`. — [DBOS workflow tutorial](https://docs.dbos.dev/typescript/tutorials/workflow-tutorial); [Cloudflare Workflows](https://developers.cloudflare.com/workflows/)

### Inferences
- En un modelo event-sourced, el estado del pedido es un **fold** de eventos (`decide(command, state) → events`, `evolve(state, event) → state`). Una tabla de transiciones `Record<Estado, Partial<Record<Comando, Estado[]>>>` es determinista, serializable, testeable con tablas y no tiene dependencias. Es la forma más simple de imponer que solo se acepten las transiciones válidas (`creado → cobro_emitido → pago_informado → pagado → aceptado → en_camino → entregado → evaluado`, más `cobro_vencido`, `cancelado` y `reembolsado`).
- XState v5 aporta guardas, estados jerárquicos o paralelos y visualización, útiles si el pedido llega a tener subestados concurrentes (por ejemplo pago y logística en paralelo). En cambio, añade un runtime de actores cuyo estado persistido (snapshots) compite con el event store como fuente de verdad. Una opción intermedia es usar XState solo como especificación y validación (`machine.transition` puro) sin persistir sus snapshots.
- Los temporizadores de negocio (vencimiento del cobro) no deberían vivir en memoria de un actor XState: deben ser un trabajo programado (pg-boss) o un sleep durable (DBOS) que emita un comando idempotente.

### Gaps
- No encontré documentación primaria ni casos publicados de XState v5 combinado con event sourcing en Postgres en producción.
- No verifiqué el estado actual de las herramientas de Stately (editor visual, licencias del studio) en 2026.
