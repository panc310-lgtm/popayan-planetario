# Núcleo hexagonal (puertos y adaptadores) / DDD / CQRS en TypeScript como base del "harness" de Popayán Planetario

Fecha de corte: 22-oct-2026. Estrellas, fechas de último commit y licencias se tomaron ese día de la API de GitHub (`api.github.com/repos/...` y `gh api`) y las versiones de paquetes del registro de npm (`registry.npmjs.org`). Las estrellas son aproximadas y cambian a diario. "Último commit" significa el último commit de la rama por defecto; `pushed_at` puede ser más reciente porque incluye otras ramas. Esta nota es solo investigación: presenta opciones, compromisos y riesgos, y no toma decisiones.

---

## 1. Arquitecturas de referencia: ¿existen?, licencia, actividad, qué enseñan, qué copiar y qué evitar

### Takeaway
`Sairyss/domain-driven-hexagon` existe, tiene licencia MIT y unas 15 000 estrellas. Sigue siendo el mejor *catálogo de patrones*, pero está congelado desde mayo de 2024 sobre NestJS 9, TypeScript 4.7 y `@types/node` 16. Sirve como lectura de referencia, no como plantilla. El repositorio vivo más cercano al stack aprobado (Fastify 5, Node ≥24, pnpm, TypeBox 1, Ajv 8, Awilix, dependency-cruiser y buses CQRS con middlewares) es `marcoturi/fastify-boilerplate` (MIT, 472 estrellas), que declara haber adaptado su diagrama de Sairyss. Effect 4.0 (GA el 30-sep-2026, MIT, LTS hasta sep-2029) es la alternativa funcional seria. `event-driven-io/emmett`, que ya figura en el registro de arquitectura, **no tiene licencia** y su autor anuncia AGPLv3/SSPL. Eso es un riesgo legal.

### Cited Findings

**Estado verificado de los repositorios (22-oct-2026)**

