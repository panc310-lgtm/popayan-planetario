# Investigación

Estudios de estado del arte y de opciones técnicas que preparan una decisión. Una investigación **no decide**: presenta opciones con sus costos, riesgos y fuentes verificadas. Lo que el usuario apruebe a partir de ella entra como ADR o en el kernel, citando la investigación.

## Índice

| Fecha | Investigación | Estado | Alimenta |
|---|---|---|---|
| 2026-10-22 | [Repositorios para un harness hexagonal](2026-10-22-repositorios-harness-hexagonal/informe.md) | Verificada | Registro L3, INV_06, PEN-02, PEN-05, PEN-11, PEN-14, ADR-0002 |

## Formato

Cada investigación vive en una carpeta `AAAA-MM-DD-tema/` con:

- `informe.md`: la síntesis, con una tabla inicial (fecha, estado, pregunta, insumos) y una sección final "Verificación del informe" que dice qué se contrastó y contra qué fuentes.
- `notas/`: las notas de cada línea de investigación, con sus fuentes. Son material de trabajo; ante una diferencia, prevalece el informe verificado.

Las fuentes que la originan se registran en [docs/fuentes/](../fuentes/README.md).
