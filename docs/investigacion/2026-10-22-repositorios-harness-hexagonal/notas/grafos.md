# Capa de grafos de Popayán Planetario: repositorios y enfoques (arquitectura como código, librerías TS, Postgres, ejecución, visualización, patrones)

Método: la actividad, la licencia, las estrellas y las versiones salen de la API REST de GitHub (`gh api repos/...`, campos `license.spdx_id`, `pushed_at`, `archived` y `/releases`) y del registro npm (`npm view`). Ambas se consultaron el 2026-10-22. La disponibilidad de extensiones en Supabase sale del repositorio de la imagen oficial `supabase/postgres` (rama `develop`, archivo `nix/ext/versions.json`). Contexto local verificado: `arquitectura/grafo-operacional.json` tiene 32 `nodos` y 61 `aristas` (campos `origen`, `destino`, `tipo`, `sincronia`, `peso.latencia_p95_ms`, `peso.friccion_media_s`, `peso.criticidad`, `clave_particion`, `idempotente`, `alcance`, `respaldo` y `ruta_pedido`), más `restricciones_aislamiento` y `telemetria`. El paquete raíz solo depende de `ajv 8.20.0`.

## 1. Arquitectura como código: ¿qué herramientas pueden generarse desde nuestro JSON o importarlo, cuáles son nativas de TypeScript y cuáles siguen mantenidas en 2026?

### Takeaway
LikeC4 es la única opción que combina las cuatro condiciones: nativa de TypeScript, licencia MIT, muy activa (v1.60.0, octubre de 2026) y una **API Builder programática**. Con ella, `grafo-operacional.json` se puede traducir a un modelo LikeC4 sin escribir DSL a mano, y de ese modelo salen Mermaid, D2, PlantUML, DrawIO, JSON, React y Web Components. Structurizr sigue vivo, pero en 2026 se consolidó en un solo repositorio Java. Mermaid es el destino de emisión más barato. D2 (MPL-2.0, Go) e IcePanel (SaaS de pago con importación de un solo sentido) sirven como destinos de salida, no como fuente.

