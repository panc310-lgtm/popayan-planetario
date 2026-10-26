# ADR-0004 — Incentivo para marcas nuevas en el Índice de Relevancia

| Campo | Valor |
|---|---|
| Estado | Propuesta |
| Fecha | 2026-10-26 |
| Decide | El usuario |
| Resuelve | PEN-08 (bucle de retroalimentación del índice); también el hallazgo de AUD-2026-10-20 sobre la falta de una fórmula antimanipulación del índice |
| Afecta | P9 (motor de reputación), P13 (motor de decisión), P3 (catálogo y búsqueda), G1 (ponderaciones, E06), regla `indice_y_calificacion` del kernel |

## Contexto y problema

El Índice de Relevancia ordena las marcas de cada nicho: **calificación 40 + compras 30 + flujo 20 + sedes 10**, sobre una ventana de 90 días que se recalcula cada 15 (P9). Define el tamaño del planeta, quién ocupa el centro del sistema (Líder del nicho) y el orden de la búsqueda (P3).

La mitad del índice (compras y flujo) sale de los pedidos confirmados, y los pedidos dependen de la visibilidad que da el índice. El bucle es positivo:

```text
visibilidad (centro, tamaño, orden) ──► pedidos ──► compras y flujo ──► índice ──► visibilidad
```

Una marca que entra a un nicho ocupado arranca con compras = flujo = 0 y sin calificaciones. Si cada componente se normaliza dentro del nicho (supuesto: la normalización no está definida), su índice no puede pasar de 50 de 100 aunque reciba solo calificaciones perfectas y tenga el máximo de sedes. Sin un incentivo, el líder se refuerza solo y una marca buena puede no llegar nunca a ser vista.

**Por qué la válvula de saturación no lo resuelve.** `Theta_s` y el desvío de `rule_02` (kernel 1.7.0, P13) solo actúan cuando una marca pasa de 90 % de su capacidad de pedidos pendientes, y el desvío solo elige alternas con calificación de al menos 4,0, que una marca nueva todavía no tiene. Protegen a las marcas saturadas; no abren la puerta a las nuevas.

**Cuándo importa.** En el MVP hay una marca por nicho, así que dentro de un nicho no hay competencia. El problema aparece con la cartera de 100 marcas del lanzamiento oficial (`gate_2_to_final`, Semana Santa 2027). La decisión tiene que estar tomada antes de que un nicho reciba su segunda marca.

**Restricciones del kernel que cualquier opción respeta:**

- La calificación nunca se excluye del índice (`reglas_nucleo.indice_y_calificacion`).
- La reputación quincenal es una agregación SQL exacta (`biweekly_90d_reputation_batch`).
- El Líder del nicho y la insignia Mejor evaluado son cosas distintas.
- Las ponderaciones las publica G1, versionadas (E06).

**Pregunta:** ¿qué incentivo, dentro de M, le da a una marca nueva una oportunidad real de ser vista sin premiar a las marcas malas ni abrir una vía de manipulación?

## Factores de decisión

| Factor | Peso | Por qué pesa así |
|---|---|---|
| F1 Oportunidad para marcas nuevas | 25 | Es lo que pide PEN-08 |
| F2 Mérito y confianza del comprador | 25 | El orden debe seguir premiando a las mejores marcas; la calificación nunca se excluye |
| F3 Resistencia a la manipulación | 15 | Volver a registrarse o comprarse a sí misma no debe dar ventaja |
| F4 Explicabilidad para las marcas | 15 | Las marcas pagan suscripción y deben entender por qué están donde están |
| F5 Determinismo y simplicidad | 10 | P9 es agregación SQL exacta y P13 es un cálculo reproducible |
| F6 Estabilidad del Líder del nicho | 10 | El centro del sistema no debería cambiar de dueño cada quincena por ruido |

## Opciones consideradas

**A. Sin cambios.** El índice queda como está; solo se mide la concentración (T26).

