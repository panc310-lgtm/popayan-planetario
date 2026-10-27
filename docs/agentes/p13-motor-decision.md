# `P13` — Motor de decisión

> Se carga cuando la tarea toca el servicio `worker`, los vectores Π, la carga por marca, `rule_02` o el cupo de exploración. Fuente de verdad: kernel `L0_mathematical_and_graph_core.calculation_engines_selected.decision_vectors_p13` y `L1_new_brand_incentive`.
>
> En este documento, **(decidido)** marca lo que el usuario decidió o aprobó (2026-10-26, FG-06 D1 y ADR-0004), y **(Sn, ratificado)** lo que Claude propuso y el usuario ratificó el 2026-10-27 (PEN-16, FG-08). Lo que no lleva marca es diseño de esta versión, propuesto. El contrato de Π está en `packages/contracts/schemas/decision-vector-pi.schema.json`.

## 1. Ficha

| Campo | Valor |
| :--- | :--- |
| Nodo | `P13`, servicio `worker` **(decidido)**; lo gobierna `G4`, como a todo servicio del grafo |
| Motor | `real_time_production` del kernel: *fold* incremental por evento confirmado. **Cero llamadas a modelos de IA** **(decidido)** |
| Entradas | Eventos confirmados del bus (`E67` por marca, `E74` por nicho). El índice que publica `P9` y el agregado de recompra que `P10` mantiene por marca, leídos de `D1` por `SlaveReadDatabasePort` (`E69`); la fuente del agregado está **(decidida)**. Los parámetros que publica `G1` (`E76`) **(decidido)** |
| Salidas | Carga por marca (`E75`) y vectores Π (`E68`), **solo en `D4`** **(decidido)** |
| Consumidores | `P3` lee Π en `D4` (`E65`) y ordena con él; el agente del usuario recibe los resultados ya ordenados por su herramienta de búsqueda (`E31`) **(decidido)** |
| Capacidad | 100 eventos/s por réplica, contando los dos consumidores; 200 con las 2 réplicas del `worker` (valor de diseño; se mide con prueba de carga) |
| Telemetría | `T24` lectura de Π < 10 ms **(decidido)** · `T25` frescura de Π y de la carga leída · `T26` concentración de pedidos por nicho |

**Π solo en `D4` (decidido).** El usuario lo decidió el 2026-10-26 para conservar el margen de `D1`, el nodo más cargado (ρ = 0,672 en el pico de 10.000 sesiones). Escribir Π también en `D1` lo habría llevado a unos 0,697. Π es un derivado que se reconstruye desde `D3`; las series agregadas que viven en `D1` siguen a cargo de `P9`, `P10` y `P12` (`E51`, `E52`, `E53`).

## 2. Qué publica

Dos tipos de clave, cada una con un solo escritor (§5, regla 4). Los nombres de las claves son propuestos; la forma de Π la fija su contrato.

**Carga por marca**, en `carga:marca:{marca_id}` (`E75`): `L_m(t)`, `Theta_s` y `mu_m^Tg`, con la marca de tiempo y la posición del registro de eventos que reflejan.

**Vector Π**, en `pi:{galaxia_id}:{nicho_id}:{franja}` (`E68`). Forma orientativa:

```json
{
  "pi_version": 1,
  "posicion_registro": 0,
  "calculado_hasta": "2026-10-26T18:00:00Z",
  "parametros_version": "g1-2026-10-26",
  "marcas": [
    {
      "marca_id": "m_…",
      "publico": { "posicion_indice": 1, "calificacion_agregada": 4.6, "lider_del_nicho": true, "mejor_evaluado": false, "nueva_en_el_nicho": false },
      "interno": {
        "pedidos_recompra_90d": 37,
        "compradores_unicos_90d": 120,
        "recompra_hasta_posicion": 0,
        "theta_s": 1.0,
        "alterna_para_desvio": false,
        "carga_leida": { "L_m": 0.41, "marca_de_tiempo": "2026-10-26T17:59:58Z", "posicion_registro": 0 },
        "cupo_exploracion": { "elegible": false, "orden_rotacion": null }
      }
    }
  ]
}
```

- **`publico`** son los datos que `R04` declara públicos: posición en el índice y calificación agregada, con las insignias que salen de ellas. `nueva_en_el_nicho` es la etiqueta visible del cupo de exploración (ADR-0004, **decidido**). Se pueden mostrar a cualquiera.
- **`interno`**, junto con la carga por marca, son derivados que sirven para **ordenar**. (S12, ratificado) No se muestran al comprador mientras no se amplíe `R04`, porque cualquier marca puede entrar como comprador y vería así datos de operación de sus competidoras.
- **Recompra.** `P10` mantiene en `D1`, por `marca_id`, `pedidos_recompra_90d` y `compradores_unicos_90d`, sin identificadores de compradores, y P13 lo lee de ahí **(decidido)**. (S14, ratificado) El consumidor de vectores lo relee por `E69` una vez por cada pedido completado de esa marca, porque solo entonces cambia. Si `P10` todavía no procesó ese pedido, la lectura llega con un pedido de menos: `recompra_hasta_posicion` dice hasta dónde llega y la siguiente lectura lo corrige.
- Nunca entran datos de compradores, pedidos individuales ni evaluaciones sueltas.
- `posicion_registro` es la última posición del registro de eventos que procesó el consumidor dueño de la clave. `calculado_hasta` es la marca de tiempo del último evento procesado, no el reloj del proceso.