### Cited Findings
**LikeC4**
- `likec4/likec4`: MIT, unas 5.949 estrellas, último push el 2026-10-22, no archivado. Releases v1.60.0 (2026-10-15), v1.59.4 (2026-09-21) y v1.59.3 (2026-09-02); en npm, `likec4` y `@likec4/core` están en 1.60.0. — [GitHub likec4/likec4](https://github.com/likec4/likec4), [npm likec4](https://www.npmjs.com/package/likec4)
- `@likec4/core` expone una **API Builder** con dos estilos. El estilo en cadena es `Builder.specification({elements, relationships, tags}).model(({actor, system, component, rel, relTo}, _) => …).views(({view, viewOf, $include, $style}, _) => …).toLikeC4Model()`. El de composición usa `Builder.forSpecification(...)` y `builder.with(model(...))`. `build()` devuelve `ParsedLikeC4ModelData` y `toLikeC4Model()` devuelve el modelo computado; también existe `computeLikeC4Model` en `@likec4/core/compute-view`. El modelo pasa por tres etapas: parsed, computed y layouted. — [README @likec4/core 1.60.0](https://cdn.jsdelivr.net/npm/@likec4/core@1.60.0/README.md)
- Comandos del CLI:
  - `likec4 export png|jpg|json|drawio`
  - `likec4 gen react|webcomponent|mermaid|dot|d2|plantuml`
  - `likec4 validate`, que falla con código distinto de cero ante errores de sintaxis o *layout drift*
  - `likec4 format --check`, para CI
  - `likec4 lsp`

  La página del CLI no documenta ningún importador desde datos externos. — [likec4.dev CLI](https://likec4.dev/tooling/cli/)
- La versión 1.18.0 ya generaba código TypeScript tipado del modelo (elementos y vistas). — [newreleases likec4 1.18.0](https://newreleases.io/project/npm/likec4/release/1.18.0)

**Structurizr (C4)**
- `structurizr/structurizr`: Apache-2.0, 487 estrellas, push el 2026-10-05. Usa dos líneas de release: aplicación (v2026.09.19 del 2026-09-19 y v2026.06.28) y librería (v6.2.3 del 2026-09-17). Los repos `structurizr/cli` (Apache-2.0), `structurizr/lite` (MIT) y `structurizr/java` aparecen **archivados**, con último push el 2026-02-01. — [GitHub structurizr/structurizr](https://github.com/structurizr/structurizr), [structurizr/cli](https://github.com/structurizr/cli), [structurizr/lite](https://github.com/structurizr/lite)
- El changelog de la aplicación agrupa los cambios en `local`, `server`, `playground`, `export`, `generate` e `inspect`. Incluye una corrección para exportar el sitio estático "when using workspace in JSON format", lo que indica que acepta un workspace JSON como entrada. El comando `inspect` reporta violaciones; un fix reciente corrige que terminara en éxito con 256 violaciones. — [changelog-application.md](https://github.com/structurizr/structurizr/blob/main/changelog-application.md)
- El README define la herramienta como "models as code" para C4 y como implementación de referencia de C4, con módulos `structurizr-json`, `structurizr-import` y `structurizr-export`. El README no detalla los formatos de importación. — [GitHub structurizr/structurizr](https://github.com/structurizr/structurizr)

**Mermaid, D2, Backstage e IcePanel**
- **Mermaid:** MIT, unas 90.800 estrellas, `mermaid@12.2.0` (2026-10-13). El layout ELK existe como paquete aparte: `@mermaid-js/layout-elk` 1.0.1 (MIT, 2026-10-02). — [GitHub mermaid-js/mermaid](https://github.com/mermaid-js/mermaid), [npm @mermaid-js/layout-elk](https://www.npmjs.com/package/@mermaid-js/layout-elk)
- **D2:**
  - `terrastruct/d2` redirige a `d2lang/d2`: licencia **MPL-2.0** (copyleft débil por archivo), unas 25.700 estrellas, v0.9.0 (2026-09-07), escrito en Go. — [GitHub d2lang/d2](https://github.com/d2lang/d2)
  - El paquete JS/wasm `@terrastruct/d2` está en 0.1.33, con última modificación en npm el 2025-08-17. Va rezagado frente al binario. — [npm @terrastruct/d2](https://www.npmjs.com/package/@terrastruct/d2)
- **Backstage:** Apache-2.0, unas 34.700 estrellas, activo. El plugin de grafo del catálogo `@backstage/plugin-catalog-graph` está en 0.6.9 (2026-10-20). — [GitHub backstage/backstage](https://github.com/backstage/backstage), [npm plugin-catalog-graph](https://www.npmjs.com/package/@backstage/plugin-catalog-graph)
- **IcePanel:**
  - Es SaaS comercial. En marzo de 2026 anunció la importación "model-as-code" desde JSON/YAML, con JSON Schema y SDK en TypeScript, entre otros lenguajes. El acceso a la API está limitado a los planes Growth y Scale. — [Blog IcePanel 2026-03-11](https://icepanel.io/blog/2026-03-11-new-model-as-code-import-json-yaml)
  - La importación agrega objetos y conexiones pero **no crea diagramas**. Además, "currently not able to export from IcePanel, modify the file and then import back". — [Docs IcePanel model imports](https://docs.icepanel.io/core-features/model-imports)
  - Exporta objetos, conexiones y flujos en CSV o JSON. — [IcePanel developer guide](https://developer.icepanel.io/developer-guide/how-to-guides/export-objects-and-relationships)

**Chequeos tipo ArchUnit en TypeScript (arquitectura hexagonal en el código)**
- `sverweij/dependency-cruiser`: MIT, unas 7.300 estrellas, v18.7.0 (2026-10-19), con releases semanales en septiembre y octubre de 2026. — [GitHub dependency-cruiser](https://github.com/sverweij/dependency-cruiser)
- `LukasNiessen/ArchUnitTS` (npm `archunit`): MIT, 507 estrellas, v2.5.4 (2026-09-13), push el 2026-10-21. — [GitHub ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS), [npm archunit](https://www.npmjs.com/package/archunit)
- `ts-arch/ts-arch`: MIT, 668 estrellas, último push el 2026-03-26, menos activo. — [GitHub ts-arch](https://github.com/ts-arch/ts-arch)

### Inferences
- **LikeC4 como artefacto derivado.** Un generador `grafo-operacional.json → Builder de LikeC4` mantendría el JSON como única fuente. LikeC4 aportaría vistas (N0 y gobernanza, servicios P1–P12, ruta de pedido), sitio estático y la emisión a Mermaid, D2, PlantUML y DrawIO. `likec4 validate` se sumaría a la CI como chequeo secundario.
- **Riesgo de LikeC4:** que no pueda guardar como metadatos los atributos cuantitativos de las aristas (p95, fricción, criticidad, ρ). No quedó verificado; ver Gaps.
- **Structurizr como destino JSON.** Sirve si se quiere el "estándar C4" y su `inspect`. El costo es depender de un toolchain JVM en la CI, y además cli, lite y java ya están archivados. Para un stack Node 24 es más fricción que LikeC4.
- **Mermaid** es el destino de menor costo para documentación en GitHub. La librería ya tiene un layout ELK opcional para el tamaño de grafo que manejamos (32 nodos).
- **D2** vale como salida estética vía binario Go. Su licencia MPL-2.0 solo obliga si se modifican archivos de D2.
- **Backstage** está sobredimensionado para un MVP de un solo equipo. Su modelo de relaciones de catálogo es inspiración, no base.
- **IcePanel** no sirve como fuente de verdad, porque la importación es de un solo sentido y no genera diagramas.
- **Conformidad entre código y grafo.** Se podrían generar automáticamente las reglas de dependency-cruiser o ArchUnitTS desde el grafo y las reglas R01–R10. Por ejemplo, prohibir que un módulo de "marca" importe otro de otra marca, o que el dominio importe adaptadores (hexágono de puertos y adaptadores). Así el grafo operacional también gobernaría la estructura del código: una *fitness function* derivada.

### Gaps
- No se verificó si los elementos y relaciones de LikeC4 admiten metadatos numéricos arbitrarios (p95, ρ), ni cómo se serializan en `export json`.
- No se documentó el esquema exacto del workspace JSON de Structurizr ni qué formatos acepta `structurizr-import`.
- No se encontró ningún conector que importe JSON propio a Mermaid o D2. En ambos casos habría que escribir un emisor, lo cual es trivial.

## 2. Librerías de grafos en TypeScript: ¿cuáles cubren ciclos, centralidad, caminos más cortos y análisis de cuellos de botella o propagación de ρ?

### Takeaway
graphology (MIT) cubre casi todo lo que necesita el validador: ciclos y orden topológico (`graphology-dag`), componentes fuertemente conexas, Dijkstra y A*, todos los caminos simples, y betweenness, closeness, PageRank y HITS (`graphology-metrics`). Su ritmo de releases del núcleo es lento (0.26.0 en febrero de 2025). Cytoscape.js (MIT, muy activo) trae el catálogo de algoritmos más amplio y corre sin DOM en Node, así que puede servir a la vez de modelo y de vista. Ninguna librería implementa colas o propagación de ρ: eso es código propio sobre el orden topológico. Para el layout, dagre (MIT) y elkjs (EPL-2.0 o GPL-3.0) son los estándares.

### Cited Findings
**graphology**
- `graphology/graphology`: MIT, 1.763 estrellas, push el 2026-09-02. Último release del núcleo: 0.26.0 (GitHub 2025-02-08; npm 0.26.0). — [GitHub graphology](https://github.com/graphology/graphology), [npm graphology](https://www.npmjs.com/package/graphology)
- La librería estándar tiene 22 módulos, entre ellos `dag`, `metrics`, `shortest-path`, `simple-path`, `components`, `traversal`, `communities-louvain`, `layout-forceatlas2`, `operators`, `gexf`, `graphml` y `svg`. Para render interactivo remite a sigma.js. — [graphology standard library](https://graphology.github.io/standard-library/)
- `graphology-dag` 0.4.1 (MIT, publicado en diciembre de 2023) ofrece `hasCycle`, `willCreateCycle`, `topologicalSort`, `topologicalGenerations`, `forEachNodeInTopologicalOrder` y `forEachTopologicalGeneration`. — [npm graphology-dag](https://www.npmjs.com/package/graphology-dag)
- `graphology-metrics` 2.4.2 (MIT, 2026-09-02) cubre:
  - centralidades de betweenness, edge betweenness, closeness, degree y eigenvector, además de HITS y PageRank;
  - densidad, diámetro, modularidad, excentricidad y grado ponderado. — [npm graphology-metrics](https://www.npmjs.com/package/graphology-metrics)
- `graphology-shortest-path` 2.1.0 ofrece caminos no ponderados (bidireccional y de fuente única), Dijkstra, A* y `edgePathFromNodePath`. `graphology-simple-path` ofrece `allSimplePaths` y `allSimpleEdgePaths`. `graphology-components` ofrece `stronglyConnectedComponents` y `connectedComponents`, entre otros. — [npm graphology-shortest-path](https://www.npmjs.com/package/graphology-shortest-path), [npm graphology-simple-path](https://www.npmjs.com/package/graphology-simple-path), [npm graphology-components](https://www.npmjs.com/package/graphology-components)

**ngraph y Cytoscape.js**
- **ngraph:** `ngraph.graph` 20.1.2 (BSD-3-Clause, 2026-02-14) se describe como "graph data structure". `ngraph.path` 1.6.1 (MIT, 2025-11-18) es su librería de búsqueda de caminos. — [GitHub anvaka/ngraph.graph](https://github.com/anvaka/ngraph.graph), [npm ngraph.path](https://www.npmjs.com/package/ngraph.path)
- **Cytoscape.js:** MIT, unas 11.200 estrellas, v3.34.4 (2026-10-15), con releases casi mensuales. — [GitHub cytoscape.js](https://github.com/cytoscape/cytoscape.js)
  - El bundle ESM 3.34.4 incluye `breadthFirstSearch`, `depthFirstSearch`, `dijkstra`, `aStar`, `floydWarshall`, `bellmanFord` y `kruskal`, además de `kargerStein`, `pageRank`, `degreeCentrality(Normalized)`, `closenessCentrality(Normalized)` y `betweennessCentrality`. También trae `markovClustering`, `kMeans`, `kMedoids`, `fuzzyCMeans`, `hierarchicalClustering`, `affinityPropagation`, `hierholzer`, `hopcroftTarjanBiconnected` y `tarjanStronglyConnected`. — [unpkg cytoscape@3.34.4 dist/cytoscape.esm.mjs](https://unpkg.com/cytoscape@3.34.4/dist/cytoscape.esm.mjs)
  - "You can use Cytoscape.js headlessly on Node.js to do graph analysis in the terminal or on a web server." — [js.cytoscape.org](https://js.cytoscape.org/)

**Layout**
- **dagre:** `@dagrejs/dagre` 3.1.1 en npm (MIT, 2026-08-08). En GitHub el último release publicado es v2.0.0 (2025-11-23), así que los releases de GitHub van por detrás de npm. — [GitHub dagrejs/dagre](https://github.com/dagrejs/dagre), [npm @dagrejs/dagre](https://www.npmjs.com/package/@dagrejs/dagre)
- **elkjs:** 0.12.0 (2026-07-17), con licencia **EPL-2.0 OR GPL-3.0-or-later** según npm. GitHub la reporta como NOASSERTION. — [npm elkjs](https://www.npmjs.com/package/elkjs), [GitHub kieler/elkjs](https://github.com/kieler/elkjs)

### Inferences
- **Mapeo directo al validador actual con graphology:**
  - `hasCycle` sobre el subgrafo de aristas `tipo=control` con origen en G1–G5 (sin ciclos en gobernanza).
  - Alcanzabilidad desde N0 por BFS o DFS, y `stronglyConnectedComponents` para señalar el ciclo exacto.
  - `betweennessCentrality` para detectar puntos únicos de falla (servicios P por donde pasan muchas rutas de pedido).
  - Dijkstra con peso `latencia_p95_ms` (o `friccion_media_s`) sobre `ruta_pedido=true` para el camino crítico del pedido.
  - `allSimplePaths` de comprador a pago para enumerar rutas alternativas cuando hay `respaldo`.
- **Propagación de ρ.** Se puede recorrer `topologicalGenerations` del subgrafo de request y event para propagar las tasas de llegada, con λ_destino = Σ λ_origen · p (fan-out), y luego ρ = λ/μ por nodo. Es código propio de unas decenas de líneas. Ninguna librería ofrece modelos de colas.
- **Cytoscape como librería única.** Si se quiere una sola librería para análisis y vista, Cytoscape tiene más algoritmos (incluidos SCC de Tarjan, biconectividad y Floyd-Warshall) y además renderiza. A cambio, su API de modelo es menos idiomática en TypeScript que la de graphology. No se verificó la calidad de sus tipos.
- **ngraph** resuelve layouts de miles de nodos. Con 32 nodos no aporta ventajas.
- **Licencia de elkjs.** Usar el paquete sin modificarlo como dependencia es compatible con proyectos privados, aunque conviene registrarlo como copyleft débil. dagre (MIT) es la alternativa sin esa consideración.

### Gaps
- No se verificó si graphology publica tipos TypeScript completos para toda la librería estándar (algunos módulos tienen releases antiguos: `graphology-traversal` 0.3.1 de 2022 y `graphology-dag` de 2023).
- No hay benchmarks recientes que comparen graphology y Cytoscape headless. A esta escala es irrelevante.

## 3. Grafos en PostgreSQL 17 sobre Supabase: Apache AGE, CTE recursivas, pgRouting, h3-pg y PostGIS

### Takeaway
En Supabase con PG17 **no están disponibles Apache AGE ni h3-pg**: ninguno aparece en el manifiesto de extensiones de la imagen oficial. Sí están PostGIS 3.3.7, pgRouting 3.4.1, pg_jsonschema 0.3.3, pgmq 1.5.1 y pg_cron 1.6.4. AGE soporta PG17 (releases de la rama PG17 de septiembre de 2025 y febrero de 2026), pero solo sirve si se sale de Supabase gestionado. Para el grafo operacional (32 nodos), las CTE recursivas de PG17 con `CYCLE` y `SEARCH` bastan. Para la rejilla hexagonal, la vía compatible con Supabase es calcular los índices H3 en la aplicación con `h3-js` 4.5.0 y guardarlos como columnas indexadas, más geometrías PostGIS.

### Cited Findings
**Supabase**
- La imagen `supabase/postgres` declara soporte para "PostgreSQL 15, 17, and OrioleDB-17", con `postgresql-17.11`. Las versiones de extensiones se fijan por versión mayor en `nix/ext/versions.json`. — [GitHub supabase/postgres README](https://github.com/supabase/postgres)
- Contenido de `versions.json` en `develop`, consultado el 2026-10-22:

  | Extensión | Versión y major soportado |
  |---|---|
  | `postgis` | 3.3.7 en PG17 (3.3.2 en PG15) |
  | `pgrouting` | 3.4.1 en PG15 y PG17 |
  | `pg_jsonschema` | 0.3.3 en PG15 y PG17 |
  | `pgmq` | 1.5.1 en PG15 y PG17 |
  | `pg_cron` | 1.6.4 en PG15, PG17 y orioledb-17 |
  | `pgjwt` | 0.2.0 en PG15 y PG17 |
  | `timescaledb` y `plv8` | solo PG15 |
  | `h3` y `age` | **no aparecen** |

  — [supabase/postgres nix/ext/versions.json](https://github.com/supabase/postgres/blob/develop/nix/ext/versions.json)
- La guía de extensiones de Supabase dice que vienen "pre-configured with over 50 extensions", que se pueden instalar extensiones SQL puras desde database.dev y que las nuevas se piden por GitHub Discussion. — [Supabase docs: extensions](https://supabase.com/docs/guides/database/extensions)

**Apache AGE**
- `apache/age`: Apache-2.0, unas 4.900 estrellas, push el 2026-10-13. El README lista soporte para "Postgres 11, 12, 13, 14, 15, 16, 17 & 18" y "Hybrid Querying: enables SQL and/or Cypher", vía `cypher('grafo', $$ … $$) AS (v agtype)` en el `FROM`. — [GitHub apache/age](https://github.com/apache/age)
- Tags de release por rama: `PG17/v1.6.0-rc0` (2025-09-22), `PG17/v1.7.0-rc0` (2026-02-11), `PG18/v1.8.0-rc0` (2026-07-09) y `PG15/v1.8.0-rc0` (2026-09-19). — [apache/age releases](https://github.com/apache/age/releases)

**CTE recursivas en PG17**
- `SEARCH DEPTH FIRST|BREADTH FIRST BY id SET ordercol` y `CYCLE id SET is_cycle USING path`. `CYCLE` agrega `is_cycle` y un arreglo `path` de nodos visitados, y corta la recursión al repetir un nodo. La documentación recomienda `CYCLE` + `ORDER BY path` en lugar de combinarlo con `SEARCH DEPTH FIRST`. — [PostgreSQL 17 docs: WITH queries](https://www.postgresql.org/docs/17/queries-with.html)

**pgRouting**
- `pgRouting/pgrouting`: licencia **GPL-2.0**, 1.442 estrellas. La versión upstream es v4.0.2 (2026-09-05), mientras que Supabase PG17 trae 3.4.1. — [GitHub pgRouting](https://github.com/pgRouting/pgrouting), [supabase versions.json](https://github.com/supabase/postgres/blob/develop/nix/ext/versions.json)

**H3**
- h3-pg **se mudó** a `postgis/h3-pg` (Apache-2.0, 386 estrellas, push el 2026-10-16). `zachasme/h3-pg` quedó archivado como redirección. — [GitHub postgis/h3-pg](https://github.com/postgis/h3-pg), [zachasme/h3-pg](https://github.com/zachasme/h3-pg)
- Notas de h3-pg v4.5.0 (2026-06-08):
  - el proyecto "now lives under the PostGIS umbrella" y embebe H3 v4.5.0;
  - agrega una clase de operadores GiST experimental para `h3index`, `h3_grid_ring`, `h3_is_valid_index` y `h3_reverse_directed_edge`;
  - **cambio incompatible:** corrige el comparador btree, que devolvía el signo invertido, y la actualización reindexa automáticamente. — [postgis/h3-pg releases](https://github.com/postgis/h3-pg/releases)
- Proveedores gestionados que sí traen H3:
  - Nile lo trae preinstalado. — [Nile docs h3](https://private-www.thenile.dev/docs/extensions/h3)
  - OVHcloud lo lista como `h3_postgis`. — [OVHcloud extensions](https://docs.ovhcloud.com/en/guides/public-cloud/databases/postgresql-extensions.md)
  - En Aiven es solo una idea pendiente, con 2 votos. — [Aiven ideas](https://ideas.aiven.io/forums/951280-operational-databases/suggestions/47150263-support-h3-pg-as-a-postgresql-extension)
- `uber/h3` v4.5.0 (2026-05-21) y `uber/h3-js` v4.5.0 (2026-07-01) usan Apache-2.0. h3-js está en npm como 4.5.0. — [GitHub uber/h3](https://github.com/uber/h3), [GitHub uber/h3-js](https://github.com/uber/h3-js)

### Inferences
- **AGE.** Con 32 nodos y 61 aristas, AGE no resuelve nada que no hagan las CTE recursivas, y además obligaría a salir de Supabase gestionado. Su valor aparecería solo si el grafo de tenants (marcas, sedes, compradores) creciera a millones de relaciones consultadas con patrones Cypher. Aun así no está en Supabase.
- **CTE recursivas.** Alcanzan para invariantes dentro de la base: "todo nodo es alcanzable desde N0" y "no hay ciclos en gobernanza" (`CYCLE … SET is_cycle`). También permiten consultas de impacto como "qué depende de D2". Así se replican en SQL las reglas que hoy corre la CI en Node.
- **pg_jsonschema** (disponible en PG17) permitiría aplicar en la base el mismo JSON Schema que valida Ajv en la CI, si el grafo se persiste como `jsonb`. Ver Gaps sobre la compatibilidad con 2020-12.
- **pgRouting** está disponible, pero es GPL-2.0. Se usa como extensión del servidor vía SQL, lo que normalmente no "contagia" al código de la aplicación. Conviene que el responsable legal lo valide.
- **H3 en Supabase sin h3-pg.** Calcular `latLngToCell` en la aplicación o en Edge Functions con `h3-js`, y guardar el índice como `text` o `bigint` con btree, junto a la `geometry` PostGIS del local. Los vecinos (`gridDisk`) y la agregación por padre (`cellToParent`) se calculan en la aplicación, y la consulta SQL usa `= ANY(...)`. Alternativas: pedir la extensión por GitHub Discussion, o usar Postgres autogestionado o un proveedor con H3 (Nile, OVH).
- **H3 como `clave_particion`.** La celda H3 (o la comuna) puede ser la clave de partición de las aristas del grafo operacional. Eso da λ por celda en el modelo de carga. Es la "doble hexagonalidad" que pide el usuario: puertos y adaptadores en el código, celdas H3 en los datos.

### Gaps
- No se encontró ninguna Discussion de Supabase sobre h3-pg ni sobre AGE. La ausencia se infiere del manifiesto de la imagen, no de una declaración oficial.
- No se confirmó si los tags `-rc0` de AGE son releases finales; parece ser su convención de tags, pero no se verificó.
- No se verificó qué *drafts* de JSON Schema soporta `pg_jsonschema` 0.3.3 (2020-12 o no).
- No se verificó que `ltree` (módulo contrib útil para rutas jerárquicas N0→G→P) esté habilitado en Supabase PG17.

## 4. Ejecución de grafos: LangGraph.js, XState, n8n, Node-RED, Rivet, Flowise y Langflow (utilidad y licencias)

### Takeaway
LangGraph.js (MIT, 1.5.2) y XState v5 (MIT, 5.33.3) están muy activos y ambos pueden **exportar su propio grafo**: `drawMermaid()` en LangGraph y caminos con `@xstate/graph`. Eso permite cruzar los grafos de ejecución con el grafo operacional en la CI. n8n usa la Sustainable Use License (*fair-code*: no permite distribución comercial y los archivos `.ee` son Enterprise). Su motor sirve de inspiración, no de dependencia, pero su lienzo está hecho con Vue Flow (MIT). Flowise fue **descontinuado y archivado** en agosto de 2026. Rivet tiene poca actividad desde mediados de 2025. Node-RED (Apache-2.0) y Langflow (MIT, Python) siguen vivos, pero están fuera del modelo de ejecución elegido.

### Cited Findings
**LangGraph.js**
- `langchain-ai/langgraphjs`: MIT, unas 3.370 estrellas, push el 2026-10-22. En npm, `@langchain/langgraph` está en 1.5.2 (2026-10-21) y `@langchain/langgraph-checkpoint-postgres` en 1.1.2 (2026-10-21). — [GitHub langgraphjs](https://github.com/langchain-ai/langgraphjs), [npm @langchain/langgraph](https://www.npmjs.com/package/@langchain/langgraph), [npm checkpoint-postgres](https://www.npmjs.com/package/@langchain/langgraph-checkpoint-postgres)
- La clase `Graph` de `@langchain/core/runnables/graph` expone:
  - `toJSON()`, `addNode`, `addEdge(source, target, data?, conditional?)`, `extend` y `reid`;
  - `drawMermaid(params?) : string` y `drawMermaidPng(...) : Promise<Blob>`. — [unpkg @langchain/core graph.d.ts](https://unpkg.com/@langchain/core/dist/runnables/graph.d.ts)

**XState y pg-boss**
- `statelyai/xstate`: MIT, unas 30.300 estrellas. `xstate` está en 5.33.3 (2026-10-19) y `@xstate/graph` en 3.0.4, que expone `getSimplePaths(machine)`, entre otras funciones. — [GitHub xstate](https://github.com/statelyai/xstate), [npm @xstate/graph](https://www.npmjs.com/package/@xstate/graph)
- `timgit/pg-boss`: MIT, unas 4.100 estrellas, 12.38.0 (2026-10-13). El repo también publica un dashboard (dashboard-1.12.1) y un proxy (proxy-1.13.0) el 2026-10-15. — [GitHub pg-boss](https://github.com/timgit/pg-boss)

**n8n**
- `n8n-io/n8n`: unas 208.000 estrellas, con releases paralelos `n8n@2.44.6` y `n8n@1.123.86` el 2026-10-22. GitHub reporta la licencia como NOASSERTION. — [GitHub n8n](https://github.com/n8n-io/n8n)
- Licencia: **Sustainable Use License v1.0**. Cita: "You may use or modify the software only for your own internal business purposes or for non-commercial or personal use". La distribución solo se permite gratuita y no comercial. Los archivos con `.ee.` en el nombre o `.ee` en el directorio requieren la n8n Enterprise License. — [n8n LICENSE.md](https://github.com/n8n-io/n8n/blob/master/LICENSE.md)
- El editor de n8n (`packages/frontend/editor-ui/package.json`) depende de `@vue-flow/core` 1.48.0, `@vue-flow/background`, `@vue-flow/controls`, `@vue-flow/minimap` y `@vue-flow/node-resizer`. — [n8n editor-ui package.json](https://github.com/n8n-io/n8n/blob/master/packages/frontend/editor-ui/package.json)

**Node-RED, Rivet, Flowise y Langflow**
- **Node-RED:** Apache-2.0, unas 23.800 estrellas, releases 5.0.9 y 4.1.17 (2026-10-21). — [GitHub node-red](https://github.com/node-red/node-red)
- **Rivet (Ironclad):** MIT, unas 4.700 estrellas. La app tuvo su último release como app-v1.11.3 (2025-08-08), la librería como v1.25.0 (2025-06-30) y `@ironclad/rivet-node` 1.25.0. Último push al repo: 2026-08-26. — [GitHub Ironclad/rivet](https://github.com/Ironclad/rivet), [npm @ironclad/rivet-node](https://www.npmjs.com/package/@ironclad/rivet-node)
- **Flowise:**
  - La API de GitHub marca `FlowiseAI/Flowise` como **archivado**, con último push el 2026-08-13. También están archivados `FlowiseDocs`, `FlowiseChatEmbed` y `FlowiseEmbedReact`. — [GitHub FlowiseAI/Flowise](https://github.com/FlowiseAI/Flowise)
  - La página oficial de cierre anuncia el freeze el 29 de julio de 2026, el archivo planeado para el 10 de agosto y el fin de vida el 31 de agosto. El código queda en Apache 2.0 y la recomendación es hacer un fork. — [flowiseai.com/sunset](https://flowiseai.com/sunset)
  - **Sin verificar en fuente primaria:** una fuente secundaria reporta 6 avisos de seguridad High o Critical sin parche (10 de septiembre de 2026) y licencia comercial en el directorio enterprise. — [devtoollab](https://devtoollab.com/blog/flowise-alternatives)
- **Langflow:** MIT, unas 156.000 estrellas, v1.12.8 (2026-10-22). Es Python. — [GitHub langflow](https://github.com/langflow-ai/langflow)

### Inferences
- **"Grafo de grafos" verificable.** El generador de documentación podría compilar cada StateGraph de LangGraph, llamar a `drawMermaid()` y `toJSON()`, y comprobar en la CI que cada nodo de agente corresponda a un servicio P del grafo operacional y que sus llamadas externas usen aristas existentes. Igual con la máquina de pedidos de XState: `getSimplePaths` enumera los recorridos del ciclo de vida, y cada recorrido se puede cruzar con las aristas `ruta_pedido=true` y convertir en una prueba basada en el modelo.
- **n8n** sirve como **inspiración visual y de UX** (su lienzo es Vue Flow, MIT). Incrustar o redistribuir su motor dentro de un producto comercial queda fuera de la licencia. Para tooling interno ("internal business purposes") sí estaría permitido, pero conviene revisarlo legalmente.
- **Node-RED** (Apache-2.0) es la alternativa permisiva si se quisiera un ejecutor visual interno (por ejemplo, para automatizaciones del equipo). Su modelo de flujo es distinto de LangGraph y pg-boss.
- **Rivet y Flowise** no conviene adoptarlos como base: uno tiene baja actividad y el otro está descontinuado. **Langflow** queda fuera del stack TypeScript.

### Gaps
- No se confirmó el nombre exacto del método para obtener el grafo de un StateGraph compilado en LangGraph.js 1.5 (`getGraph` o `getGraphAsync`). Sí se confirmó que `drawMermaid` existe en la clase `Graph` de `@langchain/core`.
- No se revisó el texto de la Enterprise License de n8n (`LICENSE_EE.md`).

## 5. Visualización: lienzos de nodos 2D (estilo n8n) y grafo o espacio 3D con H3

### Takeaway
Para el lienzo 2D, xyflow (React Flow 12.12 / Svelte Flow 1.7, MIT) es la opción más activa. Vue Flow (MIT, lo usa n8n) funciona pero su ritmo de releases bajó en 2026 (último 1.48.2 en enero). Rete.js (MIT) aporta motores de flujo de datos y de control. JointJS tiene núcleo MPL-2.0 y funciones clave de pago (JointJS+). En 3D, `three-forcegraph` (MIT) se integra como objeto Three.js dentro del universo existente, y deck.gl 9.4 (MIT) ofrece `H3HexagonLayer` para la vista cartográfica hexagonal.

### Cited Findings
**Lienzos 2D**
- **xyflow:** `xyflow/xyflow` (MIT, unas 38.800 estrellas, push el 2026-10-22) publicó `@xyflow/react@12.12.0` y `@xyflow/svelte@1.7.0` el 2026-09-24. Se describe como "A highly customizable React library for building node-based editors and interactive flow charts". — [GitHub xyflow](https://github.com/xyflow/xyflow), [npm @xyflow/react](https://www.npmjs.com/package/@xyflow/react)
- **Vue Flow:** `bcakmakoglu/vue-flow` (MIT, unas 6.900 estrellas) publicó v1.48.2 el 2026-01-28. Último push: 2026-07-14. — [GitHub vue-flow](https://github.com/bcakmakoglu/vue-flow)
- **Rete.js:** `retejs/rete` (MIT, unas 12.300 estrellas, push el 2026-10-18). `rete` está en 2.0.6 (2025-06-30) y `rete-area-plugin` en 2.3.2 (2026-07-08). Soporta procesamiento "based on both dataflow and control flow" y renderizado en React, Vue, Angular o Svelte vía Rete Kit. — [GitHub retejs/rete](https://github.com/retejs/rete)
- **JointJS:**
  - "The JointJS library is licensed under the Mozilla Public License 2.0". `@joint/core` está en 4.3.3 (2026-09-04). JointJS+ es comercial y agrega stencils, inspectors, toolbars, layouts avanzados, más import/export y "JointJS for React". — [GitHub clientIO/joint](https://github.com/clientIO/joint)
  - **Contradicción:** el repo abierto publica tags `@joint/react@4.3.6`, pero el README lista "JointJS for React" como parte de JointJS+. — [releases clientIO/joint](https://github.com/clientIO/joint/releases)

**3D y espacio H3**
- **Grafos de fuerza 3D (vasturiano):**
  - `3d-force-graph` 1.80.1 (MIT, 2026-09-29, unas 6.500 estrellas) es un "UI component for a 3D force-directed graph using ThreeJS and d3-force-3d layout engine".
  - `three-forcegraph` 1.43.6 (MIT, 2026-09-30) es un "Force-directed graph as a ThreeJS 3d object".
  - Además: `react-force-graph-3d` 1.29.2 y `d3-force-3d` 3.0.6. — [GitHub 3d-force-graph](https://github.com/vasturiano/3d-force-graph), [GitHub three-forcegraph](https://github.com/vasturiano/three-forcegraph), [npm react-force-graph-3d](https://www.npmjs.com/package/react-force-graph-3d)
- **react-three-fiber:** `pmndrs/react-three-fiber` (MIT, unas 33.200 estrellas) tiene la rama estable en v9.8.2 (2026-10-15) y v10.0.0-alpha.6 (2026-10-17). — [GitHub react-three-fiber](https://github.com/pmndrs/react-three-fiber)
- **deck.gl y `H3HexagonLayer`:**
  - `visgl/deck.gl` (MIT, unas 14.700 estrellas) publicó v9.4.0 el 2026-09-05; `@deck.gl/geo-layers` 9.4.0. — [GitHub deck.gl](https://github.com/visgl/deck.gl)
  - `H3HexagonLayer` toma `getHexagon` (índice H3) y `highPrecision`, que por defecto vale `'auto'`. Por defecto usa dibujo instanciado, asumiendo que todos los hexágonos del viewport tienen la forma del central. El modo de alta precisión hace falta con pentágonos, resoluciones 0–5 o resoluciones mezcladas. También acepta `coverage` (de 0 a 1), requiere `h3-js` v4 y todos los hexágonos de una capa deben tener la misma resolución. — [deck.gl H3HexagonLayer](https://deck.gl/docs/api-reference/geo-layers/h3-hexagon-layer)

### Inferences
- **El lienzo estilo n8n que ya existe** se puede seguir generando desde el JSON:
  - React Flow o Svelte Flow si el cliente web usa React o Svelte;
  - Vue Flow si se quiere replicar n8n tal cual, aceptando su cadencia más lenta;
  - Cytoscape (sección 2) para vistas analíticas con nodos compuestos por capa (organizacional, gobernanza, plataforma, datos, externos) y layout ELK.
- **ρ en vivo sobre el lienzo.** Los atributos de arista (p95, criticidad, ρ) se pueden mapear a grosor y color de los conectores.
- **El grafo dentro del universo 3D.** `three-forcegraph` permite incrustar el grafo operacional como objeto en la escena Three.js existente (por ejemplo, una "galaxia de infraestructura" junto a las 9 comunas) sin un segundo renderizador. `3d-force-graph` es la variante independiente, más rápida para un prototipo.
- **Hexágonos en dos rutas.**
  - Dentro de Three.js: `h3-js` (`cellToBoundary`) produce los vértices y se construyen mallas extruidas propias. Así se mantiene una sola escena y una sola estética.
  - Vista cartográfica separada: deck.gl `H3HexagonLayer`, apto para densidad de marcas o λ por celda. Para un mapa urbano de Popayán, resoluciones finas (de 7 a 9 o más) evitan el modo de alta precisión.

### Gaps
- No se verificó el estado ni la licencia exacta del paquete `@joint/react` (abierto o JointJS+).
- No se evaluó el rendimiento de `three-forcegraph` junto a la escena actual del universo (número de draw calls).

## 6. Patrones innovadores: invariantes en CI, gemelo digital alimentado por OpenTelemetry, y autorización basada en relaciones (OpenFGA, SpiceDB, Cedar) para R01–R10

### Takeaway
Hay piezas maduras y permisivas (Apache-2.0) para tres patrones que encajan con el "harness":
- **gemelo digital del grafo:** el conector `service_graph` de OpenTelemetry Collector emite métricas por arista (cliente→servidor, con tipo de conexión base de datos o mensajería) de las que se derivan λ y tiempos de servicio para un ρ en vivo, aunque está en estado *alpha*;
- **ReBAC tipo Zanzibar:** OpenFGA (CNCF Incubating desde octubre de 2025) y SpiceDB (soporta PostgreSQL 15+) pueden modelar el aislamiento entre marcas como relaciones;
- **Cedar** (CNCF Sandbox) aporta un lenguaje de políticas con herramientas de análisis simbólico.

### Cited Findings
**Gemelo digital con OpenTelemetry**
- El conector `service_graph` (antes `servicegraph`, nombre ya deprecado) es *alpha* para trazas → métricas.
- Emite `traces_service_graph_request_total`, `traces_service_graph_request_failed_total`, los histogramas `traces_service_graph_request_server` y `traces_service_graph_request_client`, `traces_service_graph_unpaired_spans_total` y `traces_service_graph_dropped_spans_total`. Las etiquetas son `client`, `server` y `connection_type` (`unset`, `messaging_system` o `database`).
- Empareja spans client/server y producer/consumer, y crea **nodos virtuales** para destinos no instrumentados vía `peer.service`, `db.name` o `db.system`.
- Requiere que todos los spans de una traza lleguen a la misma instancia del colector, para lo que se sugiere el load-balancing exporter. — [OTel servicegraphconnector README](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/servicegraphconnector/README.md)

**OpenFGA**
- `openfga/openfga`: Apache-2.0, unas 6.000 estrellas, v1.22.0 (2026-10-06), con releases cada 2–3 semanas. `@openfga/sdk` está en 0.9.7 y `@openfga/syntax-transformer` en 0.2.2. — [GitHub openfga](https://github.com/openfga/openfga), [npm @openfga/sdk](https://www.npmjs.com/package/@openfga/sdk)
- Es proyecto **CNCF Incubating**: aceptado el 28 de octubre de 2025, Sandbox desde 2022. Está inspirado en Zanzibar. — [CNCF blog](https://www.cncf.io/blog/2025/11/11/openfga-becomes-a-cncf-incubating-project/), [openfga.dev blog](https://openfga.dev/blog/incubation-announcement)

**SpiceDB**
- `authzed/spicedb`: Apache-2.0, unas 7.200 estrellas, v1.57.0 (2026-10-20). `@authzed/authzed-node` está en 1.6.1. — [GitHub spicedb](https://github.com/authzed/spicedb)
- Datastores: CockroachDB, Spanner, PostgreSQL ("Postgres 15 or newer is required for optimal performance", con servicios gestionados soportados, por ejemplo RDS), MySQL (no recomendado) y memdb (solo desarrollo). La Watch API sobre Postgres requiere `track_commit_timestamp`. — [SpiceDB datastores](https://authzed.com/docs/spicedb/concepts/datastores)

**Cedar**
- `cedar-policy/cedar`: Apache-2.0, unas 1.800 estrellas. Publicó v4.14.0 y `cedar-policy-symcc-v0.8.0` el 2026-10-17. `@cedar-policy/cedar-wasm` 4.14.0 está en npm (Apache-2.0). — [GitHub cedar](https://github.com/cedar-policy/cedar), [npm cedar-wasm](https://www.npmjs.com/package/@cedar-policy/cedar-wasm)
- Cedar entró a la CNCF como **Sandbox**, y AWS declara la intención de llevarlo a Incubation. Es un lenguaje y SDK de políticas, no un servicio completo de autorización. — [AWS Open Source Blog](https://aws.amazon.com/blogs/opensource/cedar-joins-cncf-as-a-sandbox-project), [InfoQ 2026-01](https://infoq.com/news/2026/01/cedar-joins-cncf-sandbox/)

**Validación estructural in-CI (estado de la industria)**
- Structurizr incorpora `inspect` (reporta violaciones del modelo). — [changelog Structurizr](https://github.com/structurizr/structurizr/blob/main/changelog-application.md)
- LikeC4 incorpora `validate` (sintaxis y *layout drift*). — [likec4.dev CLI](https://likec4.dev/tooling/cli/)
- dependency-cruiser y ArchUnitTS aplican reglas de arquitectura sobre el código. — [dependency-cruiser](https://github.com/sverweij/dependency-cruiser), [ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS)

### Inferences
- **Gemelo digital del grafo operacional:**
  - Con `service.name` igual al id del nodo (P1…P12), `rate(traces_service_graph_request_total{server="P4"})` da λ observada por nodo, y el histograma `request_server` da el tiempo de servicio, de donde sale μ ≈ 1/E[S] por réplica.
  - ρ observado = λ/(c·μ) se compara con `modelo-de-carga.resultados.json`. Así se cierra el ciclo entre el modelo y la realidad (*model-vs-observed drift*).
  - Las aristas observadas sin contraparte en `aristas` se alertan como "arquitectura no declarada", y las declaradas sin tráfico como "aristas muertas".
  - `connection_type=database` corresponde a D1–D4 y `messaging_system` a las aristas `event` o `message`.
  - El costo es operar un Collector en estado alpha con balanceo por traza.
- **R01–R10 como invariantes de autorización (ReBAC):**
  - Las reglas de aislamiento ("sin aristas entre marcas") pueden pasar de documento a modelo de autorización. Por ejemplo, tipos `marca`, `sede`, `comprador` y `operador`, con relaciones `sede#marca` y `marca#admin`.
  - Ninguna relación cruza marcas salvo vía N0 o gobernanza. Las mismas reglas generarían el modelo de OpenFGA o SpiceDB y los tests de aislamiento.
  - OpenFGA y SpiceDB añaden un servicio más (P13) y un datastore. SpiceDB puede usar Postgres, pero la Watch API requiere `track_commit_timestamp`. Ver Gaps.
- **Cedar** encaja mejor como políticas evaluadas en proceso (wasm en Node), sin servidor adicional. Su componente `symcc` sugiere análisis simbólico para *probar* propiedades de aislamiento; ver Gaps.
- **Alternativa de base:** RLS de Postgres en Supabase por `marca_id`. No se investigó aquí. Es la opción de menor costo operativo con la que habría que comparar.
- **Invariantes adicionales derivables del grafo en la CI:**
  - toda arista `payment` debe ser `idempotente=true` y tener `respaldo`;
  - toda arista `sincrona` en `ruta_pedido` debe sumar un p95 por debajo del presupuesto de latencia del pedido (Dijkstra o camino más largo en DAG);
  - toda arista con `alcance` de tenant debe tener `clave_particion`;
  - ningún nodo con betweenness alta puede carecer de telemetría en T01–T23.

  Todas se pueden calcular con graphology dentro del validador actual (`tools/validar-arquitectura/validar.mjs`).

### Gaps
- No se verificaron los datastores soportados por OpenFGA ni su compatibilidad con Supabase.
- No se verificó si Supabase gestionado permite activar `track_commit_timestamp` (necesario para la Watch API de SpiceDB).
- No se verificó qué demuestra exactamente `cedar-policy-symcc` (el nombre sugiere compilación simbólica para análisis formal, sin confirmar en la documentación).
- No se encontraron casos públicos de "gemelo digital" que calculen ρ = λ/μ por nodo desde métricas de service graph de OTel. La propuesta es una síntesis propia, no una práctica documentada.
