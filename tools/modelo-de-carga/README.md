# Modelo de carga

Calcula las tasas, volúmenes, utilizaciones y el plan de capacidad de los tres escenarios (MVP, capacidad objetivo de 10.000 sesiones simultáneas y diseño) a partir de unas pocas definiciones. Resuelve AUD-11.

| Archivo | Rol | ¿Se edita a mano? |
|---|---|---|
| `arquitectura/modelo-de-carga.json` | Definiciones, parámetros por escenario, límites externos y mapa de nodos | Sí |
| `arquitectura/grafo-operacional.json` | Capacidad μ de cada nodo | Sí |
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

No escribe nada. Termina con error si los archivos generados no coinciden con el cálculo. Avisa, sin fallar, de los nodos de infraestructura en zona crítica. Está pensado para la integración continua.

```bash
node tools/modelo-de-carga/calcular.mjs --estricto
```

Como `--check`, y además falla si algún nodo de infraestructura queda en zona crítica (ρ ≥ 0,9) en algún escenario. Hoy falla a propósito: el grafo v0.3 no tiene capacidad para el requisito de 10.000 sesiones simultáneas. Pasará cuando el plan de capacidad esté aplicado en el grafo (PEN-14).

## Cómo se calcula

- **Sesiones simultáneas** por la ley de Little: llegadas de sesiones por segundo en la hora pico × duración media de la sesión.
- **Pico de evento**: todas las tasas de la hora pico multiplicadas por `factor_pico_evento`.
- **Escenario de capacidad**: las sesiones simultáneas se fijan como requisito y las llegadas se despejan de la ley de Little; los pedidos salen de `pedidos_por_sesion`.
- **Utilización ρ** de cada nodo: carga / μ del grafo, con los umbrales de T01 (alerta 0,7; crítico 0,9).
- **Plan de capacidad**: μ requerida = carga en el peor pico / 0,7, y cuántas veces hay que escalar la μ actual.
- **Pedidos abiertos** por la ley de Little: pedidos por segundo × duración del pedido. Son las conexiones de aviso en vivo al comprador.
- Cada parámetro declara su estado (`decidido`, `heredado`, `supuesto` o `por_confirmar`) y cómo se mide en el MVP para calibrarlo.
