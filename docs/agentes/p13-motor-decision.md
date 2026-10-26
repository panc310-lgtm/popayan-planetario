# `P13` — Motor de decisión

> Se carga cuando la tarea toca el servicio `worker`, los vectores Π, la carga por marca o `rule_02`. Fuente de verdad: kernel `L0_mathematical_and_graph_core.calculation_engines_selected.decision_vectors_p13`, aprobado por el usuario el 2026-10-26.

## 1. Ficha

| Campo | Valor |
| :--- | :--- |
| Nodo | `P13`, servicio `worker`, gobernado por `G4` |
| Motor | `real_time_production` del kernel: *fold* incremental por evento confirmado. **Cero llamadas a modelos de IA** |
| Entradas | Eventos confirmados del bus (`P5` → `P13`, `E67`); índice publicado por `P9` y contadores de `P10` en tablas públicas de `D1` (`E69`) |
| Salidas | Vectores Π en `D4` (`E68`) |
| Consumidores | `P3` lee Π en `D4` (`E65`); el agente del usuario los recibe ya ordenados por su herramienta de búsqueda (`E31`) |
| Capacidad | 100 eventos/s por réplica, 200 con las 2 réplicas del `worker` (valor de diseño; se mide con prueba de carga) |
| Telemetría | `T24` lectura de Π < 10 ms · `T25` frescura de Π · `T26` concentración por nicho |

## 2. Qué publica

Un vector por `(galaxia_id, nicho_id, franja_horaria)`. Forma orientativa:

```json
{
  "pi_version": 1,
  "posicion_registro": 0,
  "calculado_hasta": "2026-10-26T18:00:00Z",
  "marcas": [
    {
      "marca_id": "m_…",
      "posicion_indice": 1,
      "calificacion_agregada": 4.6,
      "lider_del_nicho": true,
      "mejor_evaluado": false,
      "carga_L": 0.41,
      "theta_s": 1.0,
      "mu_tg_por_min": 0.31,
      "alterna_para_desvio": true
    }
  ]
}
```

- **Solo agregados públicos por marca** (`R04`): posición en el índice, calificación agregada, insignias, carga y velocidad de atención. Nunca datos de compradores, pedidos individuales ni evaluaciones sueltas.
- `posicion_registro` es la posición del registro de eventos hasta la que llega el vector; `T25` compara contra el último evento confirmado.
- `calculado_hasta` es la marca de tiempo del último evento procesado, no el reloj del proceso.

## 3. `rule_02`: amortiguación y desvío

- `L_m(t) = pedidos pendientes / 15` (capacidad por defecto, `T10`).
- `Theta_s(L) = min(1, max(0, (1 − L) / 0,10))`: vale 1 hasta `L = 0,90` y baja linealmente a 0 en `L = 1`. Con más de 15 pendientes rige la pausa automática (`R06`).
- Cuando `Theta_s < 1`, P13 marca como `alterna_para_desvio` a las marcas del **mismo nicho y galaxia** con calificación agregada de al menos 4,0 y `L < 0,90`. P3 las sube en el orden; el agente del usuario explica por qué.
- **En el MVP no hay alternas**: hay una marca por nicho. El desvío entra en juego con la cartera del lanzamiento oficial.
- Esta válvula atiende la saturación. **No** resuelve el arranque de las marcas nuevas (PEN-08, ADR-0004 en propuesta).

## 4. Reglas

1. **Determinismo:** las mismas entradas producen el mismo vector. Nada de reloj ni aleatoriedad sin inyectar.
2. **Reconstruible:** Π se puede regenerar desde cero reproduciendo `D3` y leyendo las tablas públicas de `D1`. Si no se puede, es un error de P13.
3. **No escribe en `D3`:** sus salidas son derivadas, no hechos de negocio.
4. **Escritor único:** ningún otro proceso escribe las claves de Π ni la carga por marca en `D4`.
5. **Cero IA:** el código de P13 no importa `@anthropic-ai/sdk`. Un cálculo que "necesite" un modelo es otro proceso.
6. **Capacidad:** P13 está en el mapa de capacidad del modelo de carga con la carga de eventos de negocio; `calcular.mjs --estricto` exige ρ < 0,70.
7. **Costo en Redis:** el modelo supone 2 comandos en `D4` por evento (carga de la marca y vector de su galaxia y nicho; `comandos_redis_por_evento_p13`, supuesto S8 de AGENTS.md). Si se recalcula por lotes, el supuesto baja.

## 5. Pruebas mínimas esperadas

- Reproducir dos veces el mismo flujo de eventos da vectores idénticos.
- Un *replay* completo de un `D3` de prueba reconstruye los mismos vectores que el cálculo incremental.
- Cuando `L_m` cruza 0,90, `theta_s` baja y aparecen alternas del mismo nicho y galaxia; con una sola marca en el nicho no aparece ninguna.
- Ningún campo del vector proviene de tablas de pedidos o compradores (prueba de columnas permitidas, como en `R04`).
- Lectura de Π en `D4` bajo la carga de diseño: p95 < 10 ms (`T24`).