**B. Calificación con promedio bayesiano.** La calificación de cada marca se calcula como si tuviera C evaluaciones adicionales con la media del nicho: `(C·m + suma de notas) / (C + n)`. Una marca nueva empieza en la media del nicho y no en cero; una marca con pocas notas altas no salta al primer lugar.

**C. Transformación cóncava de compras y flujo.** Compras y flujo entran al índice como `log(1 + x)` normalizado por el máximo del nicho. Cada pedido adicional suma menos que el anterior, lo que baja la ganancia del bucle para todos.

**D. Bonificación de llegada decreciente.** Durante los primeros 90 días, las componentes de compras y flujo se completan con la mediana del nicho, con un peso que baja de 1 a 0.

**E. Cupo de exploración en la vista.** En cada nicho, una de cada N posiciones visibles de la búsqueda y una órbita del sistema 3D se reservan para marcas nuevas, que rotan de forma determinista cada quincena. El índice y el Líder del nicho no cambian.

**F. Combinación de B y E.** El promedio bayesiano corrige el arranque de la calificación y el cupo da visibilidad sin tocar compras ni flujo.

## Decisión propuesta

**Opción F: calificación con promedio bayesiano más cupo de exploración**, para que el usuario la apruebe o la descarte. Los valores son iniciales; G1 los fija y los versiona por E06.

1. **Calificación bayesiana en P9.** `calificacion_ajustada = (C·m + suma de notas) / (C + n)`, con `m` la media del nicho en la ventana de 90 días y `C = 10` evaluaciones. Sigue siendo una agregación SQL exacta (SUM y COUNT más dos constantes). La calificación no se excluye: se ajusta. La insignia Mejor evaluado y el umbral de 4,0 del desvío de `rule_02` usan la calificación ajustada.
2. **Cupo de exploración en P3.** En cada nicho, 1 de cada 5 posiciones visibles de la búsqueda y una órbita del sistema 3D se reservan para marcas que cumplan las tres condiciones:
   - menos de 10 pedidos confirmados en la ventana de 90 días;
   - menos de 180 días desde su habilitación;
   - calificación ajustada de al menos 3,0.
   Si ninguna cumple, el cupo vuelve al orden normal. Las marcas en el cupo rotan cada quincena según un orden determinista (hash de `marca_id` y del número de quincena), reproducible y auditable. La interfaz las marca como "Nueva en el nicho".
3. **P13 publica en Π** la bandera de elegibilidad y el orden de rotación; P3 aplica el cupo al ordenar. El agente del usuario solo recibe los resultados ya ordenados.
4. **T26** (índice de Herfindahl-Hirschman de pedidos por nicho) llega a G1 por E70 cada mes.

### Consecuencias

**Positivas**
- La calificación de una marca nueva arranca en la media del nicho, y la marca entra al cupo en las quincenas que le toca por rotación. Si hay más marcas elegibles que cupos, la espera depende de cuántas compiten; la simulación de "Cómo se confirma" la mide.
- Cierra también el hallazgo de AUD-2026-10-20: el promedio bayesiano es la defensa estándar contra pocas notas extremas.
- El cupo no toca el índice ni el Líder del nicho. El ajuste bayesiano sí puede cambiar al Líder una vez, cuando se aplica, y después lo hace más estable frente a pocas notas extremas.
- Todo es determinista y se explica en una frase a cada marca.

**Negativas y riesgos**
- El cupo cede una de cada cinco posiciones a marcas sin historial; si la marca nueva es mala, el comprador lo paga. Lo limita el piso de 3,0 de calificación ajustada.
- Una marca podría intentar volver a registrarse para recuperar el cupo. Lo limita la habilitación de marca de ADR-0003 (Cuenta Bold, llave Bre-B y chat de Telegram verificados): el cupo se asocia a la identidad verificada, no al `marca_id`.
- Tres parámetros nuevos (C, N y los umbrales de elegibilidad) que G1 debe gobernar.
- Compras y flujo siguen reforzando al líder fuera del cupo. Si T26 sigue alto, la opción C queda como siguiente paso.

