# Validador de la arquitectura

Verifica que el kernel, el grafo operacional y el modelo de carga sean válidos y coherentes entre sí. Resuelve PEN-07 y hace cumplir la regla de bloqueo del grafo: ninguna decisión entra a `main` si rompe la estructura.

## Uso

Requiere Node.js 24 o posterior y las dependencias del lockfile:

```bash
npm ci
```

```bash
npm run validar
```

Termina con error y lista cada problema con su código. Para correr también la verificación de capacidad del modelo de carga:

```bash
npm run verificar
```

Las pruebas del validador introducen un error a la vez en una copia temporal del repositorio y exigen que se detecte. También prueban la compuerta de capacidad: en la copia regeneran el modelo de carga y exigen que `calcular.mjs --estricto` falle con un nodo de infraestructura entre ρ 0,7 y 0,9 y con conexiones por encima de los 200 clientes del pooler. Nunca modifican los archivos del repositorio:

```bash
npm run probar
```

La integración continua corre las tres cosas en cada pull request y en cada cambio de `main`. Las cinco verificaciones de la integración continua juntas, que son la Definición de terminado de la fase documental (`AGENTS.md` §5):

```bash
npm run verificar:todo
```

## Qué verifica

**Esquemas** (JSON Schema 2020-12, validados con Ajv 8 en modo estricto, en `arquitectura/schemas/`):

| Código | Regla |
|---|---|
| `E-JSON` | Cada archivo es JSON válido |
| `E-ESQUEMA` | Cada archivo cumple su esquema y declara su `$schema`: tipos, identificadores con patrón, valores permitidos, capacidad en una de sus tres formas y ningún campo sin declarar |

**Reglas que un esquema no puede expresar**:

| Código | Regla |
|---|---|
| `G1` | Identificadores únicos de nodos, aristas, restricciones, métricas y pendientes del kernel |
| `G2` | Todo nodo llega al núcleo N0 por su cadena de gobierno, sin ciclos, y N0 es la única raíz |
| `G3` | Toda arista une nodos que existen |
| `G4` | Entre marcas o sedes solo hay aristas con alcance `misma_marca` (R02), y ese alcance solo se usa entre ellas |
| `G5` | Cada nodo con capacidad por réplica apunta a un servicio declarado, y cada servicio tiene nodos |
| `G6` | La telemetría solo nombra nodos o aristas que existen |
| `M1` | Cada parámetro del modelo de carga tiene un valor por escenario, solo para escenarios declarados |
| `M2` | El mapa de capacidad usa nodos del grafo con capacidad y con tipo coherente (humano: marca; externo: externo; infraestructura: servicio o datos) |
| `M3` | El mapa de aristas usa aristas del grafo, sin repetir |
| `M4` | Cada servicio de despliegue tiene su presupuesto de conexiones (`conexiones_<servicio>_por_replica`), y solo esos servicios (PEN-14) |
| `V1` | El grafo y el modelo citan las versiones vigentes del kernel y del grafo, y el kernel cita las del grafo y el modelo |
| `V2` | La versión vigente de cada archivo tiene su changelog |
| `V3` | `AGENTS.md` cita las versiones vigentes del kernel, del grafo y del modelo de carga |
| `F1` | Toda ruta de archivo citada (`docs/`, `arquitectura/`, `tools/`) existe |
| `F2` | `AGENTS.md` existe en la raíz y solo cita rutas (`docs/`, `arquitectura/`, `tools/`, `.claude/`) y ADR que existen |
| `F3` | Las huellas SHA-256 de los textos originales de las fuentes (`docs/fuentes/*/*-texto-original.md`) coinciden con el texto guardado, también la del original con finales de línea CRLF cuando se declara |
| `A1` | El estado de cada ADR coincide en el kernel, en el índice de ADRs y en el propio ADR |
| `PL1` | El ejemplo de `docs/agentes/plantillas/doble-salida.md` cumple `telemetria-entrega.schema.json` (Ajv 8, modo estricto) |

## Cómo se extiende

- Un campo nuevo en un archivo de arquitectura se declara primero en su esquema; si no, `E-ESQUEMA` lo rechaza.
- Una regla nueva se agrega a `validar.mjs` con su código, a la tabla de arriba y a `pruebas.mjs` con un caso que la rompa.
