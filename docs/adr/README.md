# Registro de decisiones de arquitectura (ADR)

Cada decisión de arquitectura que cuesta revertir queda en un archivo numerado, con su contexto, las opciones comparadas y sus consecuencias. El formato sigue [MADR 4](https://adr.github.io/madr/), en español.

Solo el usuario aprueba un ADR. Mientras no lo apruebe, su estado es **Propuesta** y nada de lo que dice entra al kernel como decidido.

## Índice

| ADR | Título | Estado | Fecha | Resuelve |
|---|---|---|---|---|
| [ADR-0001](ADR-0001-topologia-de-despliegue.md) | Topología de despliegue: Supabase + host de contenedores en Virginia (opción C) | Aprobada | 2026-10-20 | AUD-12, PEN-03, PEN-04; su enmienda del 2026-10-27 resuelve PEN-17 |
| [ADR-0002](ADR-0002-arquitectura-multiagente.md) | Arquitectura multiagente: orquestación determinista con agentes especializados sobre el núcleo de dominio (opción C) | Aprobada | 2026-10-21 | PEN-15 |
| [ADR-0003](ADR-0003-verificacion-de-pagos.md) | Verificación de pagos Bre-B: Bold condicionado a su aprobación escrita antes del 31-oct; contingencia: confirmación manual | Aprobada | 2026-10-21 | PEN-01 |
| [ADR-0004](ADR-0004-incentivo-marcas-nuevas.md) | Incentivo para marcas nuevas en el Índice de Relevancia: calificación bayesiana más cupo de exploración (opción F) | Aprobada | 2026-10-26 | PEN-08 |

## Estados

| Estado | Significado |
|---|---|
| Propuesta | Escrito y en revisión; no es una decisión |
| Aprobada | El usuario la aprobó; el kernel y el grafo se actualizan para reflejarla |
| Rechazada | El usuario la descartó; queda como registro de lo que se consideró |
| Reemplazada por ADR-NNNN | Una decisión posterior la sustituye; no se borra |

## Plantilla

```markdown
# ADR-NNNN — Título corto en forma de decisión

| Campo | Valor |
|---|---|
| Estado | Propuesta |
| Fecha | AAAA-MM-DD |
| Decide | (quién aprueba) |
| Resuelve | (hallazgos de auditoría o pendientes del kernel) |

## Contexto y problema
## Factores de decisión
## Opciones consideradas
## Decisión propuesta
### Consecuencias
### Cómo se confirma
## Análisis de las opciones
## Información adicional y fuentes
```