### Cómo se confirma

1. **Simulación antes de aprobar:** un nicho con 10 marcas durante 12 quincenas, con demanda y calificaciones sintéticas, comparando A y F. Se mide T26 y la participación de una marca nueva de calidad igual a la media a los 90 días.
2. **Criterio de referencia:** en nichos con 5 o más marcas, que el HHI quede por debajo de 1.800 puntos, el umbral de alta concentración de las guías de fusiones de EE. UU. de 2023. Es una referencia, no una norma aplicable.
3. **En producción:** G1 revisa T26 cada mes (E70) y ajusta C, N y los umbrales cada trimestre.

## Análisis de las opciones

### A. Sin cambios
- A favor: no hay nada que construir; el índice se explica solo.
- En contra: deja PEN-08 sin resolver. En un nicho maduro la marca nueva no tiene cómo competir.

### B. Promedio bayesiano
- A favor: corrige el arranque de la calificación y resiste notas extremas con pocas evaluaciones; es SQL exacto.
- En contra: solo toca el 40 % del índice; compras y flujo siguen en cero para la marca nueva.

### C. Transformación cóncava
- A favor: baja la ganancia del bucle para todos, sin parámetros por marca.
- En contra: cambia el índice de todas las marcas a la vez y es más difícil de explicar; el líder pierde ventaja aunque la merezca.

### D. Bonificación decreciente
- A favor: ayuda directo en las dos componentes que están en cero.
- En contra: le da puntaje a pedidos que no ocurrieron, premia a marcas que no lo han ganado y es la más fácil de manipular volviendo a registrarse.

### E. Cupo de exploración
- A favor: da visibilidad sin tocar el índice ni el Líder del nicho; es el patrón de exploración de los problemas de "bandido multibrazo".
- En contra: por sí solo deja a la marca nueva con calificación en cero si recibe pocas notas.

### Matriz de decisión

Puntajes de 1 a 5 por juicio de ingeniería; el total es el promedio ponderado.

| Factor (peso) | A | B | C | D | E | F (B + E) |
|---|---|---|---|---|---|---|
| F1 Oportunidad (25) | 1 | 3 | 3 | 4 | 4 | 5 |
| F2 Mérito (25) | 4 | 5 | 4 | 3 | 4 | 5 |
| F3 Manipulación (15) | 4 | 5 | 4 | 2 | 3 | 4 |
| F4 Explicabilidad (15) | 5 | 4 | 3 | 3 | 4 | 4 |
| F5 Simplicidad (10) | 5 | 4 | 4 | 3 | 3 | 3 |
| F6 Estabilidad (10) | 5 | 4 | 3 | 3 | 5 | 4 |
| **Total ponderado** | **3,60** | **4,15** | **3,50** | **3,10** | **3,85** | **4,40** |

F lleva el mismo 4 de B en estabilidad, porque hereda su ajuste de la calificación; el cupo no la mejora ni la empeora. F gana aun duplicando el peso de la simplicidad (F 4,27; B 4,14; A 3,73). A no queda último porque es simple y estable, pero falla en lo único que PEN-08 pide.

## Información adicional y fuentes

Consultadas el 2026-10-26.

- Promedio bayesiano como media ponderada entre la media previa y la muestra, equivalente a sumar C datos con valor m: [Bayesian average](https://en.wikipedia.org/wiki/Bayesian_average).
- Cálculo del índice de Herfindahl-Hirschman y umbral de 1.800 puntos de las guías de fusiones de 2023: [Departamento de Justicia de EE. UU.](https://www.justice.gov/atr/herfindahl-hirschman-index).
- Hallazgo sobre la fórmula de desempate y antimanipulación: [AUD-2026-10-20](../auditorias/AUD-2026-10-20-insumos-gemini.md).
- Insumo: FG-05 (propuesta de cerrar PEN-08 con `Theta_s` y el desvío, que este ADR descarta como solución por las razones del contexto).
