# FG-06 — Texto original del mensaje de decisiones

Texto literal del mensaje con el que el usuario tomó las decisiones que resume [FG-06](FG-06-atractor-extrano-soc.md). Lo envió como archivo adjunto el 2026-10-26 a las 23:49 y lo reenvió el 2026-10-27 a las 10:22, junto con los PDF de FG-06 y FG-07. No se edita: es la evidencia de la decisión, no una regla.

Cada texto va entre una línea `~~~~markdown` y una línea `~~~~`. La huella se calcula sobre ese texto sin el salto de línea que precede al cierre, con finales de línea LF (`.gitattributes`). `tools/validar-arquitectura/validar.mjs` (regla F3) la comprueba en cada pull request.

| Bloque | Contenido | SHA-256 del texto guardado aquí | SHA-256 del original recibido |
|---|---|---|---|
| D1 | Decisiones del propietario sobre la rama `arquitectura/agents-md-p13-grafo-0-9` | `188007125b3d722705123ee4d6fd44f8dbc12f1371c0a3f35ad5d7652babacc6` | `23fce45e66e62b68e58d9885ca258bb79a7f8d163ceb0b3edc7a84afe4c45742` (con finales de línea CRLF) |

## D1

~~~~markdown
Continuamos sobre la rama `arquitectura/agents-md-p13-grafo-0-9` a partir del estado reportado en tu telemetría JSON (`ESCALADO` tras el Ciclo 3 del crítico adversario).

Como propietario del proyecto ratifico los 4 parámetros de la arquitectura SoC v0.9 y tomo las decisiones expresas que solicitó tu `siguiente_paso` para cerrar el hallazgo `ALTA` y los 10 `riesgos_abiertos`:

### A. Decisiones Expresas del Propietario (Cierre de `rule_02`, `R04`, `S13` y `PEN-08`)

1. **Decisión (1) — Origen de la Recompra (`P10 -> P13` por `E74`, cumpliendo `R04` sin estado por comprador en `P13`):**
   - Apruebo la Opción 1 de tu reporte: **`P13` lee los contadores agregados de recompra por marca desde `P10` (Fidelidad) en `D1`**.
   - `P10` ya gestiona por regla de dominio la relación comprador-marca en `D1` (primera compra crea la relación; recompras acercan al beneficio). `P10` mantiene el agregado por `marca_id` (`pedidos_recompra_90d` y `compradores_unicos_90d`) y se lo entrega a `P13` por `E74` sin identificadores de compradores (`R04` = `CUMPLE`).
   - Modela en `arquitectura/modelo-de-carga.json` las lecturas correspondientes en `D1`, verificando que `D1` se mantenga en `ρ < 0,70`.

2. **Decisión (2) — Destino del Vector `Π` (`S13` aprobado como regla definitiva):**
   - Apruebo oficialmente que **`P13` publica el vector de decisión `Π` únicamente en `D4` (Upstash Redis)** (por la arista `E75`) y **no escribe `Π` en `D1`**, preservando el margen de capacidad de `D1` en `ρ ≈ 0,672` (evitando subirlo a `0,697`). Las métricas agregadas e históricas en `D1` siguen a cargo de `P9`, `P10` y `P12` (`E51`, `E52`, `E53`).
   - Retira la etiqueta de supuesto `S13` y unifica esta redacción tanto en `decision_vectors_p13` como en `changelog_1_7_0` dentro de `arquitectura/kernel-durable.json` y en `docs/agentes/p13-motor-decision.md`.

3. **Decisión (3) — Aprobación de `ADR-0004` y Cierre de `PEN-08`:**
   - Apruebo `docs/adr/ADR-0004-incentivo-marcas-nuevas.md` (promedio bayesiano + cupo de exploración + desvío por saturación `Θ_s(L_m)` gobernado por `G1 -> P13`). Pasa `ADR-0004` a estado **Aprobado** y actualiza `PEN-08` como **resuelto por `ADR-0004`** en `arquitectura/kernel-durable.json`.