## 3. `rule_02`: amortiguación y desvío

- `L_m(t) = pedidos pendientes / 15` (capacidad por defecto, `T10`).
- `Theta_s(L) = min(1, max(0, (1 − L) / 0,10))`: vale 1 hasta `L = 0,90` y baja linealmente a 0 en `L = 1`. Con más de 15 pendientes rige la pausa automática (`R06`).
- **Desvío (decidido):** con una marca amortiguada (`Theta_s < 1`), el pedido se desvía hacia alternas de la misma galaxia con calificación ajustada de al menos 4,0 (la calificación bayesiana de ADR-0004).
- **Carga viva al emitir Π (decidido):** el consumidor de vectores lee en ese instante la carga de las marcas candidatas en `D4`, guarda en Π la marca de tiempo de cada carga leída y **nunca** marca como alterna una marca con `L_m ≥ 0,70`. (S8, ratificado) La lectura es un solo `MGET` por recálculo.
- (S15, ratificado) Para que ese "nunca" no dependa de una carga vieja, una marca tampoco sale como alterna si su carga leída no refleja el último evento de esa marca que el consumidor de vectores ya procesó, o si tiene más de 5 segundos (umbral (b) de `T25`).
- (S11, ratificado) Las alternas son además del **mismo nicho**. Con esa precisión, en el MVP (una marca por nicho) no hay alternas y el desvío empieza con la cartera del lanzamiento oficial.
- Las condiciones del desvío (4,0 y 0,70) las publica `G1` por `E76` **(decidido)**. P13 las aplica y registra su versión en `parametros_version`.

## 4. Cupo de exploración (ADR-0004, decidido)

- P13 calcula en cada recálculo qué marcas del nicho son elegibles: menos de 10 pedidos confirmados en 90 días, menos de 180 días desde su habilitación y calificación ajustada de al menos 3,0. Son los valores iniciales del ADR aprobado; `G1` los versiona.
- Publica la bandera `elegible` y el orden de rotación de la quincena, determinista: hash de `marca_id` y número de quincena.
- `P3` aplica el cupo al ordenar: 1 de cada 5 posiciones visibles del nicho y una órbita del sistema 3D.
- N, los umbrales y la rotación llegan de `G1` por `E76`. La constante C de la calificación bayesiana la aplica `P9` (`E06`), no P13.

## 5. Reglas

1. **Determinismo:** las mismas entradas producen la misma salida. Nada de reloj ni aleatoriedad sin inyectar.
2. **Reconstruible:** la carga y Π se pueden regenerar desde cero reproduciendo `D3` y releyendo de `D1` el índice y los agregados de recompra. Al arrancar, cada consumidor retoma desde la última posición que guardó en `D4`.
3. **No escribe en `D3` ni en `D1` (decidido):** sus salidas son derivadas y van solo a `D4`.
4. **Un escritor por clave.** El `worker` corre dos consumidores del bus:
   - el de carga recibe `E67`, particionado por `marca_id`, y es el único que escribe `carga:marca:{marca_id}` (`E75`);
   - el de vectores recibe `E74`, particionado por `nicho_id`, es el único que escribe las claves `pi:*:{nicho_id}:*` (`E68`) y solo lee las claves de carga.
   Cada escritura reemplaza la clave completa; con dos réplicas, una partición nunca tiene dos dueños.
5. **Cero IA (decidido):** el código de P13 no importa `@anthropic-ai/sdk`.
6. **Capacidad:** P13 está en el mapa de capacidad del modelo de carga con la carga de eventos de negocio; hoy queda en ρ = 0,24 en el pico. `calcular.mjs --estricto` falla si cualquier nodo de infraestructura llega a ρ ≥ 0,70 **(decidido)** (AGENTS.md §5).
7. **Costo en Redis y en la base:** las lecturas de la carga viva cuentan en `comandos_redis_por_evento_p13` **(decidido)**. (S8, ratificado) El modelo supone 3 comandos en `D4` por evento: la escritura de la carga de la marca, el `MGET` de la carga viva y la escritura de Π. (S14, ratificado) Supone además 1 consulta a `D1` por pedido completado (`lecturas_base_por_pedido_p13`), unas 1,4 por segundo en el pico. Upstash factura por comando; el modelo supone que un `MGET` es una sola solicitud.

## 6. Pruebas mínimas esperadas

- Reproducir dos veces el mismo flujo de eventos da salidas idénticas.
- Un *replay* completo de un `D3` de prueba reconstruye las mismas claves que el cálculo incremental.
- Con dos réplicas, ninguna clave recibe escrituras de dos consumidores.
- Cuando `L_m` de una marca cruza 0,90, `theta_s` baja y aparecen alternas que cumplen las condiciones. Una marca con `L_m ≥ 0,70` nunca sale como alterna, y con S15 tampoco una con la carga leída vieja. Con una sola marca en el nicho no aparece ninguna.
- El cupo marca como elegibles solo a las marcas que cumplen las tres condiciones, y el orden de rotación es el mismo en cada réplica.
- Ningún campo de `publico` sale de una columna que `R04` no declare pública, y ningún campo de `interno` llega a la respuesta que ve el comprador.
- Una consulta a `D1` por pedido completado y ninguna por los demás eventos.
- Lectura de Π en `D4` bajo la carga de diseño: p95 < 10 ms (`T24`).