| Repositorio | Licencia | Último commit en rama principal | ★ aprox. | Stack / notas | Fuente |
|---|---|---|---|---|---|
| Sairyss/domain-driven-hexagon | MIT | 2024-05-14 ("docs: fixed typo"); `pushed_at` 2024-06-11; no está archivado | 14 992 | NestJS ^9, @nestjs/cqrs ^9.0.1, Slonik ^31, zod ^3.21, class-validator, oxide.ts, TS ^4.7.4, @types/node ^16, dependency-cruiser ^12.10, ESLint 8, Jest 28 | [GitHub](https://github.com/Sairyss/domain-driven-hexagon), [package.json](https://raw.githubusercontent.com/Sairyss/domain-driven-hexagon/master/package.json) |
| Sairyss/backend-best-practices | MIT | `pushed_at` 2024-08-29 | 2 401 | Solo documentación | [GitHub](https://github.com/Sairyss/backend-best-practices) |
| stemmlerjs/ddd-forum | **ISC** | 2023-06-10 | 2 097 | DDD en TS (Khalil Stemmler) | [GitHub](https://github.com/stemmlerjs/ddd-forum) |
| jbuget/nodejs-clean-architecture-app | MIT | 2020-06-04 | 1 536 | JavaScript, no TS | [GitHub](https://github.com/jbuget/nodejs-clean-architecture-app) |
| talyssonoc/node-api-boilerplate | MIT | 2022-08-25 | 3 359 | TS | [GitHub](https://github.com/talyssonoc/node-api-boilerplate) |
| CodelyTV/typescript-ddd-example | **sin licencia detectada** | 2024-08-20 | 1 478 | TS DDD | [GitHub](https://github.com/CodelyTV/typescript-ddd-example) |
| CodelyTV/typescript-ddd-skeleton | **sin licencia detectada** | `pushed_at` 2024-04-29 | 472 | — | [GitHub](https://github.com/CodelyTV/typescript-ddd-skeleton) |
| rmanguinho/clean-node-api | MIT | 2026-09-09 (docs) | 421 | GitHub lo clasifica como JavaScript | [GitHub](https://github.com/rmanguinho/clean-node-api) |
| rmanguinho/clean-ts-api | **GPL-3.0** | `pushed_at` 2026-09-09 | 1 914 | Clean Architecture, TDD | [GitHub](https://github.com/rmanguinho/clean-ts-api) |
| **marcoturi/fastify-boilerplate** | MIT | 2026-10-22 (commits de Renovate) | 472 | Fastify 5.12.7, Node ≥24, pnpm ≥11, TypeBox 1.4.2, Ajv 8.20, Awilix 13, postgres.js, dbmate, OpenTelemetry, dependency-cruiser 18.6, TS 6.0.3, Biome | [GitHub](https://github.com/marcoturi/fastify-boilerplate) |
| bitloops/ddd-hexagonal-cqrs-es-eda | MIT | 2026-10-22 (merges de Dependabot) | 1 450 | NestJS, PostgreSQL, NATS/JetStream, Jaeger/Grafana, Keycloak | [GitHub](https://github.com/bitloops/ddd-hexagonal-cqrs-es-eda) |
| 0xb4lamx/nestjs-boilerplate-microservice | MIT | `pushed_at` 2026-10-21 | 632 | NestJS + DDD + CQRS + Event Sourcing | [GitHub](https://github.com/0xb4lamx/nestjs-boilerplate-microservice) |
| A3S-Lab/nestify | MIT | `pushed_at` 2026-07-22 | 201 | NestJS en monorepo pnpm, DDD | [GitHub](https://github.com/A3S-Lab/nestify) |
| Effect-TS/effect | MIT | `pushed_at` 2026-10-22; `effect` 4.0.6 | 17 358 | Núcleo funcional | [GitHub](https://github.com/Effect-TS/effect), [npm](https://registry.npmjs.org/effect) |
| nestjs/cqrs | MIT | `pushed_at` 2026-10-22; 12.1.1 | 945 | Bus CQRS del ecosistema NestJS | [GitHub](https://github.com/nestjs/cqrs), [npm](https://registry.npmjs.org/@nestjs/cqrs) |
| event-driven-io/emmett | **sin licencia** | `pushed_at` 2026-10-22; 0.42.4 (beta 0.43) | 552 | Event sourcing en Node con store PostgreSQL | [GitHub](https://github.com/event-driven-io/emmett), [npm](https://registry.npmjs.org/@event-driven-io/emmett) |
| castore-dev/castore | MIT | 2025-10-12 | 276 | Event sourcing en TS | [GitHub](https://github.com/castore-dev/castore) |
| oskardudycz/EventSourcing.NodeJS | **CC-BY-SA-4.0** | `pushed_at` 2025-05-20 | 506 | Ejemplos de event sourcing | [GitHub](https://github.com/oskardudycz/EventSourcing.NodeJS) |

**Qué enseña Sairyss**
- El README combina DDD, hexagonal, Clean, Onion y SOLID. Advierte que está "generally ill-suited to simple CRUD applications" y que todo se ofrece como "a recommendation, not a rule" — [README Sairyss](https://github.com/Sairyss/domain-driven-hexagon)
- Ubica los puertos como interfaces en las capas de aplicación o dominio, con adaptadores en infraestructura y dependencias apuntando hacia dentro. Separa comandos y consultas (CQS/CQRS) y usa el paquete NestJS CQRS como bus — [README Sairyss](https://github.com/Sairyss/domain-driven-hexagon)
- Cubre value objects que validan al crearse, errores recuperables como tipos `Result` (oxide.ts) frente a excepciones para los irrecuperables, modelos de persistencia separados de las entidades, eventos de dominio en proceso frente a eventos de integración (outbox, sagas), módulos por concepto de negocio con slicing vertical y una sección "Enforcing architecture" respaldada por un `.dependency-cruiser.js` en el repo — [README Sairyss](https://github.com/Sairyss/domain-driven-hexagon)
- Advierte que en producción "you will most likely only need a fraction of those patterns" — [README Sairyss](https://github.com/Sairyss/domain-driven-hexagon)

**marcoturi/fastify-boilerplate (el más afín al stack)**
- Se define como "A production-ready Fastify 5 boilerplate built on Clean Architecture, CQRS, DDD, and functional programming". Usa Awilix como DI, TypeBox para esquemas REST con Swagger, postgres.js con dbmate y dependency-cruiser para validar capas en CI (`pnpm deps:validate`). Su diagrama está "adapted from Domain-Driven Hexagon" — [README](https://github.com/marcoturi/fastify-boilerplate)
- Sus módulos siguen "vertical slice architecture", con "No direct imports between modules". La comunicación entre módulos pasa por los buses CQRS, y "The CQRS handler boundary becomes the network boundary" — [README](https://github.com/marcoturi/fastify-boilerplate)
- Sus `engines` son `node >=24.0.0` y `pnpm >=11.0.0`. Las dependencias incluyen `@fastify/otel`, `@fastify/request-context`, `@fastify/type-provider-typebox` 6.3.0, `ajv` 8.20.0 y `typebox` 1.4.2 — [package.json](https://github.com/marcoturi/fastify-boilerplate/blob/main/package.json)
- Los tres últimos commits de la rama principal son de `renovate[bot]`. La actividad visible es sobre todo de actualización de dependencias — [commits](https://github.com/marcoturi/fastify-boilerplate/commits/main)

**bitloops/ddd-hexagonal-cqrs-es-eda**
- Lo describen como "Complete working example" de DDD, hexagonal, CQRS, ES, EDA y BDD con NestJS, con "Event-sourced Todo aggregate with a transactional outbox". Cada comando de Todo escribe sus eventos, la proyección de consulta y los mensajes de outbox "in one PostgreSQL transaction"; luego un relay publica a NATS — [README](https://github.com/bitloops/ddd-hexagonal-cqrs-es-eda)

**Effect 4.0**
- Lanzado el 30-sep-2026 (npm `effect@4.0.0`: 2026-10-01T03:11Z UTC). Fue "Rebuilt from the ground up" con un núcleo de "zero runtime dependencies". El bundle mínimo pasa de 35.6 kB a 7.1 kB, el throughput concurrente sube 6.4x y usa 86% menos memoria por fibra — [Effect 4.0](https://effect.website/blog/releases/effect/40); [npm](https://registry.npmjs.org/effect)
- Política LTS de 4.x: correcciones de bugs hasta sep-2029 (o un año después de 5.0) y de seguridad hasta sep-2029 (o dos años después de 5.0). Varios paquetes antes separados viven ahora en `effect`, con versión única. Algunos módulos nuevos están marcados `@stability unstable/experimental` y pueden cambiar en versiones menores o de parche — [Effect 4.0](https://effect.website/blog/releases/effect/40)
- `effect@4.0.6` exporta los subpaths `ai`, `rpc`, `sql`, `http`, `http-api`, `schema`, `workflow`, `eventlog`, `persistence`, `cluster`, `observability`, `cli` y `testing`, entre otros — [registro npm effect 4.0.6](https://registry.npmjs.org/effect/4.0.6)
- Descargas semanales: 43.9 M en la semana del 21-sep-2026. En los últimos 7 días, 4.x representaba el 56% y 3.x el 44% — [Effect 4.0](https://effect.website/blog/releases/effect/40)
- `@effect/sql-pg` ya publica 4.0.6, alineado con `effect` — [npm](https://registry.npmjs.org/@effect/sql-pg)

**Emmett (presente en el registro de arquitectura: N3 y N6)**
- Ofrece event stores para "PostgreSQL, EventStoreDB, MongoDB, SQLite, and In-Memory" y proyecciones para read models. Sobre su madurez dice: "What's there is safe to use", aunque falta, por ejemplo, OpenTelemetry — [README Emmett](https://github.com/event-driven-io/emmett)
- Sección "Why there's no license?": "it'll be (probably)AGPLv3 and/or SSPL and open/core model with paid tools". El campo `license` del paquete npm está vacío — [README Emmett](https://raw.githubusercontent.com/event-driven-io/emmett/main/README.md); [npm](https://registry.npmjs.org/@event-driven-io/emmett-postgresql/latest)

**Restricciones de Node 24 que afectan qué copiar**
- El type stripping de Node es estable desde v24.12.0/v25.2.0 y está activo por defecto desde v23.6.0/v22.18.0. Node no lee `tsconfig.json` y recomienda `"erasableSyntaxOnly": true`. Las declaraciones `enum` y las *parameter properties* requieren transformación y no son simple borrado de tipos — [Node.js TypeScript](https://nodejs.org/api/typescript.html)

### Inferences
- **Qué copiar de Sairyss:** el vocabulario de capas, value objects, `Result` para errores de dominio, modelos de persistencia separados, módulos por concepto de negocio y, sobre todo, la idea de *hacer cumplir* la arquitectura con dependency-cruiser.
- **Qué evitar de Sairyss:**
  - el contenedor DI y los decoradores de NestJS, y `class-validator`, porque dependen de decoradores y metadatos y no encajan con un núcleo sin frameworks ni con `erasableSyntaxOnly` de Node 24;
  - Slonik y `@nestjs/cqrs`;
  - las versiones viejas.
- **Registro de arquitectura desactualizado:** el registro (`arquitectura/kernel-durable.json`, `L3_distilled_sota_mapping`) dice que los repos listados "existen y están activos". Para Sairyss eso es falso en cuanto a actividad: no hay commits de código desde 2024. Convendría reclasificarlo como "referencia conceptual congelada".
- **Copiar el andamiaje de marcoturi:** es la plantilla más copiable para Fastify + Postgres en 2026. Sirve como modelo de buses con middlewares, de inyección con Awilix y de un esquema TypeBox por comando, más el CI de dependency-cruiser. No trae event store, RLS, multi-tenant ni agentes; esas partes habría que añadirlas.
- **Para el event store:** bitloops enseña el patrón "eventos + proyección + outbox en una transacción PostgreSQL". Encaja con `appendCanonicalEvent` y con INV_05 (no retener conexiones durante E/S externa), pero arrastra NestJS y NATS.
- **Riesgo legal de Emmett:** usar su código (no solo sus ideas) hoy significa usar software sin licencia. El cambio previsto a AGPLv3/SSPL tendría implicaciones para un servicio municipal en red. Es seguro tomarlo como inspiración de diseño, no como dependencia, salvo que se aclare la licencia antes del 29-nov-2026.
- **Costo de Effect:** Effect 4 resuelve con el mismo modelo la DI (servicios y capas como puertos), los errores tipados, los esquemas, la RPC, el workflow y la IA, y ahora tiene LTS. El costo es la curva de aprendizaje y adoptar un "dialecto" en todo el núcleo. Además, sus módulos `ai`, `workflow` y `eventlog` pueden estar marcados como inestables. Con siete semanas hasta el congelamiento, el riesgo de adopción total es alto para un equipo pequeño. Un uso parcial (por ejemplo solo `Schema`) pierde la mayor parte del beneficio.

### Gaps
- No se leyeron en esta sesión los artículos de Khalil Stemmler (khalilstemmler.com) ni de Herberto Graça ("Explicit Architecture"), así que no se citan.
- No se verificó qué módulos concretos de Effect 4 están marcados `unstable`. El post 4.0 no los nombra y un agregador secundario habla de 17 módulos bajo `effect/unstable/*`, lo que no coincide con los `exports` observados en npm. Hay que revisar el repo o MIGRATION.md.
- No se pudo determinar cuántos commits humanos recientes tiene marcoturi/fastify-boilerplate, más allá de los bots.
- No se verificó si existe una plantilla 2024–2026 que combine hexagonal + RLS de Supabase + agentes LangGraph. La búsqueda en GitHub (`hexagonal`, `ddd cqrs`, `clean architecture` en TypeScript, con push desde jun-2025) no devolvió ninguna.

---

## 2. Buses de comandos/consultas y casos de uso: un "registro de comandos" que sirva a HTTP y a herramientas de agente

### Takeaway
No existe una librería madura, independiente de framework, que dé "comando tipado + JSON Schema + un solo handler + middlewares de política, idempotencia y telemetría" lista para usar desde Fastify y desde LangGraph. Las opciones reales son tres:
1. Un registro escrito a mano, pequeño, al estilo de marcoturi: unos cientos de líneas, con objetos `{type, payload, meta}` y middlewares por patrón.
2. Un framework de procedimientos contract-first (oRPC o tRPC) usado como registro.
3. El modelo integral de Effect (`rpc`, `ai`, `schema`).

`@nestjs/cqrs` queda descartado por acoplar el núcleo a NestJS.

### Cited Findings
- **Diseño de marcoturi:**
  - Tres buses en proceso: CommandBus ("state-changing operations"), QueryBus ("idempotent, side-effect-free reads") y EventBus ("fire-and-forget").
  - Una acción es "a plain object `{ type, payload, meta? }`". Los *action creators* llevan un tipo `Result` fantasma que permite inferir el retorno de `execute()`. Cada handler es una fábrica `makeX({ deps })` que devuelve `{ handler, init }` y se registra en su bus al arrancar.
  - Los buses se decoran sobre la instancia de Fastify y se inyectan con Awilix.
  - Fuente: [doc/CQRS.md](https://github.com/marcoturi/fastify-boilerplate/blob/main/doc/CQRS.md)
- **Middlewares en marcoturi:** cubren auth, caché, trazas y rate limiting entre ruta y handler. Se dirigen por patrón, como `users/*` o `users/create` — [README](https://github.com/marcoturi/fastify-boilerplate)
- **Sairyss** usa el paquete NestJS CQRS como bus de comandos y consultas — [README Sairyss](https://github.com/Sairyss/domain-driven-hexagon). `@nestjs/cqrs` va en la 12.1.1, tiene licencia MIT y unas 945 estrellas — [npm](https://registry.npmjs.org/@nestjs/cqrs); [GitHub](https://github.com/nestjs/cqrs)
- **oRPC:**
  - Los contratos se definen con `oc` y las cadenas `.meta`, `.errors`, `.input` y `.output`. La validación admite Zod, Valibot, ArkType "or any other Standard Schema library". Un contrato no tiene `.handler`, y los middlewares y plugins pueden leer la metadata del contrato al implementarlo — [oRPC contract-first](https://orpc.dev/docs/contract-first/define-contract)
  - Es MIT, tiene 5 711 estrellas y el repo se movió a `middleapi/orpc`. `@orpc/server` va en la 1.16.1, con la 2.0 en beta (2.0.0-beta.45) — [GitHub](https://github.com/middleapi/orpc); [npm](https://registry.npmjs.org/@orpc/server)
- **tRPC:** `@trpc/server` va en la 11.19.0; el repo es MIT y tiene 40 714 estrellas — [npm](https://registry.npmjs.org/@trpc/server); [GitHub](https://github.com/trpc/trpc)
- **Awilix:** 13.0.5, MIT, 4 245 estrellas, con commits en oct-2026 — [npm](https://registry.npmjs.org/awilix); [GitHub](https://github.com/jeffijoe/awilix)
- **Effect 4** expone `rpc`, `http-api`, `ai`, `schema` y `workflow` como subpaths del paquete único — [registro npm effect 4.0.6](https://registry.npmjs.org/effect/4.0.6)
- **LangGraph.js:** `@langchain/langgraph` 1.5.2 depende de `@standard-schema/spec` 1.1.0 y tiene como peers `zod ^3.25.32 || ^4.2.0` y `@langchain/core ^1.1.48` — [npm](https://registry.npmjs.org/@langchain/langgraph/latest)
- **SDK de MCP:** `@modelcontextprotocol/sdk` 1.32.1 depende de `ajv ^8.17.1`, `ajv-formats`, `zod ^3.25 || ^4.0` y `zod-to-json-schema`. GitHub reporta su licencia como `NOASSERTION` — [npm](https://registry.npmjs.org/@modelcontextprotocol/sdk/latest); [GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- **Fastify** 5.12.7 trae `@fastify/ajv-compiler` y `fast-json-stringify` como dependencias. Valida con Ajv y JSON Schema de forma nativa. Ya hay un alpha de Fastify 6 (`6.0.0-alpha.5`) — [npm](https://registry.npmjs.org/fastify)

### Inferences
- **Registro escrito a mano.** Es la opción más alineada con INV_06 y con "el agente propone, el dominio decide". Su forma sería:
  - Un `CommandRegistry` en `packages/ports` con entradas `{ name, kind: 'command'|'query', inputSchema (JSON Schema 2020-12), outputSchema, handler, policy, idempotency }`.
  - Proyecciones automáticas desde ese registro: (a) rutas Fastify, (b) herramientas LangGraph o MCP, y (c) documentación OpenAPI.
  - El patrón de marcoturi (acciones planas + middlewares por patrón) cubre la mitad del trabajo. Faltan el esquema JSON por comando y la proyección a herramientas.
- **Orden natural de middlewares para el harness:**
  1. validación Ajv;
  2. resolución de actor y tenant;
  3. política (allow/deny/ask);
  4. clave de idempotencia determinista;
  5. handler de dominio;
  6. `appendCanonicalEvent`;
  7. telemetría (span de OpenTelemetry con nombre del comando, marca y clave).
- **oRPC como registro.** Da contrato separado de implementación, Standard Schema, metadata legible por middlewares y adaptadores HTTP. El riesgo está en la versión: la 2.0 está en beta 45 y podría salir cerca del congelamiento. Además, el contrato vive en un paquete de terceros, lo que choca con la pureza de `packages/ports` si se importa `@orpc/contract` allí.
- **tRPC** está optimizado para clientes TypeScript y encaja peor como fuente de JSON Schema para agentes.
- **Pureza de los puertos.** LangGraph y MCP aceptan Zod o Standard Schema y MCP valida con Ajv. Un registro cuyo esquema canónico sea JSON Schema puede alimentar a ambos, pero hará falta un adaptador por destino. Esos adaptadores van fuera de `packages/ports`.

### Gaps
- No se verificó cómo oRPC genera OpenAPI o JSON Schema ni si tiene integración con MCP. La página consultada solo cubre la definición de contratos.
- No se encontró ni evaluó una librería independiente de "command bus" para TS con mantenimiento activo en 2026 (por ejemplo, ports de MediatR). Queda como búsqueda pendiente.
- No se confirmó si LangGraph.js acepta JSON Schema plano (no Zod) para definir herramientas en su versión 1.5. Solo se verificó la dependencia de `@standard-schema/spec`.

---

## 3. Herramientas que HACEN CUMPLIR los límites hexagonales en CI

### Takeaway
**dependency-cruiser** (MIT, 18.7.0 del 19-oct-2026, unas 7 300 estrellas) es la opción más madura y la que usan tanto Sairyss como marcoturi. Expresa directamente "`packages/domain` y `packages/ports` no importan `fastify|pg|grammy`". **eslint-plugin-boundaries** 7.x también puede, vía `checkAllOrigins` + `module.origin: "external"`. **Nx** puede con `bannedExternalImports`/`allowedExternalImports`, pero exige adoptar Nx y etiquetas de proyecto. **ArchUnitTS** es bueno para reglas entre carpetas y métricas, pero no se confirmó que cubra paquetes npm. **ts-arch** y **madge** se ven estancados en releases o limitados a ciclos y grafos.

### Cited Findings
- **dependency-cruiser**
  - Una regla `forbidden` con `from.path` (regex sobre el archivo importador) y `to.path` (regex sobre la ruta resuelta) más `to.dependencyTypes` (`npm`, `npm-dev`, …) prohíbe paquetes externos por carpeta. `dependencyTypesNot: ["type-only"]` permitiría importaciones solo de tipos. `severity: "error"` hace fallar el proceso. `reachable: true` detecta dependencias transitivas. Existe el tipo `aliased-workspace` para importaciones resueltas vía workspaces. La configuración puede ser JSON o JS — [rules-reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)
  - Versión 18.7.0 publicada el 19-oct-2026; MIT; 7 317 estrellas — [npm](https://registry.npmjs.org/dependency-cruiser); [GitHub](https://github.com/sverweij/dependency-cruiser)
  - Sairyss trae `.dependency-cruiser.js` ([README](https://github.com/Sairyss/domain-driven-hexagon)) y marcoturi la ejecuta en CI ("validates layer boundaries at CI time") ([README](https://github.com/marcoturi/fastify-boilerplate))
- **eslint-plugin-boundaries**
  - La regla `boundaries/dependencies` usa `policies` (allow/disallow) donde "the last policy that matches wins". Por defecto solo revisa dependencias locales. Con `checkAllOrigins: true` se pueden apuntar módulos externos con `module: { origin: "external", source: "..." }`. La regla `boundaries/external` está deprecada en favor de esta. `dependency.kind` (`value`/`type`/`typeof`) distingue importaciones de tipos — [jsboundaries.dev](https://www.jsboundaries.dev/docs/rules/dependencies/)
  - Versión 7.2.1; la 6.0.0 salió el 15-mar-2026 y la 7.0.0 el 5-jul-2026. MIT, unas 1 000 estrellas — [npm](https://registry.npmjs.org/eslint-plugin-boundaries); [GitHub](https://github.com/javierbrea/eslint-plugin-boundaries)
- **Nx `@nx/enforce-module-boundaries`**
  - `depConstraints` por `sourceTag` admite `onlyDependOnLibsWithTags`, `notDependOnLibsWithTags`, `bannedExternalImports` y `allowedExternalImports`. `checkNestedExternalImports` aplica las prohibiciones de forma transitiva y `banTransitiveDependencies` prohíbe paquetes no declarados en `package.json`. Corre en ESLint y, de forma experimental, en Oxlint. "This rule only works for JavaScript/TypeScript projects" — [Nx docs](https://nx.dev/docs/kb/enforce-module-boundaries)
  - Nx 24.0.0 se publicó el 21-oct-2026; MIT, 29 416 estrellas — [npm](https://registry.npmjs.org/nx); [GitHub](https://github.com/nrwl/nx)
- **ArchUnitTS**
  - Reglas como pruebas: dependencias entre carpetas, ciclos, nombres, métricas (LCOM, inestabilidad, etc.), slices y validación contra diagramas PlantUML, con soporte para el grafo de Nx. Trae protección contra "empty test" activada por defecto. Files, Metrics y Slices están marcados *Stable*; Graph y Reports, *Experimental*. Soporta Jest, Vitest y Jasmine, y Mocha vía `check()`. No queda claro si las reglas apuntan a paquetes npm — [README ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS)
  - npm `archunit` 2.5.4 (sep-2026); MIT, 507 estrellas, commits hasta el 21-oct-2026 — [npm](https://registry.npmjs.org/archunit); [GitHub](https://github.com/LukasNiessen/ArchUnitTS)
- **ts-arch:** npm `tsarch` 5.4.1, última modificación el 23-dic-2024. El repo (MIT, 668 estrellas) tuvo su último commit el 26-mar-2026, un PR de documentación — [npm](https://registry.npmjs.org/tsarch); [GitHub](https://github.com/ts-arch/ts-arch)
- **madge:** 8.0.0 publicado en ago-2024; el último commit en la rama principal es "Release 8.0.0" del 5-ago-2024. MIT, 10 177 estrellas — [npm](https://registry.npmjs.org/madge); [GitHub](https://github.com/pahen/madge)
- **eslint-plugin-hexagonal-architecture:** 1.0.3, sin cambios desde may-2023 — [npm](https://registry.npmjs.org/eslint-plugin-hexagonal-architecture)
- **TypeScript 7.0 no trae API programática.** Herramientas como typescript-eslint deben usar el paquete `@typescript/typescript6` mediante alias de npm. La API nueva se espera en 7.1 — [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)

### Inferences
- **Regla mínima que codifica INV_06 con dependency-cruiser:**
  - `from.path: "^packages/(domain|ports)/"`
  - `to.path: "node_modules/(fastify|@fastify|pg|pg-boss|grammy|@grammyjs|@supabase|@upstash|@langchain|ioredis)/"`
  - `to.dependencyTypes: ["npm","npm-dev","npm-peer","npm-optional"]`
  - Complemento recomendable: una lista *permitida* (allow-list) en lugar de una lista negra, del tipo "domain solo puede importar domain y paquetes de la allow-list".
  - Hay que verificar la ruta resuelta en una corrida real. La documentación misma advierte que hay que comprobarla.
- **Combinación ligera:** dependency-cruiser para INV_06 (en CI y como `pre-push`) + ArchUnitTS para reglas internas del dominio (ciclos, nombres, métricas) dentro de Vitest. Así se evita meter Nx solo por las fronteras.
- **Barrera estructural:** que `packages/domain/package.json` no declare `fastify`, `pg` ni `grammy`, y que el linker estricto de pnpm impida resolver dependencias no declaradas. Esto se infiere del comportamiento conocido de pnpm, pero no se verificó en esta sesión.
- **Riesgo con TypeScript 7:** si el monorepo adopta TS 7.0, las herramientas basadas en ESLint y typescript-eslint (eslint-plugin-boundaries, `@nx/enforce-module-boundaries`) necesitarán el alias a TS 6. dependency-cruiser podría verse afectado si usa la API del compilador para analizar `.ts`; no se verificó.

### Gaps
- No se verificó la compatibilidad de dependency-cruiser 18.x con TypeScript 7.0 ni qué parser usa por defecto para TS.
- No se verificó la regla nativa de ESLint `no-restricted-imports` ni `eslint-plugin-import-x` (`no-restricted-paths`) como alternativas mínimas. `eslint-plugin-import-x` está en la 4.17.1 ([npm](https://registry.npmjs.org/eslint-plugin-import-x)), pero no se revisó su documentación.
- No se confirmó si ArchUnitTS puede prohibir paquetes npm concretos.

---

## 4. Herramientas de monorepo en 2026 para este layout

### Takeaway
Para un equipo pequeño con tres servicios en una sola imagen, la opción más ligera es **pnpm workspaces** (pnpm 12.15.0) + `tsc` + dependency-cruiser. **Turborepo** (2.11.10) añade caché de tareas con poca configuración y desaconseja expresamente las *project references* de TS. **Nx** (24.0.0, publicado ayer, 21-oct-2026) aporta grafo, fronteras y generadores a cambio de más superficie. El factor nuevo de 2026 es **TypeScript 7.0** (compilador nativo en Go, GA el 8-jul-2026): compila entre 8 y 12 veces más rápido, pero no trae API y convierte en errores varias opciones antiguas.

### Cited Findings
- **pnpm:** la latest es 12.15.0. La 11.0.0 se publicó el 28-abr-2026 y la 12.0.0 el 26-ago-2026 — [npm](https://registry.npmjs.org/pnpm). El repo es MIT, tiene 36 899 estrellas y GitHub reporta "Rust" como lenguaje principal — [GitHub](https://github.com/pnpm/pnpm)
- **Turborepo:** `turbo` 2.11.10; MIT, 31 226 estrellas — [npm](https://registry.npmjs.org/turbo); [GitHub](https://github.com/vercel/turborepo)
- **Guía de TypeScript de Turborepo:**
  - "We don't recommend using TypeScript Project References" porque añaden "another point of configuration" y "another caching layer".
  - Recomienda compilar con `tsc` "whenever possible" o usar paquetes "Just-in-Time" que apuntan a la fuente.
  - Propone `exports` con `types` → `./src/*.ts` y `default` → `./dist/*.js`, un paquete `typescript-config` compartido y un `tsconfig.json` por paquete en lugar de uno en la raíz.
  - Fuente: [Turborepo TS guide](https://turborepo.dev/docs/guides/tools/typescript)
- **Nx:** 24.0.0 se publicó el 21-oct-2026; la línea previa (`previous`) es 22.7.12. MIT, 29 416 estrellas — [npm](https://registry.npmjs.org/nx). Su regla de fronteras es la descrita en la sección 3, y la variante "Conformance" (independiente del lenguaje) aparece bajo `/docs/enterprise/conformance` — [Nx docs](https://nx.dev/docs/kb/enforce-module-boundaries)
- **TypeScript 7.0** (8-jul-2026):
  - Es un port nativo a Go, con speedups "typically … between 8x and 12x on full builds".
  - Para project references añade `--builders`, que en monorepos "can be particularly helpful".
  - "does not ship with an API"; la API llegaría en 7.1.
  - Ahora son errores `moduleResolution: node/node10`, `baseUrl` y `target: es5`.
  - Nuevos valores por defecto: `strict` activado, `module` en `esnext` y `types` en `[]`.
  - Para herramientas que necesitan la API de TS 6 recomienda el alias `@typescript/typescript6`.
  - Fuente: [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- `typescript` latest en npm es 7.0.2, con `7.1.0-beta` en la etiqueta beta — [npm](https://registry.npmjs.org/typescript). El repo `microsoft/typescript-go` figura como archivado en la API de GitHub — [GitHub](https://github.com/microsoft/typescript-go)
- marcoturi/fastify-boilerplate sigue en `typescript` 6.0.3 con pnpm ≥11 y Node ≥24 — [package.json](https://github.com/marcoturi/fastify-boilerplate/blob/main/package.json)

### Inferences
- **Layout mínimo:** `pnpm-workspace.yaml` con `packages/domain`, `packages/ports`, `packages/adapters-*` y `apps/{api,worker,agentes}`; un `tsconfig.base.json` compartido; dependency-cruiser en CI. Con pocos paquetes, la caché de Turborepo da poco valor al principio, pero se puede añadir después sin reestructurar.
- **Riesgo de Nx:** adoptar Nx 24 a un día de su publicación y a cinco semanas del congelamiento añade riesgo de versión. Su valor diferencial (fronteras por etiquetas) ya lo cubre dependency-cruiser.
- **Riesgo de TypeScript 7:** subir a TS 7.0 antes del 29-nov da velocidad, pero obliga a convivir con TS 6 para ESLint y otras herramientas basadas en la API. Mantener TS 6.0.x hasta el MVP es la opción conservadora; marcoturi lo hace.
- **Coherencia con Node 24:** con `erasableSyntaxOnly`, `domain` y `ports` pueden ejecutarse directamente con type stripping en desarrollo y pruebas. `tsc` queda solo para verificar tipos o emitir `dist` para la imagen.

### Gaps
- No se revisaron las notas de versión de pnpm 11/12 (catálogos, cambios de linker, la reescritura parcial en Rust que sugiere el lenguaje del repo). El dato "Rust" sale solo de la clasificación automática de GitHub.
- No se revisaron las novedades de Nx 24 ni el soporte de project references de TS 7 con `composite`; el post no menciona `composite`.

---

## 5. Tipado contract-first: Ajv 8 + JSON Schema 2020-12 vs TypeBox vs Zod 4 vs Valibot (y Standard Schema)

### Takeaway
Las cuatro rutas producen JSON Schema 2020-12. Se diferencian en *dónde vive la fuente de verdad*:
- **TypeBox 1.x** (`typebox` 1.4.3, MIT): el esquema *es* JSON Schema y el tipo TS se infiere. Encaja de forma nativa con Ajv y Fastify y es lo que usa marcoturi.
- **Zod 4** (4.6.7): convierte con `z.toJSONSchema()` (2020-12 por defecto). Es lo que consumen de forma nativa LangGraph y el SDK de MCP, pero el JSON Schema es un derivado y algunas construcciones no se pueden representar.
- **Valibot 1.5:** convierte a 2020-12 solo si se pide explícitamente.
- **Standard Schema (incluido Standard JSON Schema):** es la capa de interoperabilidad que ya usan LangGraph y oRPC.

### Cited Findings
- **Ajv:**
  - 8.20.0 (24-abr-2026); MIT, 14 863 estrellas — [npm](https://registry.npmjs.org/ajv); [GitHub](https://github.com/ajv-validator/ajv)
  - "draft-2020-12 is not backwards compatible" y "You cannot use draft-2020-12 and previous JSON Schema versions in the same Ajv instance". Ajv soporta todas las palabras clave de 2020-12, incluidas `unevaluatedProperties`, `unevaluatedItems` y `$dynamicAnchor/$dynamicRef` — [Ajv docs](https://github.com/ajv-validator/ajv/blob/master/docs/json-schema.md)
- **Zod 4:**
  - 4.0.0 se publicó el 9-jul-2025; la latest es 4.6.7. MIT, 44 171 estrellas — [npm](https://registry.npmjs.org/zod); [GitHub](https://github.com/colinhacks/zod)
  - `z.toJSONSchema()` admite los targets `"draft-2020-12"` (por defecto), `"draft-07"`, `"draft-04"` y `"openapi-3.0"`. Con `io: "input"` genera el esquema del tipo de entrada.
  - Los tipos no representables (`bigint`, `date`, `transform`) lanzan error por defecto, salvo que se configure `unrepresentable`.
  - Hay metadatos y registros (`z.globalRegistry`, `.meta()`, ids y `$ref` entre esquemas). `z.fromJSONSchema()` existe pero es "Experimental".
  - Fuente: [zod.dev/json-schema](https://zod.dev/json-schema)
  - `fastify-type-provider-zod` va en la 7.0.0 — [npm](https://registry.npmjs.org/fastify-type-provider-zod)
- **TypeBox:**
  - El paquete nuevo `typebox` publicó la 1.0.0 el 9-sep-2025; la latest es 1.4.3 y su licencia en npm es MIT. El paquete heredado `@sinclair/typebox` sigue en la 0.34.52 — [npm typebox](https://registry.npmjs.org/typebox); [npm @sinclair/typebox](https://registry.npmjs.org/@sinclair/typebox)
  - GitHub reporta la licencia como `NOASSERTION` pero el README declara "License: MIT" — [GitHub](https://github.com/sinclairzx81/typebox)
  - "TypeBox is a runtime type system that creates in-memory JSON Schema objects that infer as TypeScript types". Los esquemas "can be passed directly to any compliant validator". Incluye un motor "Script" que transforma definiciones TypeScript en JSON Schema — [README TypeBox](https://github.com/sinclairzx81/typebox)
  - `@fastify/type-provider-typebox` va en la 6.3.0 — [npm](https://registry.npmjs.org/@fastify/type-provider-typebox)
- **Valibot:** 1.5.0, MIT, 9 047 estrellas — [npm](https://registry.npmjs.org/valibot); [GitHub](https://github.com/open-circle/valibot). `@valibot/to-json-schema` 1.8.0 soporta `'draft-07' | 'draft-2020-12' | 'openapi-3.0'`, con draft-07 por defecto — [README to-json-schema](https://github.com/open-circle/valibot/tree/main/packages/to-json-schema)
- **ArkType:** 2.2.9, MIT, 7 878 estrellas — [npm](https://registry.npmjs.org/arktype); [GitHub](https://github.com/arktypeio/arktype)
- **Standard Schema:**
  - Es una familia de especificaciones: `StandardSchemaV1` (validar), `StandardJSONSchemaV1` (convertir a JSON Schema con métodos `input` y `output` y un `target`) y `StandardTypedV1`.
  - Se recomienda "strongly" soportar los targets `draft-2020-12` y `draft-07`. Si una librería no soporta el target pedido, "should throw".
  - La página no lista qué librerías la implementan.
  - Fuente: [standardschema.dev](https://standardschema.dev/)
  - `@standard-schema/spec` 1.1.0 (dic-2025); MIT, 3 659 estrellas — [npm](https://registry.npmjs.org/@standard-schema/spec); [GitHub](https://github.com/standard-schema/standard-schema)
- **Consumidores del ecosistema de agentes:** LangGraph.js depende de `@standard-schema/spec` 1.1.0 y acepta Zod 3.25+ o 4.2+ como peer ([npm](https://registry.npmjs.org/@langchain/langgraph/latest)). El SDK de MCP usa Ajv 8 + Zod + `zod-to-json-schema` ([npm](https://registry.npmjs.org/@modelcontextprotocol/sdk/latest))
- **json-schema-to-ts:** convierte JSON Schema escrito como literal a tipos TS. Va en la 3.1.1 y no se modifica desde ago-2024 — [npm](https://registry.npmjs.org/json-schema-to-ts)

### Inferences
- **Con la decisión aprobada (JSON Schema 2020-12 + Ajv 8)**, TypeBox 1.x es la ruta con menos traducciones: el esquema TypeBox *es* el contrato, Ajv (con `ajv/dist/2020`) lo valida en `api`, `worker` y `agentes`, y Fastify lo usa directamente.
  - Las herramientas de agente necesitan un adaptador. Cuando la herramienta acepta JSON Schema, se pasa el objeto tal cual. Si exige Zod o Standard Schema, hay que envolverlo, salvo que TypeBox implemente Standard Schema, lo que no se verificó.
  - Riesgo: TypeBox 1.x cambió de paquete (`@sinclair/typebox` → `typebox`) hace solo trece meses, y parte del ecosistema (ejemplos, plugins) puede seguir en 0.34.
- **Zod 4 como fuente** encaja con LangGraph y MCP sin adaptadores, y es la librería más popular. A cambio:
  - el JSON Schema 2020-12 publicado es un *artefacto generado* que hay que versionar y comparar en CI (snapshot), porque `transform` y `date` no se representan y `io: input/output` producen esquemas distintos;
  - mezclar Ajv (para JSON Schema) con Zod (para tiempo de ejecución) puede producir dos validadores con semánticas ligeramente distintas.
- **Esquemas `.schema.json` escritos a mano como fuente** (lo que sugiere PEN-07, "esquemas JSON y validador estructural") son lo más neutral, pero obligan a generar los tipos TS con `json-schema-to-ts` (estancado desde 2024) o con codegen.
- **Zod 4 + Standard JSON Schema** daría un único objeto que valida y exporta JSON Schema. Falta verificar qué librerías implementan `StandardJSONSchemaV1`.
- **Valibot** solo compensa si importa el tamaño del bundle en el frontend 3D. En el servidor no aporta frente a TypeBox o Zod.

### Gaps
- No se verificó si TypeBox 1.x implementa Standard Schema ni Standard JSON Schema.
- No se verificó qué librerías implementan `StandardJSONSchemaV1`; standardschema.dev no lo lista.
- No se midió el rendimiento comparado de Ajv compilado frente a `Compile` de TypeBox frente a Zod 4 para 10 000 sesiones concurrentes.

---

## 6. Aislamiento multi-tenant en un núcleo hexagonal sobre PostgreSQL RLS (Supabase): cómo fijan los adaptadores el contexto de tenant de forma segura

### Takeaway
El patrón seguro es que el **adaptador secundario** de persistencia abra una transacción corta, fije el tenant con `set_config('app.marca_id', $1, true)` (equivale a `SET LOCAL` y se revierte al terminar la transacción) y ejecute ahí las consultas, conectado con un rol que **no** sea propietario de las tablas, **no** tenga `BYPASSRLS` y no sea `service_role`. Debe además aplicar `FORCE ROW LEVEL SECURITY`. El dominio solo conoce un value object `MarcaId` / `TenantContext`, y el puerto exige recibirlo. Con Supabase, la conexión directa o el pooler en modo sesión soportan todo. El modo transacción (puerto 6543) no admite estado de sesión ni sentencias preparadas.

### Cited Findings
- **`set_config`:** "If `is_local` is true, the new value will only apply during the current transaction"; con `false` aplica al resto de la sesión — [PostgreSQL 17, funciones de administración](https://www.postgresql.org/docs/17/functions-admin.html)
- **Política por defecto y quién la salta:** "If no policy exists for the table, a default-deny policy is used". "Superusers and roles with the BYPASSRLS attribute always bypass the row security system". "Table owners normally bypass row security as well", salvo que se use `ALTER TABLE … FORCE ROW LEVEL SECURITY` — [PostgreSQL 17, Row Security Policies](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)
- **Roles en Supabase:**
  - `service_role` tiene `bypassrls`, y una clave secreta salta RLS solo cuando la petición no lleva token de usuario.
  - Se puede crear un rol con `bypassrls`, con la advertencia "Never share login credentials".
  - Un backend conectado con un rol sin `bypassrls` queda sujeto a las políticas y necesita *grants*: si falta un grant, falla con `42501` antes de evaluar la política.
  - Fuente: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- **Rendimiento y seguridad de las políticas en Supabase:**
  - envolver `auth.uid()`, `auth.jwt()` y las funciones *security definer* en `select` para que se cacheen por sentencia;
  - indexar cada columna que filtre una política (un índice btree donde sea la *primera* columna);
  - fijar `search_path = ''` en funciones *security definer* y no crearlas en esquemas expuestos;
  - las vistas saltan RLS salvo `security_invoker = true` (PG15+);
  - las pruebas suplantan usuarios con `set local request.jwt.claim.sub`.
  - Fuente: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- **Modos de conexión en Supabase:**
  - La conexión directa se recomienda para backends persistentes y soporta sentencias preparadas y estado de sesión; es IPv6 salvo que se contrate el add-on IPv4.
  - El pooler compartido en modo sesión (5432) es solo IPv4 y soporta sentencias preparadas y estado de sesión.
  - El modo transacción (6543) "does not support prepared statements" ni funciones de sesión como `SET`, `LISTEN/NOTIFY`, advisory locks de sesión o tablas temporales.
  - El pooler dedicado (PgBouncer, solo planes de pago) funciona únicamente en modo transacción.
  - Fuente: [Supabase: conectar a Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- **Patrones de blogs (secundarios):**
  - `SET LOCAL` y `set_config(..., true)` dentro de una transacción evitan que una conexión reutilizada del pool arrastre el tenant anterior, mientras que `SET` a nivel de sesión es peligroso con pooling.
  - Usar `current_setting('app.current_tenant_id', true)` en la política hace que una variable no fijada no lance error.
  - Fuentes: [CoderCops 2026](https://blog.codercops.com/blog/postgres-row-level-security-multitenant-2026); [OneUptime](https://oneuptime.com/blog/post/2026-01-21-postgresql-row-level-security/markdown)

### Inferences
- **Forma del puerto (en `packages/ports`):** `UnitOfWork.run(ctx: TenantContext, fn)` o `withTenant(ctx, fn)`, donde `TenantContext` es un value object del dominio (`marcaId`, `actor`, `origen: http|agente|telegram|worker`). El adaptador `pg` implementa:
  1. `BEGIN`;
  2. `SELECT set_config('app.marca_id', $1, true)`, y también `request.jwt.claims` si se quiere reutilizar `auth.jwt()` en las políticas;
  3. las consultas y `appendCanonicalEvent`;
  4. `COMMIT`.

  El núcleo nunca toca SQL ni sabe que existe RLS. Esto mantiene INV_06.
- **Postura que falla cerrada (fail-closed):**
  - un rol de aplicación `planetario_app` sin `BYPASSRLS` y que no sea dueño de las tablas;
  - `FORCE ROW LEVEL SECURITY` en todas las tablas por marca;
  - políticas con `current_setting('app.marca_id', true)`. Si no se fijó el tenant, la variable es NULL, no hay filas y se aplica el default-deny.
  - `service_role` queda reservado a migraciones y tareas administrativas explícitas.
  - El `worker` (pg-boss) y los `agentes` usan el mismo mecanismo con el tenant del job o de la sesión.
- **`planetario_events` (append-only):** la columna `marca_id` sale del contexto, no del payload. La clave de idempotencia determinista debería incluir `marca_id`, y la restricción `UNIQUE (marca_id, idempotency_key)` vive en la base de datos.
- **Riesgo con el pooler en modo transacción:** la doc de Supabase dice que ese modo no soporta `SET` de sesión. Un `set_config(..., true)` dentro de la misma transacción *debería* funcionar, porque el pooler fija el backend durante la transacción. Sin embargo, la doc no lo afirma explícitamente: hay que probarlo. La conexión directa o el modo sesión evitan la duda.
- **Compatibilidad con INV_05:** la transacción con tenant debe cerrarse *antes* de cualquier llamada a Bold, Telegram o un LLM, lo que encaja con transacciones cortas por comando.
- **Concurrencia:** a 10 000 sesiones simultáneas, la RLS añade poco costo si `marca_id` lidera los índices y la función de política se envuelve en `select`. El cuello de botella probable es el número de conexiones, no la RLS.

### Gaps
- No se encontró documentación oficial de Supabase ni de Supavisor que confirme explícitamente que `set_config(..., true)` es seguro en el modo transacción (6543).
- No se verificó si `node-postgres` usa sentencias preparadas con nombre por defecto, lo que es relevante para el modo transacción.
- No se encontró documentación oficial de PgBouncer (citada de forma truncada en fuentes secundarias).
- No se revisaron patrones para cachés por marca en Upstash Redis (prefijo de clave por tenant) como complemento de la RLS.

---

## 7. Patrones para que el núcleo hexagonal funcione como centro de un sistema guiado por agentes ("harness")

### Takeaway
La metáfora del harness encaja casi uno a uno con la hexagonal de Cockburn:
- los agentes, HTTP y Telegram son **actores primarios** (adaptadores conductores);
- el **registro de comandos y consultas** es el catálogo de herramientas;
- los **middlewares** son las *policy gates* y los *hooks*;
- el **event store** más el checkpointer de LangGraph son el estado durable;
- **OpenTelemetry** por comando es la telemetría.

Dos lecciones concretas de harnesses reales:
1. Las decisiones de política deben combinarse por "la más restrictiva gana" y fallar cerradas ante un timeout (modelo de hooks del Claude Agent SDK).
2. Los nodos de LangGraph se *re-ejecutan desde el inicio* al reanudarse, así que toda acción con efecto debe ser idempotente: de ahí la necesidad de claves deterministas en `appendCanonicalEvent`.

### Cited Findings
- **Cockburn (2005):** el propósito es que la aplicación pueda ser "driven by users, programs, tests, or batch scripts" y probarse aislada de sus bases de datos. "A port identifies a purposeful conversation". Distingue actores primarios (conducen) y secundarios (conducidos). Un harness de pruebas (FIT) actúa como adaptador primario. La "configurable dependency" inyecta el adaptador (mock o real) por constructor — [Cockburn, Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- **Hooks del Claude Agent SDK como ejemplo de harness:**
  - Los eventos `PreToolUse` y `PostToolUse` se filtran con *matchers* por nombre de herramienta, incluidos patrones regex como `^mcp__`.
  - `PreToolUse` puede devolver `permissionDecision` (`allow`/`deny`/`ask`/`defer`) y `updatedInput`.
  - Cuando varios hooks discrepan, "`deny` takes priority over `defer`, which takes priority over `ask`, which takes priority over `allow`".
  - Los hooks que coinciden corren en paralelo, así que hay que escribirlos independientes.
  - Si un `PreToolUse` excede su timeout, la llamada a la herramienta se bloquea.
  - `PostToolUse` puede añadir contexto (`additionalContext`) o reemplazar el resultado (`updatedToolOutput`).
  - Fuente: [Claude Agent SDK hooks](https://code.claude.com/docs/en/agent-sdk/hooks)
- **Interrupciones de LangGraph.js:**
  - `interrupt()` pausa el nodo y se reanuda con `new Command({ resume })`.
  - Exige checkpointer y `thread_id` ("effectively your persistent cursor"), y la doc recomienda "use a durable checkpointer in production".
  - Al reanudar, el nodo "restarts the entire node from the beginning", así que los efectos laterales anteriores a `interrupt()` deben ser idempotentes o moverse a otro nodo.
  - Fuente: [LangGraph.js interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)
- **Versiones y estado de los adaptadores:**
  - `@langchain/langgraph` 1.5.2; el repo `langchain-ai/langgraphjs` es MIT, tiene 3 370 estrellas y está activo — [npm](https://registry.npmjs.org/@langchain/langgraph/latest); [GitHub](https://github.com/langchain-ai/langgraphjs)
  - `grammy` 1.46.0 (MIT, 3 783 estrellas) — [npm](https://registry.npmjs.org/grammy); [GitHub](https://github.com/grammyjs/grammY)
  - `pg-boss` 12.38.0 (MIT, 4 077 estrellas) — [npm](https://registry.npmjs.org/pg-boss); [GitHub](https://github.com/timgit/pg-boss)
- **Middlewares por patrón de nombre** (`users/*`) en el bus de marcoturi, para auth, caché, trazas y rate limiting — [README marcoturi](https://github.com/marcoturi/fastify-boilerplate)
- **Atomicidad del event store:** eventos, proyección y outbox en una sola transacción PostgreSQL (bitloops) — [README bitloops](https://github.com/bitloops/ddd-hexagonal-cqrs-es-eda)
- **Effect 4** integra `ai`, `workflow`, `eventlog`, `rpc` y `observability` en el mismo paquete — [registro npm effect 4.0.6](https://registry.npmjs.org/effect/4.0.6). Algunos módulos nuevos son `unstable` o `experimental` — [Effect 4.0](https://effect.website/blog/releases/effect/40)

### Inferences
- **Mapeo del harness al hexágono:**

  | Concepto de harness | Pieza hexagonal |
  |---|---|
  | Bucle central | Despachador de comandos en `packages/domain` o en la capa de aplicación |
  | Catálogo de herramientas | Registro de comandos y consultas con JSON Schema 2020-12 (sección 2), proyectado como rutas Fastify, herramientas LangGraph y comandos de Telegram |
  | Policy gates | Middleware `authorize(ctx, cmd)` que devuelve `allow`/`deny`/`ask`, con "deny gana" y fallo cerrado ante error o timeout |
  | `ask` (humano en el bucle) | `interrupt()` de LangGraph con aprobación de la marca por Telegram |
  | Hooks | Middlewares pre/post y suscriptores de eventos de dominio |
  | Estado durable | `planetario_events` (verdad del negocio) + checkpointer Postgres de LangGraph (estado de la conversación); conviene no mezclarlos |
  | Telemetría | Un span por comando con atributos `command`, `marca_id`, `actor`, `idempotency_key`, `decision` |

- **Clave de idempotencia:** dado que LangGraph re-ejecuta nodos al reanudar y pg-boss reintenta jobs, la clave determinista debería derivarse de (`marca_id`, nombre del comando, id de la intención del agente o `thread_id` + `checkpoint`/paso, hash canónico del payload). La unicidad se aplica en la base de datos y el reintento se trata como éxito idempotente.
- **Qué devuelve el núcleo al agente:** resultados tipados (`Result`/errores de dominio) serializados como datos, nunca excepciones crudas. Así el modelo puede razonar sobre "rechazado por política X" igual que el harness del SDK de Claude devuelve `permissionDecisionReason`.
- **Pruebas como un adaptador primario más:** el propio "test harness" de Cockburn sugiere tratar las pruebas de contrato como otro adaptador primario. El mismo registro se puede ejercitar desde Vitest, HTTP y un agente simulado, lo que hace verificable "el agente propone, el dominio decide".

### Gaps
- No se revisaron las APIs de guardrails del OpenAI Agents SDK ni el detalle del checkpointer Postgres de LangGraph.js (nombre de paquete, tablas, compatibilidad con RLS). La página de interrupciones no lo nombra.
- No se encontraron referencias publicadas (blog o repo) que describan explícitamente un "núcleo hexagonal como harness de agentes" en TypeScript. La correspondencia anterior es inferencia de este análisis.
