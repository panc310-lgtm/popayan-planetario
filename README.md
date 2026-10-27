# Popayán Planetario

Directorio comercial de Popayán presentado como un sistema planetario en 3D: cada comuna urbana es una galaxia, cada nicho es un sistema y cada marca es un planeta que orbita al líder de su nicho. Los compradores exploran, guardan favoritos en Mi universo, compran dentro de la plataforma y conversan con un agente de IA. Las marcas operan sus pedidos por Telegram.

Este repositorio es la base de ingeniería del proyecto: las decisiones aprobadas, la arquitectura, los modelos de cálculo y el código.

## Estado

Arquitectura aprobada y primer nodo de código (PLANETARIO-CORE-01, 2026-10-27): el núcleo hexagonal con los contratos, los puertos, el dominio del pedido y el pago, y el simulador de verificación de pagos de ADR-0003. Todavía no hay servicios desplegables, base de datos ni interfaz.

| Fase | Fecha | Qué es |
|---|---|---|
| Maqueta | Antes del MVP | Web navegable con marcas ficticias para la administración municipal |
| MVP | 10-dic-2026 | Una marca por nicho, pagos reales y objetivo de 1.000 usuarios el día de lanzamiento |
| Lanzamiento oficial | Semana Santa 2027 | 100 marcas, app móvil y requisito de 10.000 sesiones simultáneas |

## Organización

| Ruta | Contenido |
|---|---|
| [`arquitectura/kernel-durable.json`](arquitectura/kernel-durable.json) | Fuente de verdad: decisiones aprobadas, invariantes de ingeniería, despliegue, arquitectura de agentes y pendientes (PEN-xx) |
| [`AGENTS.md`](AGENTS.md) y [`CLAUDE.md`](CLAUDE.md) | Constitución operativa: cómo trabajan los agentes de ingeniería en este repositorio y reglas de construcción de los agentes de producción. `CLAUDE.md` importa `AGENTS.md` para Claude Code |
| [`docs/agentes/`](docs/agentes/plano-a-harness-ingenieria.md) | Detalle de AGENTS.md por plano y por agente (P7, P8, P13), y la plantilla de la doble salida |
| [`.claude/agents/`](.claude/agents/critico-adversario.md) | Subagente crítico adversario, en solo lectura |
| [`arquitectura/grafo-operacional.json`](arquitectura/grafo-operacional.json) | Nodos, aristas, servicios de despliegue, restricciones de aislamiento (R01–R10) y telemetría (T01–T26) |
| [`arquitectura/modelo-de-carga.json`](arquitectura/modelo-de-carga.json) | Parámetros del modelo de carga; sus resultados se generan |
| [`arquitectura/schemas/`](arquitectura/schemas/kernel.schema.json) | JSON Schema 2020-12 de los tres archivos de arquitectura |
| [`packages/contracts/`](packages/contracts/src/index.ts) | Contratos: esquemas JSON 2020-12 (catálogo y galaxias, pedido y su máquina de estados, vector Π, evento canónico), sus tipos y el historial de versiones. No importa nada |
| [`packages/ports/`](packages/ports/src/index.ts) | Puertos del hexágono: reloj, identificadores, escritura y lectura de la base (INV_07), registro de eventos, verificador de pagos y Telegram de la marca |
| [`packages/domain/`](packages/domain/src/index.ts) | Dominio puro: compuerta Ω, máquina de estados del pedido con R10, cortafuegos de visibilidad, reputación y rule_02, idempotencia y casos de uso |
| [`packages/adapters/`](packages/adapters/src/pagos/verificador-simulado.ts) | Adaptadores; por ahora, el simulador determinista de `VerificadorDePagos` |
| [`test/`](test/integral/flujo-de-pago.test.ts) | Dobles en memoria de los puertos, ejemplos tipados y la prueba integral del flujo de pedido y pago |
| [`docs/adr/`](docs/adr/README.md) | Decisiones de arquitectura (ADR) |
| [`docs/modelo-de-carga.md`](docs/modelo-de-carga.md) | Reporte del modelo de carga: tasas, capacidad, réplicas y costo de la IA (generado) |
| [`docs/grafo-operacional.html`](docs/grafo-operacional.html) | Vista interactiva del grafo: lienzo de nodos, vistas por tema y recorrido de la ruta del pedido (generada; se abre en el navegador) |
| [`docs/auditorias/`](docs/auditorias/AUD-2026-10-20-insumos-gemini.md) | Auditorías y su seguimiento |
| [`docs/fuentes/`](docs/fuentes/README.md) | Registro de insumos: conversaciones con IA, documentos y su estado |
| [`docs/investigacion/`](docs/investigacion/README.md) | Investigaciones de estado del arte que preparan decisiones, con su verificación |
| [`tools/modelo-de-carga/`](tools/modelo-de-carga/README.md) | Calculadora del modelo de carga |
| [`tools/validar-arquitectura/`](tools/validar-arquitectura/README.md) | Validador de esquemas, estructura y referencias, con sus pruebas |
| [`tools/vista-del-grafo/`](tools/vista-del-grafo/README.md) | Generador de la vista interactiva del grafo |
| [`tools/verificar-hexagono/`](tools/verificar-hexagono/README.md), [`tools/verificar-contratos/`](tools/verificar-contratos/README.md), [`tools/verificar-presupuestos-3d/`](tools/verificar-presupuestos-3d/README.md) | Verificaciones de la fase de código, con sus pruebas |
| `blender/`, `scene_popayan.py` | Prototipo visual en Blender; desactualizado frente a las 9 galaxias (AUD-09) |
| `.github/workflows/` | Integración continua |

