# `P13` — Motor de decisión

> Se carga cuando la tarea toca el servicio `worker`, los vectores Π, la carga por marca o `rule_02`. Fuente de verdad: kernel `L0_mathematical_and_graph_core.calculation_engines_selected.decision_vectors_p13`. El usuario aprobó el 2026-10-26 el nodo, su motor sin modelos, la publicación de Π en `D4` y la aplicación de `rule_02`. Lo marcado `⟨propuesto⟩` en este documento es diseño de esta versión, pendiente en PEN-16.

## 1. Ficha

| Campo | Valor |
| :--- | :--- |
| Nodo | `P13`, servicio `worker`, gobernado por `G4` |
| Motor | `real_time_production` del kernel: *fold* incremental por evento confirmado. **Cero llamadas a modelos de IA** |
| Entradas | Eventos confirmados del bus (`P5` → `P13`, `E67`); índice publicado por `P9` y contadores agregados por marca de `P10` en `D1` (`E69`) |
| Salidas | Vectores Π y carga por marca en `D4` (`E68`) |
| Consumidores | `P3` lee Π y la carga en `D4` (`E65`) y ordena; el agente del usuario recibe los resultados ya ordenados por su herramienta de búsqueda (`E31`) |
| Capacidad | 100 eventos/s por réplica, 200 con las 2 réplicas del `worker` (valor de diseño; se mide con prueba de carga) |
| Telemetría | `T24` lectura de Π < 10 ms · `T25` frescura de Π · `T26` concentración de pedidos por nicho |

## 2. Qué publica ⟨propuesto⟩

Dos tipos de clave, cada una con un solo escritor (§4, regla 4):

**Carga por marca**, en `carga:marca:{marca_id}`: `L_m(t)`, `Theta_s` y `mu_m^Tg`, más la posición del registro de eventos que reflejan.

**Vector Π**, en `pi:{galaxia_id}:{nicho_id}:{franja}`. Forma orientativa:

```json
{
  "pi_version": 1,
  "posicion_registro": 0,
  "calculado_hasta": "2026-10-26T18:00:00Z",
  "marcas": [
    {
      "marca_id": "m_…",
      "publico": { "posicion_indice": 1, "calificacion_agregada": 4.6, "lider_del_nicho": true, "mejor_evaluado": false },
      "interno": { "recompra_agregada": 37 }
    }
  ]
}
```

- **`publico`** son los datos que `R04` declara públicos: posición en el índice y calificación agregada, con las insignias que salen de ellas. Se pueden mostrar a cualquiera.
- **`interno`**, junto con la carga por marca, son derivados que sirven para **ordenar**. ⟨propuesto S12⟩ No se muestran al comprador mientras no se amplíe `R04`: cualquier marca puede entrar como comprador y vería así datos de operación de sus competidoras.
- Nunca entran al vector datos de compradores, pedidos individuales ni evaluaciones sueltas.
- `posicion_registro` es la última posición del registro de eventos que procesó el consumidor dueño de esa clave. `T25` la compara contra el último evento confirmado.
- `calculado_hasta` es la marca de tiempo del último evento procesado, no el reloj del proceso.

## 3. `rule_02`: amortiguación y desvío

- `L_m(t) = pedidos pendientes / 15` (capacidad por defecto, `T10`).
- `Theta_s(L) = min(1, max(0, (1 − L) / 0,10))`: vale 1 hasta `L = 0,90` y baja linealmente a 0 en `L = 1`. Con más de 15 pendientes rige la pausa automática (`R06`).
- Cuando una marca tiene `Theta_s < 1`, `P3` desvía hacia alternas de la **misma galaxia** con calificación agregada de al menos 4,0 y `L < 0,90`. Las elige al leer, combinando Π con la carga de cada marca, así que ningún escritor necesita las claves de otro.
- ⟨propuesto S11⟩ Las alternas son además del **mismo nicho**. Con esa precisión, en el MVP (una marca por nicho) no hay alternas y el desvío empieza con la cartera del lanzamiento oficial.
- Esta válvula atiende la saturación. **No** resuelve el arranque de las marcas nuevas (PEN-08, ADR-0004 en propuesta).

## 4. Reglas

1. **Determinismo:** las mismas entradas producen la misma salida. Nada de reloj ni aleatoriedad sin inyectar.
2. **Reconstruible:** la carga y Π se pueden regenerar desde cero reproduciendo `D3` y leyendo `D1`. Si no se puede, es un error de P13.
3. **No escribe en `D3`:** sus salidas son derivadas, no hechos de negocio.
4. **Un escritor por clave** ⟨propuesto⟩: el `worker` corre dos consumidores de `E67`. Uno particiona por `marca_id` y es el único que escribe `carga:marca:{marca_id}`. El otro particiona por `nicho_id` y es el único que escribe las claves `pi:*:{nicho_id}:*`. Cada escritura reemplaza la clave completa; con dos réplicas, una partición nunca tiene dos dueños.
5. **Cero IA:** el código de P13 no importa `@anthropic-ai/sdk`. Un cálculo que "necesite" un modelo es otro proceso.
6. **Capacidad:** P13 está en el mapa de capacidad del modelo de carga con la carga de eventos de negocio. `calcular.mjs --estricto` solo falla en zona crítica (ρ ≥ 0,90); el requisito de ρ < 0,70 se revisa en `docs/modelo-de-carga.md` (AGENTS.md §5). Hoy P13 está en 0,24 en el pico de 10.000 sesiones.
7. **Costo en Redis:** el modelo supone 2 comandos en `D4` por evento: la carga de la marca y el vector de su galaxia y nicho (`comandos_redis_por_evento_p13`, S8). Si se recalcula por lotes, el supuesto baja.

## 5. Pruebas mínimas esperadas

- Reproducir dos veces el mismo flujo de eventos da salidas idénticas.
- Un *replay* completo de un `D3` de prueba reconstruye las mismas claves que el cálculo incremental.
- Con dos réplicas, ninguna clave recibe escrituras de dos consumidores.
- Cuando `L_m` cruza 0,90, `theta_s` baja y `P3` encuentra alternas que cumplen las condiciones; con una sola marca en el nicho no aparece ninguna.
- Ningún campo de `publico` sale de una columna que `R04` no declare pública, y ningún campo de `interno` llega a la respuesta que ve el comprador.
- Lectura de Π en `D4` bajo la carga de diseño: p95 < 10 ms (`T24`).
