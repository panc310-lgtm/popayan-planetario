# Guardián del hexágono

`npm run verify:hexagon` comprueba `INV_06` y su extensión S1 (AGENTS.md §4.1) sobre el núcleo: `packages/contracts/src`, `packages/ports/src` y `packages/domain/src`. Lee el AST con la API de compilador de TypeScript, así que no lo engañan los comentarios ni las cadenas.

| Código | Qué detecta |
|---|---|
| `H1` | Una importación o reexportación fuera de la dirección permitida: `contracts` no importa nada, `ports` solo `@planetario/contracts` y `domain` solo `@planetario/ports` y `@planetario/contracts`. Cuenta `node:*`, Fastify, `pg`, grammY, `ioredis`, `three`, el SDK de IA, los adaptadores, las importaciones de tipos (`import type`, `import("x").T`) y las rutas relativas que salen del paquete |
| `H2` | Una fuente de no determinismo que debía llegar por puerto (S1): `Date.now`, `Date()`, `new Date()` sin argumentos, `Math.random`, `crypto`, `performance`, `process` y esos mismos globales leídos por `globalThis` |
| `H3` | Carga dinámica de módulos (`import()`, `require`, `import x = require`), que esquivaría la revisión |

`new Date(ms)` sí está permitido: formatear un instante recibido es determinista.

Una segunda capa la da `tsc` en `npm run test:integral`: el `tsconfig.json` compila el núcleo con `lib: ["es2024"]` y `types: []`, sin tipos de Node ni del navegador.

## Uso

```bash
node tools/verificar-hexagono/verificar.mjs     # revisa el repositorio
node tools/verificar-hexagono/pruebas.mjs       # siembra cada violación en una copia temporal y exige que se detecte
```

`npm run verify:hexagon` corre las dos. Con `--raiz CARPETA`, `verificar.mjs` revisa una copia; lo usan las pruebas.
