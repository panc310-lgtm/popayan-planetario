# Modelo de carga

Calcula las tasas, volúmenes, utilizaciones y el plan de capacidad de los tres escenarios (MVP, capacidad objetivo de 10.000 sesiones simultáneas y diseño) a partir de unas pocas definiciones. Resuelve AUD-11.

| Archivo | Rol | ¿Se edita a mano? |
|---|---|---|
| `arquitectura/modelo-de-carga.json` | Definiciones, parámetros por escenario, límites externos, mapa de nodos y mapa de aristas | Sí |
| `arquitectura/grafo-operacional.json` | Capacidad de cada nodo y réplicas de cada servicio (`servicios_de_despliegue`) | Sí |
| `arquitectura/modelo-de-carga.resultados.json` | Resultados numéricos | No: lo genera la herramienta |
| `docs/modelo-de-carga.md` | Reporte legible | No: lo genera la herramienta |

## Uso

Requiere Node.js 24 o posterior; no tiene dependencias.

```bash
node tools/modelo-de-carga/calcular.mjs
```

Escribe los dos archivos generados. Después de cambiar un parámetro o una capacidad del grafo, se ejecuta y se confirman los tres archivos juntos.

```bash
node tools/modelo-de-carga/calcular.mjs --check
```

No escribe nada. Termina con error si los archivos generados no coinciden con el cálculo. Avisa, sin fallar, de los nodos de infraestructura en ρ ≥ 0,7 y de las conexiones a la base que no caben. Está pensado para la integración continua.

```bash
node tools/modelo-de-carga/calcular.mjs --estricto
```

Como `--check`, y además falla en dos casos, en cualquier escenario. Uno: algún nodo de infraestructura llega a ρ ≥ 0,7, la utilización objetivo del requisito de 10.000 sesiones (decisión del usuario del 2026-10-26; hasta entonces cortaba en la zona crítica, ρ ≥ 0,9). Los nodos humanos (la marca) y externos no lo hacen fallar. Dos: las conexiones a la base no caben (PEN-14 (4) y PEN-17, decidido por el usuario el 2026-10-27). Eso pasa si los clientes del pooler de Supabase superan los 200 de Micro, si los clientes en modo sesión superan el pool size de Supavisor (19), o si las conexiones directas, min(sesión, pool size) + min(transacción, pool size) + reservadas, llegan a las del cómputo (60 en Micro, en los tres escenarios). Pasa desde el grafo v0.5, que aplica el plan de capacidad (PEN-14). La integración continua (`.github/workflows/verificaciones.yml`) corre `--check` y `--estricto` en cada pull request y en cada cambio de `main`, así que ningún cambio del grafo o del modelo puede romper el requisito de 10.000 sesiones sin que se note.

## Cómo se calcula

- **Sesiones simultáneas** por la ley de Little: llegadas de sesiones por segundo en la hora pico × duración media de la sesión.
- **Pico de evento**: todas las tasas de la hora pico multiplicadas por `factor_pico_evento`.
- **Escenario de capacidad**: las sesiones simultáneas se fijan como requisito y las llegadas se despejan de la ley de Little; los pedidos salen de `pedidos_por_sesion`.
- **Capacidad μ de un nodo**, según cómo la declara el grafo:
    - `mu_por_s`: valor fijo (por ejemplo, D1 o el límite de Telegram);
    - `mu_por_replica` + `servicio`: capacidad por réplica × réplicas del servicio en `servicios_de_despliegue`;
    - `nivel_anthropic`: el menor de los tres límites del nivel de cuenta (llamadas, tokens de entrada sin caché y tokens de salida por minuto), con los tokens por llamada del modelo.
- **Utilización ρ** de cada nodo: carga / μ, con los umbrales de T01 (alerta 0,7; crítico 0,9).
- **Conexiones a la base** por servicio y por modo del pooler: réplicas por clientes por réplica en modo sesión (escritura y PostgresSaver) y en modo transacción (lectura). Se comparan con los clientes del pooler, con el pool size de Supavisor y con las conexiones directas del cómputo de Supabase.
- **Plan de capacidad**: μ requerida = carga en el peor pico / 0,7, y cuántas veces hay que escalar la μ actual.
- **Réplicas necesarias** de cada servicio por escenario: las de su nodo más exigido con ρ ≤ 0,7.
- **Tasas por arista**: cada arista de `mapa_de_aristas` toma una magnitud de la hora pico por un factor estructural. Las aristas sin mapear se listan en el reporte como "sin tasa modelada".
- **Pedidos abiertos** por la ley de Little: pedidos por segundo × duración del pedido. Son las conexiones de aviso en vivo al comprador.
- Cada parámetro declara su estado (`decidido`, `heredado`, `supuesto` o `por_confirmar`) y cómo se mide en el MVP para calibrarlo.
