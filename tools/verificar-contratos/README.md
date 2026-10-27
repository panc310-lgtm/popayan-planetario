# Verificación de los contratos

`npm run verify:contracts` comprueba `packages/contracts` (AGENTS.md §4.5):

| Código | Qué detecta |
|---|---|
| `C1` | Un esquema que no declara JSON Schema 2020-12 o el `$id` `urn:popayan-planetario:contracts:<nombre>`, o que no compila con Ajv 8 en modo estricto, en su raíz o en cualquiera de sus `$defs` |
| `C2` | Un esquema que cambió sin una `version_contrato` nueva en `schemas/versiones.json`, versiones que no suben, huellas repetidas, o historiales sin esquema o esquemas sin historial |

Después corre `node --test packages/contracts/test`. Esas pruebas validan ejemplos válidos e inválidos de cada contrato. Comprueban también que las constantes de `src/` (estados, modalidades, campos que puede ver la marca) coinciden con los esquemas. Los ejemplos de `test/dobles/ejemplos.ts` usan `satisfies` con los tipos TypeScript, y `tsc` los revisa en `npm run test:integral`; así tipos y esquemas no se separan.

## Cambiar un esquema

1. Si el cambio es compatible, editar el esquema y agregar al final de su historial en `schemas/versiones.json` una versión mayor con la huella nueva. Si es incompatible, primero va un ADR (AGENTS.md §4.5).
2. La huella es el SHA-256 del archivo con finales de línea LF; `verificar.mjs` la imprime cuando falta.

## Uso

```bash
node tools/verificar-contratos/verificar.mjs
node tools/verificar-contratos/pruebas.mjs
```
