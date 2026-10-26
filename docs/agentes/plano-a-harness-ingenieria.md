# Plano A — Harness Actor-Crítico de ingeniería

> Se carga en **toda** tarea que cambie el repositorio. Subordinado a `AGENTS.md` §4 a §9.

## 1. Roles

| Rol | Quién | Herramientas | Responsabilidad |
| :--- | :--- | :--- | :--- |
| **Actor** | Sesión principal (Opus 5.5 o Sonnet 5.5) | Lectura, escritura, terminal | Planea, cambia, ejecuta las verificaciones y entrega |
| **Crítico** | Subagente `critico-adversario` (Opus 5.5) | Solo lectura (`Read`, `Grep`, `Glob`) | Autopsia adversaria sin haber visto el razonamiento del Actor |
| **Verificadores** | Scripts del repositorio y la integración continua | — | Juicio determinista: verde o rojo |

El Crítico es un subagente y no una autorrevisión porque arranca sin contexto, no hereda las justificaciones del Actor y no puede escribir.

## 2. El bucle, paso a paso

### Paso 0 — Recibir la tarea
- Identifica su **traza**: el pendiente (`PEN-xx`), el ADR, el hallazgo de auditoría (`AUD-…`) o el nodo, arista o métrica del grafo que la justifica. Sin traza, o con dos lecturas razonables que llevan a cambios distintos, la tarea se escala.
- Si la tarea viene de una conversación con IA, es un insumo: se registra en `docs/fuentes/` y solo entra al kernel lo que el usuario confirme.

### Paso 1 — Hidratar
Orden fijo de `AGENTS.md` §2: kernel → grafo → modelo de carga → ADR vigentes → documento de detalle. Se lee el archivo **real** que se va a cambiar; nunca se asume su contenido.

### Paso 2 — Planear, antes de escribir
1. Archivos a cambiar y archivos generados que habrá que regenerar.
2. Invariantes y reglas en riesgo (`INV_01` a `INV_07`, `rule_01` a `rule_03`, `R01` a `R10`).
3. Qué verificación detectaría un error en este cambio.
4. ¿Cae en `AGENTS.md` §9? Si sí, se detiene aquí.

### Paso 3 — Actuar
- Cambio mínimo suficiente. Lo que se descubra fuera de alcance va a `riesgos_abiertos`; no se arregla de paso.
- Un campo nuevo en un archivo de arquitectura se declara primero en su esquema.
- Si cambia una versión, se escribe su changelog y se alinean las citas entre kernel, grafo y modelo (`V1`, `V2`).
- Los archivos generados **nunca** se editan a mano: se regeneran.

### Paso 4 — Verificar

**Fase documental (vigente: todavía no existe `packages/`).** Las cinco verificaciones de la integración continua, en este orden:

| # | Comando | Qué detecta |
| :-- | :--- | :--- |
| 1 | `node tools/validar-arquitectura/validar.mjs` | Esquemas, estructura del grafo, referencias, versiones y rutas citadas (incluido AGENTS.md) |
| 2 | `node tools/validar-arquitectura/pruebas.mjs` | Que el validador siga detectando cada tipo de error |
| 3 | `node tools/modelo-de-carga/calcular.mjs --check` | Resultados del modelo de carga desactualizados |
| 4 | `node tools/modelo-de-carga/calcular.mjs --estricto` | Algún nodo de infraestructura con ρ ≥ 0,70 |
| 5 | `node tools/vista-del-grafo/generar.mjs --check` | Vista del grafo desactualizada o sin cubrir todos los nodos |

Las cinco juntas: `npm run verificar:todo`.

**Fase de código (se activa con el primer paquete en `packages/`).** Se suman, declaradas en `package.json` y en la integración continua junto con ese paquete:

| Script | Qué detectará |
| :--- | :--- |
| `npm run verify:hexagon` | Importaciones prohibidas entre capas (`INV_06`, S1) |
| `npm run verify:contracts` | Esquemas inválidos o `version_contrato` sin incrementar |
| `npm run verify:3d-budgets` | Activos 3D sobre los presupuestos del kernel |
| `npm run test:integral` | Regresión funcional de punta a punta |

Mientras esos paquetes no existan, esos scripts **no se crean vacíos**: un script que siempre pasa falsearía la Definición de terminado. `verify:kernel` no hace falta como script aparte: lo cubre `validar.mjs`.

Un rojo en cualquiera vuelve al Paso 3. Nunca se ajusta un verificador, un umbral o una prueba para que pase.

### Paso 5 — Criticar
Se invoca `critico-adversario` con tres insumos: la traza y lo que pide (texto, no interpretación), la lista de archivos cambiados (`git diff --name-only`) y la salida resumida de las verificaciones.

- `APROBADO` → Paso 6.
- `RECHAZADO` → se corrigen los hallazgos `BLOQUEANTE` y `ALTA` y se repiten los Pasos 4 y 5.
- ⟨propuesto S3⟩ Tercer `RECHAZADO` seguido → se escala con los hallazgos abiertos.

### Paso 6 — Entregar
Doble salida (`plantillas/doble-salida.md`). Los cambios entran a `main` por pull request, con la integración continua en verde; publicar una rama o abrir un pull request requiere permiso explícito del usuario.

## 3. Anti-patrones

### Fase documental

| Anti-patrón | Por qué es grave aquí |
| :--- | :--- |
| Editar a mano `modelo-de-carga.resultados.json`, `docs/modelo-de-carga.md` o `docs/grafo-operacional.html` | Son generados; el `--check` de la integración continua lo detecta |
| Subir una versión sin su changelog o sin alinear las citas | Rompe `V1` y `V2` y la trazabilidad del kernel |
| Marcar un ADR como aprobado, o un pendiente como resuelto, sin que el usuario lo decida | Solo el usuario aprueba (`docs/adr/README.md`) |
| Llevar al kernel una afirmación de un insumo de IA sin verificarla | Los insumos no prevalecen sobre el kernel (`docs/fuentes/README.md`) |
| Citar una ruta o un ADR que no existe | `F1` y `F2` lo rechazan |
| Cambiar el esquema para que un dato inválido pase | Debilita el contrato en vez de corregir el dato |

### Fase de código

| Anti-patrón | Por qué es grave aquí |
| :--- | :--- |
| Conexión SQL abierta alrededor de una llamada al modelo, a Bold o a Telegram | Viola `INV_05`; con miles de sesiones agota el pool |
| Una mutación por `SlaveReadDatabasePort` | Viola `INV_07` |
| `INSERT` directo en `planetario_events` | Salta `appendCanonicalEvent`; rompe `INV_01` e `INV_02` |
| `new Date()` o `crypto.randomUUID()` en el dominio | No determinismo sin inyectar (S1) |
| Llamada al modelo e `interrupt()` en el mismo nodo | Al reanudar cambia la clave de idempotencia |
| La marca o el usuario tomados de la salida del modelo | Rompe `R05` y el principio de ADR-0002 |
| Prompt de producción editado sin subir su versión | El evento registra una versión que no corresponde a lo ejecutado |
| `eslint-disable`, `@ts-ignore` o `any` para silenciar un fallo | Esconde el error en vez de corregirlo |

## 4. Convenciones de entrega

- Rama por tarea con el prefijo que ya usa el repositorio: `docs/…`, `arquitectura/…` o `chore/…`; ⟨propuesto⟩ `codigo/…` para la fase de código.
- Asunto del commit en español, en forma de resultado ("Plan de capacidad aplicado: …"), con la traza en el cuerpo.
- Un commit por paso lógico; nunca mezclar un cambio de comportamiento con un refactor.
