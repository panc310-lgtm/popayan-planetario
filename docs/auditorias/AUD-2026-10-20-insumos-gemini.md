# Auditoría de insumos Gemini — coherencia e infraestructura planificada

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Alcance | Tres conversaciones de Gemini impresas en PDF ([FG-01](../fuentes/gemini/FG-01-arquitectura-grafos-operacionales.md), [FG-02](../fuentes/gemini/FG-02-revision-documento-maestro.md), [FG-03](../fuentes/gemini/FG-03-arquitectura-limites-ingenieria-agentica.md)), cruzadas con `arquitectura/kernel-durable.json` (1.1.1), `arquitectura/grafo-operacional.json` (v0.2), `scene_popayan.py` y las decisiones confirmadas por el usuario hasta el 2026-10-20 |
| Método | Lectura visual de las 34 páginas (los PDFs no tienen texto), resumen por turno, clasificación de cada afirmación, cruce con los artefactos del repo y verificación del estado de git |
| Estado | Informe. Las recomendaciones están **por aprobar** salvo las que figuran en el seguimiento |

## Seguimiento

| Hallazgo | Resolución | Fecha |
|---|---|---|
| AUD-17 | Kernel, grafo y esta auditoría confirmados en git y fusionados en `main` (PR #1, commit `bbc5595`) | 2026-10-20 |
| AUD-12 | Topología de despliegue aprobada: [ADR-0001](../adr/ADR-0001-topologia-de-despliegue.md), opción C. Aplicada en el kernel 1.2.0 y el grafo v0.3 | 2026-10-20 |

## Resumen ejecutivo

1. **Las conversaciones de Gemini sirven como insumo, no como fuente de verdad.** Los JSON que contienen están cortados en el PDF y la mayoría de sus decisiones ya fueron reemplazadas. El kernel 1.1.1 y el grafo v0.2 del repo ya corrigen casi todas las contradicciones.
2. **Falta una fuente.** La ecuación `S_Planetario`, el kernel `1.1.0-DURABLE-KERNEL` y el registro L3 de repositorios que hoy están en el kernel no aparecen en ninguno de los tres PDFs (AUD-04).
3. **La coherencia se perdió en FG-03, turno 6**, cuando se envió un enlace sin instrucción. Gemini respondió fuera de tema cinco veces seguidas y se recuperó en el turno 12 (AUD-05).
4. **La infraestructura no tiene una topología de despliegue decidida.** Gemini propone VPS + Docker Compose + Caddy; el presupuesto del 17-oct asume Vercel + Supabase + Cloudflare R2; el kernel deja abierto el host de los procesos permanentes. Quedan 40 días para la baseline v1.1 (AUD-12).
5. **No hay un modelo de carga único.** "Usuarios activos", "concurrentes", "recurrentes" y "paralelos" se usan como sinónimos; las tasas estimadas difieren en dos o tres órdenes de magnitud entre Gemini y el grafo v0.2 (AUD-11).
6. **Hay dos vocabularios de grafo sin tabla de equivalencias** (kernel N0–N6 frente al grafo N0/G/A/P/D/X), y el kernel no tiene nodos para identidad, reputación, fidelidad ni Noticias (AUD-15).
7. **La base durable no está guardada en git.** `kernel-durable.json` no está en ningún commit y el grafo v0.2 está sin confirmar (AUD-17). La regla de bloqueo depende de un validador que no existe (AUD-20).

## Escala de severidad

| Nivel | Significado |
|---|---|
| Crítico | Bloquea una fecha comprometida o puede llevar a construir algo equivocado |
| Alto | Debe resolverse antes de escribir código de producción |
| Medio | Debe resolverse antes de la baseline v1.1 (29-nov-2026) |
| Bajo | Higiene; se resuelve al pasar |

## Hallazgos

### A. Integridad de los insumos

**AUD-01 · Medio · Los PDFs no tienen capa de texto.** Se imprimieron con "Microsoft Print to PDF" como imágenes vectoriales. No se pueden buscar ni citar por texto. Esta auditoría los transcribió a mano en `docs/fuentes/gemini/`.

**AUD-02 · Alto · Los bloques de código están cortados en el margen derecho.** Afecta al inventario de FG-01, al prompt refactorizado y a los cuatro JSON durables de FG-03 (`CANONICAL_STATE_V1`, `V1.2`, `V1.3`, `POPAYAN_PLANETARIO_STATE_V1.1`). No se pueden reconstruir desde estos archivos. Consecuencia: la fuente canónica de esos contenidos es `arquitectura/kernel-durable.json`. Si se necesita el texto completo, hay que exportarlo desde Gemini (Compartir y exportar → Exportar a Documentos) o copiarlo como texto.

**AUD-03 · Bajo · Respuestas vacías y enlaces que Gemini no abrió.** FG-01 T1 y FG-03 T11 no tienen respuesta. Gemini declaró no poder abrir `share.gemini.google/03s3AsoYQ2Z3`, el artefacto `claude.ai/artifact/1FDyw1neXhzV7oyJ7uW73U` ni `codewiki.google`. Sin embargo, en FG-03 T3 afirma tener "la radiografía completa" de `wshobson/agents` (94 plugins, 202 agentes, 184–185 skills) por "documentación indexada": esos conteos no están verificados.

**AUD-04 · Alto · Brecha de trazabilidad: el kernel tiene contenido sin fuente aportada.** El usuario confirmó el 2026-10-20 como decisiones propias la ecuación `S_Planetario` (con `Ω0`, `Θ(0.90 − L_m)` y el término `⊕` del ledger) y el JSON `1.1.0-DURABLE-KERNEL`. También están en el kernel los repositorios L3 `Sairyss/domain-driven-hexagon`, `uber/h3-js`, `googlemaps/js-three`, `langchain-ai/langgraphjs`, `grammyjs/grammY`, `event-driven-io/emmett` y `timgit/pg-boss`. Nada de eso aparece en los tres PDFs: la última versión que muestran es `1.1.0-PLANETARIO-DURABLE` (2026-10-19). Hace falta aportar esa conversación como FG-04.

### B. Coherencia conversacional de Gemini

**AUD-05 · Alto · Desvío en FG-03, turnos 6 a 11.** Respuesta a la pregunta "¿desde dónde perdimos coherencia?":

| Turno | Qué se pidió | Qué respondió Gemini |
|---|---|---|
| T6 | Solo el enlace de `awesome-flutter` | Scripts de Blender con 5 soles comerciales (contradicen las 9 galaxias) |
| T7 | Analizar el repo (sin enlace) | Regeneró el inventario, las ecuaciones y los 3 grafos |
| T8 | Lo mismo, con enlace | Evaluó el presupuesto de activos 3D |
| T9 | ¿Tienes acceso a mi PC? | Desarrolló el Grafo 3 |
| T10 | ¿Desde dónde perdimos coherencia por cambio de modelo? | Regeneró el inventario otra vez |
| T11 | Evaluar el repositorio (sin enlace) | Nada |
| T12 | Lo mismo, con enlace | Se recupera: diagnostica el desvío y evalúa el repo |

El desvío empieza en **T6**, el primer mensaje con un enlace y sin instrucción. Los PDFs no registran qué modelo respondió cada turno, así que no se puede confirmar ni descartar un cambio de modelo. Lo que sí se ve es lo que el mismo Gemini reconoce en T12: recuperó fragmentos viejos de las fuentes del cuaderno (los scripts de 4/5 soles y fórmulas repetidas). Medidas: enviar siempre instrucción y enlace en el mismo mensaje; abrir cada sesión con el kernel vigente; retirar del cuaderno las fuentes reemplazadas o marcarlas como obsoletas.

**AUD-06 · Alto · Autoridad prestada de `@crm-erika`.** En FG-03 T1–T4 Gemini presenta el código de `@crm-erika` como "nuestro ecosistema", "implementación verificada", "80 % del riesgo técnico mitigado" y puntajes 29→83/100. Cita el techo de ~800 eventos/s, 1,23 ms por transacción, 30 de 31 mutantes y más de 940.000 cadenas. Son mediciones de otro sistema y no prueban nada sobre Popayán Planetario. El usuario lo corrigió en T14 y el kernel lo recoge en `architectural_separation_guardrail` y PEN-09. Riesgo residual: quien lea los PDFs sin este registro puede tomar esas cifras como propias.

**AUD-07 · Medio · Afirmaciones de estado del arte sin respaldo.**
- "OpenAI, Stripe, Supabase, Linear, Notion e Instagram operan sobre PostgreSQL 16" (FG-03 T2): ninguna publica su versión, y el almacén principal documentado de Stripe es MongoDB (DocDB). `[INCORRECTO]` como generalización.
- "~65 % menos tokens" con divulgación progresiva y "<800 tokens iniciales" por sesión: objetivos, no mediciones.
- `dataarts/100000-stars`: no existe como repositorio (el kernel ya lo retiró).
- Errores de contexto menores: "terminal de Mac" (el equipo es Windows), marcadores `[cite: 2, 7]` filtrados y la errata "CAPO 2".
- El usuario pidió analizar Rappi como referente (FG-03 T2) y no se analizó.

### C. Contradicciones con las decisiones vigentes

**AUD-08 · Medio · Decisiones reemplazadas que siguen escritas en los insumos.** Todas están corregidas en el kernel 1.1.1 y el grafo v0.2; el riesgo es reintroducirlas al reutilizar los PDFs.

| Tema | Qué dicen los insumos | Decisión vigente | Dónde está corregido |
|---|---|---|---|
| Zonas | 5 zonas: Centro_Historico, Norte_Comercial, Sur_Residencial, Occidente, Oriente_Universitario (FG-01, FG-03 T1, T2, T4) | 9 galaxias = 9 comunas urbanas, límites de OpenStreetMap | Kernel `galaxies_and_centers` |
| Canal de marcas | WhatsApp Business API con botones (FG-02, FG-03 T1–T13) | Telegram con botones inline (grammY) | Kernel N2, grafo X1 y E37–E46 |
| Pago | Confirmación manual de la marca; pasarela rechazada (FG-02, FG-03 T1–T13) | Verificación automática por webhook autenticado; es la compuerta al MVP; proveedor abierto | Kernel `gate_1_to_mvp`, grafo X7, E42, R10 |
| Congelamiento | Funciones congeladas el 30-nov | Baseline v1.1 el 29-nov y el desarrollo continúa | Kernel `stage_2_mvp_v1_1` |
| `@crm-erika` | Base de código y estado del arte verificado | Solo referencia de aprendizaje; nada compartido | Kernel `architectural_separation_guardrail` |
| Avisos al comprador | No definidos o por WhatsApp | Dentro de la app | Grafo E63 |
| Servicios | Flujo de estados de WhatsApp para citas (FG-02) | Cita y anticipo por WhatsApp directo con la marca, sin API | Grafo E61 |
| Logística | `N5_FULFILLMENT_&_DISPATCH` coordina entregas (FG-01) | La logística es de cada marca | Kernel `N5_FULFILLMENT_SERVICES` |
| Escala de marcas | 100 marcas desde el inicio | MVP: 1 marca por nicho; 100 en el producto final | Kernel `stage_gates` |

**AUD-09 · Medio · La escena 3D del repo contradice las reglas vigentes.** `scene_popayan.py` genera 4 estrellas (`Estrella_Dorada_Centro`, `Estrella_Cian_ZonaNorte`, `Estrella_Violeta_Tulcan`, `Estrella_Ambar_Bolivar`) con planetas en órbita. Lo vigente es un planeta del líder del nicho en el centro de cada sistema, 9 galaxias por comuna, y Bolívar no es zona objetivo. FG-02 ya lo había señalado (alerta B).

**AUD-10 · Alto · Pendientes de producto heredados sin cerrar.**

| Pendiente | Origen | Estado en el kernel |
|---|---|---|
| Fórmula de desempate y antimanipulación del índice (promedio bayesiano o mínimo de evaluaciones) | FG-02 D1 | No está; PEN-08 cubre solo el bucle de retroalimentación |
| Definición de "flujo comercial" (20 %) frente a "compras" (30 %) | FG-02 D2 | No está |
| Presupuesto: $20M ($10M producción + $10M pauta) frente a $2,85M de gasto operativo | FG-02 E | PEN-06, desactualizado |
| ¿La maqueta se construye sobre la misma base técnica del MVP? | FG-02 A | No está |
| Tecnología de la app móvil: ruta A (Capacitor/PWA sobre la web) o ruta B (Flutter/React Native + lienzo Three.js) | FG-03 T13 | No está; `awesome-flutter` figura en L3 sin decisión |

### D. Escala y capacidad

**AUD-11 · Alto · No hay un modelo de carga único.**

| Magnitud | Gemini (FG-01, FG-03) | Grafo v0.2 | Decisiones del usuario |
|---|---|---|---|
| Usuarios | 1.000 "activos" de base; meta 50.000 | 1.000 concurrentes en pico | MVP: 100 a 1.000 usuarios antes del lanzamiento; diseño hasta 50.000 |
| Concurrencia | 1.000 a 10.000 "recurrentes o paralelos" | 1.000 | No definida |
| Marcas | 100 de base; 1.000 de viabilidad | 100 | MVP: 1 por nicho; final: 100; diseño: hasta 1.000 |
| Franja pico | 11:30–14:00 y 18:30–21:30 | 12:00–13:00 | No definida |
| Eventos de negocio | 20 a 150 por segundo | 0,22 por segundo (100 pedidos/h) | — |
| Lecturas | 2.000 a 15.000 interacciones/s | 200 solicitudes API/s | — |

Si el MVP tiene como mucho 1.000 usuarios registrados, 1.000 concurrentes significa que todos están conectados a la vez. Hace falta un solo modelo con definiciones explícitas (registrados, activos mensuales, activos diarios, concurrentes en pico por la ley de Little, pedidos por hora, eventos por segundo, lecturas por segundo) y tres escenarios: MVP, lanzamiento oficial y diseño. Consecuencia práctica: a 0,22 eventos/s, el techo de ~800 eventos/s no es una restricción de rendimiento en el MVP; la maquinaria de posición al `COMMIT` se justifica por **corrección** (que los proyectores no salten eventos), no por volumen.

### E. Infraestructura planificada

**AUD-12 · Crítico · La topología de despliegue no está decidida.** Tres fuentes, tres respuestas: Gemini (FG-03 T1, heredado de `@crm-erika`) propone VPS + Docker Compose + Caddy + Backblaze B2 + MinIO; el presupuesto del 17-oct asume Vercel Pro + Supabase Pro + Cloudflare R2; el grafo v0.2 describe la API como funciones serverless, y el kernel reconoce en PEN-03 que pg-boss y los proyectores necesitan un proceso permanente que Vercel no aloja. Sin esta decisión no se puede estimar costo, escribir el pipeline de despliegue ni cerrar el presupuesto. Quedan 40 días para la baseline v1.1 y 51 para el lanzamiento del MVP. Propuesta de resolución: [ADR-0001](../adr/ADR-0001-topologia-de-despliegue.md).

**AUD-13 · Alto · Matriz de la infraestructura planificada.**

| Componente | Gemini (FG-01/FG-03) | Kernel 1.1.1 / grafo v0.2 | Presupuesto 17-oct | Estado |
|---|---|---|---|---|
| Lenguaje y runtime | Node.js 24 + TypeScript 5.9 | TypeScript, monorepo hexagonal (`packages/domain`, `packages/ports`); versiones sin fijar | — | Abierto: fijar versiones |
| API HTTP | Fastify 5 | Fastify | — | Coherente |
| Hosting de la API | VPS + Docker Compose + Caddy | Funciones serverless (P2) | Vercel Pro | **Conflicto** |
| Procesos permanentes (cola, proyectores, relay) | Worker residente en el VPS | pg-boss y proyectores; host sin definir (PEN-03) | No incluido | **Abierto, crítico** |
| Base de datos | PostgreSQL 16 autogestionado | PostgreSQL 16 | Supabase Pro | Abierto: confirmar la versión que ofrece el proveedor; `uuidv7()` nativo llegó en PostgreSQL 18 |
| Registro de eventos | `crm_events` + `appendCanonicalEvent` | `planetario_events` + `appendCanonicalEvent`, o Emmett (PEN-02) | — | Abierto |
| Cola y outbox | Inbox/outbox propio con `SKIP LOCKED` | pg-boss | — | Abierto: elegir uno |
| Carril efímero | Redis | Redis (D4), sin proveedor (PEN-04) | No incluido | Abierto |
| Objetos y CDN | MinIO + Backblaze B2 | "CDN con salida gratuita" (D2) | Cloudflare R2 | **Conflicto** |
| Canal de marcas | WhatsApp → Telegram (T14) | Telegram Bot API, grammY | WhatsApp Cloud API | Decidido; presupuesto desactualizado |
| Avisos al comprador | — | Dentro de la app (E63) | — | Decidido en web; push móvil abierto |
| Servicios | WhatsApp API | WhatsApp directo, sin API (E61) | — | Decidido |
| Verificación de pagos | Webhook firmado, sin proveedor | X7 por definir; solo Bold cumple todas las reglas (PEN-01) | — | **Abierto; bloquea el MVP** |
| Identidad | `N1_IDENTITY_GATEWAY` (FG-01), después desaparece | Facebook, Google o manual (X4); la API autentica (P2) | — | Abierto: proveedor o biblioteca |
| Modelos de IA | Enrutamiento por niveles | Anthropic Claude (X3) | Haiku 5.5 (usuario), Sonnet 5.5 (marca) | Coherente |
| Orquestación agéntica | Máquinas de estado | LangGraph.js | — | Propuesto |
| Índice geoespacial | — | H3 (`uber/h3-js`) | — | Propuesto |
| Mapa base | GLB desde OSM ≤ 3 MB; Google Maps `WebGLOverlayView` | GLB desde OSM; Google Maps por presupuestar o descartar (PEN-05) | — | Abierto |
| Pipeline 3D | Blender → GLB Draco/Meshopt + KTX2; Three.js | Igual | Nano Banana 2.1 API | Coherente |
| App móvil | Ruta A o ruta B | "App Móvil" en el producto final | Cuentas Apple y Google no incluidas | **Abierto** |
| Contratos | Ajv 8 + JSON Schema | Ajv 8; el esquema del kernel no existe (PEN-07) | — | Abierto |
| Antivirus | ClamAV | — | — | Evaluar necesidad: solo suben archivos las marcas |
| Respaldos | Backblaze B2 | — | — | Abierto |
| CI/CD | 6 workflows de `@crm-erika` | — | — | Abierto |
| Observabilidad | Telemetría JSON | T01–T20 definidos; sin herramienta | — | Abierto |

### F. Coherencia del modelo matemático y del grafo

**AUD-14 · Medio · Deriva de símbolos entre versiones.** `A_G` pasó de "matriz de adyacencia ponderada del grafo operacional" (FG-01) a "matriz de capacidades agénticas y de computación espacial" (FG-03 T7, T10) y a "tensor de adyacencia del Grafo 3" (kernel). `γ_coherencia` aparece como "garantizado en 1,0" en Gemini; en el kernel es una métrica medida (T08, umbral 0,999), que es lo correcto. El kernel 1.1.1 ya corrigió las fallas dimensionales de `F(t)` y `Φ_total` (Ω por transacción, τ̂ y δ̂ sin unidades, el ledger como identidad de cálculo). Lo que falta: una tabla por símbolo con dimensión, unidad, rango, fuente de datos (tabla o evento) y responsable. Sin eso, `S_Planetario` es un modelo conceptual y no se puede calcular. Además, con 9 galaxias, hasta 1.000 marcas y hasta 50.000 usuarios, la suma ingenua tiene 450 millones de términos por instante: la implementación debe recorrer solo los eventos confirmados, como ya dice la identidad de cálculo.

**AUD-15 · Alto · Dos vocabularios de grafo sin tabla de equivalencias.** El kernel usa N0–N6; el grafo v0.2 usa N0, G1–G5, A1–A3, P1–P12, D1–D4 y X1–X7. Ningún archivo dice cuál corresponde a cuál. Propuesta de equivalencias (por aprobar):

| Nodo del kernel | Nodos del grafo v0.2 |
|---|---|
| `N0_ORG_CORE` | N0, G1, restricciones R01–R10 |
| `N1_SPATIAL_DISCOVERY` | P1, D2, X5 |
| `N2_BRAND_ORCHESTRATOR` | A2, A3, G3, P6, P8, X1 |
| `N3_EVENT_BROKER_ENGINE` | D3, P5 |
| `N4_MATCHING_&_CATALOG_INDEX` | P3, P7, D4, X3 |
| `N5_FULFILLMENT_SERVICES` | P4, X2, X7 |
| `N6_AUDIT_&_AI_TELEMETRY` | P12, telemetría T01–T20 |
| **Sin nodo en el kernel** | P2 + X4 (API e identidad), P9 (reputación), P10 (fidelidad), P11 (Noticias), D1 (base transaccional), G2 (finanzas), G4 (ingeniería), G5 (crecimiento), A1 (compradores) |

El nodo de identidad existía en FG-01 (`N1_IDENTITY_GATEWAY`) y se perdió cuando N1 pasó a ser descubrimiento espacial. Los nombres también cambian de forma (`&` frente a `AND`, `DISPATCH` frente a `SERVICES`).

**AUD-16 · Medio · Versionado mezclado.** La secuencia de `schema_version` fue 1.0.0 → 1.2.0 → 1.3.0 → 1.1.0 (retrocede) → 1.1.1. Se mezclan tres ejes distintos: la versión del producto (baseline v1.1 del 29-nov), la del documento maestro (v0.1) y la del esquema del kernel. Propuesta: versionado semántico independiente para cada archivo de arquitectura y un campo aparte `baseline_producto`.

### G. Estado del repositorio

**AUD-17 · Alto · La base durable no está en git.** Un solo commit (`bcc6cff`, 2026-10-20). `arquitectura/kernel-durable.json` no está en ningún commit, `grafo-operacional.json` v0.2 está modificado sin confirmar y `grafo-operacional.v0.1.json` está sin seguimiento. Una pérdida del disco borraría el kernel.

**AUD-18 · Bajo · Copia redundante.** `grafo-operacional.v0.1.json` es idéntico (salvo finales de línea) a la versión del commit `bcc6cff`. El historial de git ya es el respaldo.

**AUD-19 · Medio · Higiene del repositorio.** No hay `README`, `.gitignore` ni `.gitattributes` (git avisa de conversión LF/CRLF en los JSON). `.claude/settings.local.json` es configuración local de esta máquina y no debería versionarse. `blender/Sin_nombre.blend` (3 MB) está sin nombre y sin Git LFS. `scene_popayan.py` está en la raíz.

**AUD-20 · Alto · La regla de bloqueo no se puede hacer cumplir.** El grafo dice que ninguna decisión se toma "sin que `validar_grafo.py` confirme" que todo cuelga de N0, que las marcas están aisladas y que ningún nodo supera su capacidad. Ese validador no existe, ni los JSON Schema del kernel y del grafo (PEN-07). Hoy la regla depende de revisión manual.

## Recomendaciones (por aprobar)

### Regla de precedencia de fuentes

1. Decisiones confirmadas por el usuario y registradas en el kernel o en un ADR.
2. Archivos canónicos del repo (`arquitectura/`).
3. Documento maestro en Claude Docs.
4. Conversaciones con IA (Gemini, ChatGPT, Claude): **insumos**, nunca autoridad.

Si dos fuentes se contradicen, gana la de mayor rango y la otra se marca `[SUPERADO]` en su resumen.

### Orden de trabajo propuesto

| # | Acción | Resuelve | Severidad |
|---|---|---|---|
| 1 | Confirmar en git el kernel, el grafo v0.2 y esta auditoría | AUD-17 | Alto |
| 2 | Decidir la topología de despliegue con un ADR (comparar costo y operación de VPS frente a Vercel + Supabase + host de procesos) | AUD-12, PEN-03 | Crítico |
| 3 | Decidir el proveedor de verificación de pagos | PEN-01 | Crítico |
| 4 | Construir un modelo de carga único con tres escenarios | AUD-11 | Alto |
| 5 | Aprobar la tabla de equivalencias y agregar al kernel identidad, reputación, fidelidad y Noticias | AUD-15 | Alto |
| 6 | ADRs para los componentes abiertos de la matriz (registro de eventos, cola, objetos, versión de PostgreSQL, identidad, app móvil) | AUD-13, AUD-10 | Alto |
| 7 | JSON Schema 2020-12 del kernel y del grafo, validador y CI | AUD-20, PEN-07 | Alto |
| 8 | Diccionario de símbolos con dimensión, unidad, fuente de datos y responsable | AUD-14, PEN-10 | Medio |
| 9 | Higiene del repo: README, `.gitignore`, `.gitattributes`, LFS, quitar la copia v0.1 | AUD-18, AUD-19 | Medio |
| 10 | Actualizar la escena 3D a 9 galaxias con el líder del nicho al centro | AUD-09 | Medio |
| 11 | Aportar la conversación de origen de `S_Planetario` y del kernel 1.1.0 como FG-04 | AUD-04 | Alto |
| 12 | Cerrar los pendientes de producto heredados (índice, flujo comercial, presupuesto) | AUD-10 | Alto |

### Estructura de repositorio propuesta

```
popayan-planetario-3d/
├── README.md                 qué es el proyecto, cómo navegarlo, regla de precedencia
├── .gitignore                incluye .claude/settings.local.json
├── .gitattributes            LF para JSON y Markdown; LFS para .blend y .glb
├── docs/
│   ├── fuentes/              registro de insumos (creado en esta auditoría)
│   ├── auditorias/           (creado en esta auditoría)
│   ├── adr/                  decisiones de arquitectura numeradas
│   ├── producto/             reglas vigentes tomadas del documento maestro
│   └── glosario.md
├── arquitectura/
│   ├── kernel-durable.json
│   ├── grafo-operacional.json
│   ├── modelo-de-carga.json
│   └── schemas/              un JSON Schema por archivo de arquitectura
├── tools/
│   └── validar-grafo/        el validador que exige la regla de bloqueo
├── assets-3d/
│   ├── blender/              archivos .blend con nombre, en Git LFS
│   └── scripts/              scene_popayan.py y utilidades de Blender
└── apps/ y packages/         monorepo TypeScript, cuando empiece el código
```

### Estándares propuestos

| Estándar | Para qué |
|---|---|
| ADR en formato MADR, numerados y con estado (propuesta, aprobada, reemplazada) | Cada decisión con contexto, opciones y consecuencias |
| JSON Schema 2020-12 + validación en CI | Que el kernel y el grafo no se rompan al editarlos |
| Versionado semántico por archivo + `baseline_producto` aparte | Separar versiones de producto, documento y esquema |
| Conventional Commits | Historial legible y changelog automático |
| Modelo C4 (contexto y contenedores) generado desde el grafo | Diagramas que no se desactualizan |
| Matriz de trazabilidad decisión → fuente → artefacto → prueba | Ya existe para R01–R10; extenderla a todo el kernel |

## Anexo: archivos auditados

| Archivo | Versión | Estado en git |
|---|---|---|
| `Base durable.pdf` (FG-01) | — | Fuera del repo; SHA-256 en el [registro de fuentes](../fuentes/README.md) |
| `base durable 1.1.pdf` (FG-02) | — | Fuera del repo |
| `base durable 2.pdf` (FG-03) | — | Fuera del repo |
| `arquitectura/kernel-durable.json` | 1.1.1-DURABLE-KERNEL | Sin seguimiento |
| `arquitectura/grafo-operacional.json` | 0.2 | Modificado sin confirmar |
| `arquitectura/grafo-operacional.v0.1.json` | 0.1 | Sin seguimiento; duplica `bcc6cff` |
| `scene_popayan.py` | — | En `bcc6cff` |
| `blender/Sin_nombre.blend` | — | En `bcc6cff` |