## Cómo se decide

- Solo el usuario aprueba decisiones. Cada decisión de arquitectura que cuesta revertir es un ADR; al aprobarse, se refleja en el kernel y en el grafo.
- Las conversaciones con IA (Gemini, ChatGPT, Claude) son insumos, no fuente de verdad. Se registran en `docs/fuentes/` con el estado de cada afirmación.
- Los cambios entran a `main` por pull request, con la integración continua en verde.

## Requisitos

- Node.js 24 o posterior, que ejecuta TypeScript directamente. Las dependencias de desarrollo (Ajv y TypeScript) se instalan con versiones exactas desde `package-lock.json`. Los paquetes de `packages/` no tienen dependencias externas: solo se usan entre sí, como espacios de trabajo de npm.
- [Git LFS](https://git-lfs.com) para los archivos 3D (`.blend`, `.glb`, `.ktx2`). Una vez por equipo, antes de clonar:

```bash
git lfs install
```

## Verificaciones

La integración continua corre en cada pull request y en cada cambio de `main`:

- Que el kernel, el grafo y el modelo de carga cumplan sus JSON Schema.
- Que el grafo sea estructuralmente correcto: todo cuelga del núcleo N0, no hay aristas entre marcas, las referencias existen.
- Que los tres archivos sean coherentes entre sí: versiones alineadas, rutas citadas que existen, estado de los ADR igual en todas partes.
- Que `AGENTS.md` solo cite rutas y ADR que existen, y las versiones vigentes del kernel, el grafo y el modelo de carga.
- Que el validador detecte cada tipo de error (sus propias pruebas).
- Que los archivos generados del modelo de carga estén al día con sus parámetros y con el grafo.
- Que ningún nodo de infraestructura llegue a ρ ≥ 0,70 en ningún escenario, incluido el requisito de 10.000 sesiones simultáneas, y que las conexiones a la base quepan.
- Que la vista interactiva del grafo esté al día y que su disposición cubra todos los nodos y la ruta del pedido.
- Que el núcleo siga siendo un hexágono puro: cada paquete importa solo en la dirección permitida y nada lee el reloj, el azar ni el entorno (`verify:hexagon`).
- Que los contratos compilen con Ajv estricto, que sus ejemplos validen y que ningún esquema cambie sin una versión nueva (`verify:contracts`).
- Que ningún activo 3D pase los presupuestos del kernel (`verify:3d-budgets`).
- Que el núcleo compile con `tsc` y pasen las pruebas del dominio, del simulador de pagos y del flujo integral (`test:integral`).

Para correrlas en local, una vez:

```bash
npm ci
```

Y luego:

```bash
npm run verificar
```

```bash
npm run probar
```

O las nueve verificaciones de la integración continua juntas:

```bash
npm run verificar:todo
```

Después de cambiar un parámetro del modelo o una capacidad del grafo, se regeneran los archivos y se confirman junto con el cambio:

```bash
node tools/modelo-de-carga/calcular.mjs
```

Después de cambiar el grafo o el modelo de carga, se regenera también la vista del grafo, que lee los resultados del modelo:

```bash
node tools/vista-del-grafo/generar.mjs
```