4. **Decisión (4) — Compuerta automática `--estricto` en `ρ < 0,70` y Presupuesto de Conexiones `PEN-14 (4)`:**
   - Endurece `tools/modelo-de-carga/calcular.mjs` para que `--estricto` falle automáticamente si cualquier nodo de infraestructura supera `ρ >= 0,70` (alineando el código con `AGENTS.md §5` y `PEN-14`).
   - En `PEN-14` (`kernel-durable.json` y `modelo-de-carga.json`), deja declarado el presupuesto máximo de conexiones por réplica para los pools (`MasterWriteDatabasePort`, `SlaveReadDatabasePort` y `PostgresSaver` en `INV_07`) a través de las 11 réplicas del escenario de capacidad (`api: 4`, `worker: 2`, `agentes: 5`), asegurando que el total sea `<= 200` clientes del pooler de Supabase en modo sesión.

### B. Corrección de los Hallazgos `MEDIA` y `BAJA` Restantes del Ciclo 3

1. **Lecturas de carga en `D4` por `P13`:** añade en `comandos_redis_por_evento_p13` (`arquitectura/modelo-de-carga.json`) los comandos Redis que ejecuta el consumidor de vectores en `P13` para leer las claves de carga viva `L_m(t)` en `D4` al construir `Π` y seleccionar marcas alternas, y regenera `arquitectura/modelo-de-carga.resultados.json` y `docs/modelo-de-carga.md`.
2. **Sincronía en `T25`:** especifica en `T25` (`arquitectura/grafo-operacional.json`) y en `docs/agentes/p13-motor-decision.md` que `P13` lee la carga viva `L_m(t)` en `D4` en el instante de emitir `Π` (incluyendo la marca de tiempo de la carga leída) para que nunca se sugiera como alterna de descongestión una marca con `L_m >= 0,70`.
3. **Consistencia entre `p7-agente-usuario.md §4` y `p13-motor-decision.md`:** unifica en `docs/agentes/p7-agente-usuario.md §4` que `P3` y `P7` ordenan leyendo `Π` desde `D4` (el cual ya integra `Θ_s(L_m)` y las alternas con baja carga calculadas por `P13`).
4. **Trazabilidad documental (`FG-05` y prueba `T2`):** completa la fila de `S11` en `docs/fuentes/gemini/FG-05-constitucion-agents-md.md` con las dos precisiones (`L < 0,90` y elección por `P13`), verifica las huellas SHA-256 y ajusta la referencia `(S8)` en el caso `T2` de `tools/validar-arquitectura/pruebas.mjs`.

### C. Verificación Final, Ciclo 4 del Crítico Adversario y Pull Request a `main`

1. Ejecuta las 5 verificaciones en verde (`validar.mjs`, `pruebas.mjs`, `calcular.mjs --check`, `calcular.mjs --estricto` ya con corte en `0,70`, y `generar.mjs --check`).
2. Corre el subagente `critico-adversario` en solo lectura verificando que todas las invariantes (`INV_01`, `INV_05`, `INV_07`, `rule_02`, `R04`) queden en `CUMPLE` y que el veredicto sea `APROBADO` con `hallazgos_abiertos: 0`.
3. Haz commit y push a `arquitectura/agents-md-p13-grafo-0-9` y abre el Pull Request hacia `main` (y fusiónalo si tienes permisos en el entorno, o entrégame el enlace del PR listo para fusionar).
4. Respóndeme estrictamente bajo el **Protocolo de Doble Salida (`AGENTS.md §6`)**:
   - Bloque 1: Telemetría JSON de nivel principal validada contra `docs/agentes/plantillas/telemetria-entrega.schema.json` con `"estado": "COMPLETADO"`.
   - Bloque 2: Cápsula didáctica de ingeniería.
~~~~
