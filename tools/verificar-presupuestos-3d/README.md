# Presupuestos 3D

`npm run verify:3d-budgets` revisa los `.glb` del repositorio contra los presupuestos del kernel (`spatial_and_visual_budgets.3d_budgets` y `dominio.escala_de_diseno`), que lee del propio kernel. Ignora `node_modules` y las carpetas ocultas.

| Código | Qué detecta |
|---|---|
| `P0` | El kernel cambió la forma en que expresa los presupuestos: hay que actualizar la verificación junto con él |
| `P1` | Un planeta de más de 1 MB o con 20.000 triángulos o más; el mapa (`mapa-popayan*.glb`) de más de 3 MB o con más de 20.000 |
| `P2` | Un `.glb` que no es GLB 2.0, o que cita una imagen externa que no existe |
| `P3` | Un puntero de Git LFS sin contenido. El peso se compara con el que declara el puntero, pero los triángulos no se pueden contar |

Supuestos de S21, por ratificar en PEN-19: el mapa se reconoce por su nombre y todo otro GLB es un planeta; las imágenes externas, como los KTX2, cuentan en el tamaño del GLB que las cita; 1 MB son 1.000.000 bytes. Los triángulos se cuentan por primitiva de cada malla con el `count` de sus accessors, que el GLB declara también cuando usa Draco o Meshopt.

Hoy el repositorio no tiene GLB. `pruebas.mjs` arma GLB sintéticos que exceden cada límite y exige que se detecten.

La integración continua descarga el repositorio sin Git LFS (`lfs: false`). Cuando entre el primer GLB, `P3` lo hará fallar hasta que el paso descargue los archivos LFS.

## Uso

```bash
node tools/verificar-presupuestos-3d/verificar.mjs
node tools/verificar-presupuestos-3d/pruebas.mjs
```
