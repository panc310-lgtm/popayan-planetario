# Popayán Planetario

Directorio comercial de Popayán presentado como un sistema planetario en 3D: cada comuna urbana es una galaxia, cada nicho es un sistema y cada marca es un planeta que orbita al líder de su nicho. Los compradores exploran, guardan favoritos en Mi universo, compran dentro de la plataforma y conversan con un agente de IA. Las marcas operan sus pedidos por Telegram.

Este repositorio es la base de ingeniería del proyecto: las decisiones aprobadas, la arquitectura, los modelos de cálculo y, más adelante, el código.

## Estado

Diseño de arquitectura; la implementación no ha empezado.

| Fase | Fecha | Qué es |
|---|---|---|
| Maqueta | Antes del MVP | Web navegable con marcas ficticias para la administración municipal |
| MVP | 10-dic-2026 | Una marca por nicho, pagos reales y objetivo de 1.000 usuarios el día de lanzamiento |
| Lanzamiento oficial | Semana Santa 2027 | 100 marcas, app móvil y requisito de 10.000 sesiones simultáneas |

## Organización

| Ruta | Contenido |
|---|---|
| [`arquitectura/kernel-durable.json`](arquitectura/kernel-durable.json) | Fuente de verdad: decisiones aprobadas, invariantes de ingeniería, despliegue, arquitectura de agentes y pendientes (PEN-xx) |
| [`arquitectura/grafo-operacional.json`](arquitectura/grafo-operacional.json) | Nodos, aristas, servicios de despliegue, restricciones de aislamiento (R01–R10) y telemetría (T01–T23) |
| [`arquitectura/modelo-de-carga.json`](arquitectura/modelo-de-carga.json) | Parámetros del modelo de carga; sus resultados se generan |
| [`docs/adr/`](docs/adr/README.md) | Decisiones de arquitectura (ADR) |
| [`docs/modelo-de-carga.md`](docs/modelo-de-carga.md) | Reporte del modelo de carga: tasas, capacidad, réplicas y costo de la IA (generado) |
| [`docs/auditorias/`](docs/auditorias/AUD-2026-10-20-insumos-gemini.md) | Auditorías y su seguimiento |
| [`docs/fuentes/`](docs/fuentes/README.md) | Registro de insumos: conversaciones con IA, documentos y su estado |
| [`tools/modelo-de-carga/`](tools/modelo-de-carga/README.md) | Calculadora del modelo de carga |
| `blender/`, `scene_popayan.py` | Prototipo visual en Blender; desactualizado frente a las 9 galaxias (AUD-09) |
| `.github/workflows/` | Integración continua |

## Cómo se decide

- Solo el usuario aprueba decisiones. Cada decisión de arquitectura que cuesta revertir es un ADR; al aprobarse, se refleja en el kernel y en el grafo.
- Las conversaciones con IA (Gemini, ChatGPT, Claude) son insumos, no fuente de verdad. Se registran en `docs/fuentes/` con el estado de cada afirmación.
- Los cambios entran a `main` por pull request, con la integración continua en verde.

## Requisitos

- Node.js 24 o posterior.
- [Git LFS](https://git-lfs.com) para los archivos 3D (`.blend`, `.glb`, `.ktx2`). Una vez por equipo, antes de clonar:

```bash
git lfs install
```

## Verificaciones

La integración continua corre en cada pull request y en cada cambio de `main`:

- Que todos los JSON de `arquitectura/` sean válidos.
- Que los archivos generados del modelo de carga estén al día con sus parámetros y con el grafo.
- Que ningún nodo de infraestructura quede en zona crítica en ningún escenario, incluido el requisito de 10.000 sesiones simultáneas.

Para correrlas en local:

```bash
node tools/modelo-de-carga/calcular.mjs --estricto
```

Después de cambiar un parámetro del modelo o una capacidad del grafo, se regeneran los archivos y se confirman junto con el cambio:

```bash
node tools/modelo-de-carga/calcular.mjs
```
