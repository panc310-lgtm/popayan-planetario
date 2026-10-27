# Registro de fuentes del proyecto

Cada insumo que alimenta la arquitectura o el producto queda registrado aquí con un identificador estable, su origen, su fidelidad y un resumen por turno. Las conversaciones con IA son **insumos**: nunca prevalecen sobre las decisiones confirmadas por el usuario ni sobre los archivos canónicos de `arquitectura/`.

## Regla de precedencia (propuesta, por aprobar)

1. Decisiones confirmadas por el usuario y registradas en el kernel o en un ADR.
2. Archivos canónicos del repo: `arquitectura/kernel-durable.json` y `arquitectura/grafo-operacional.json`.
3. Documento maestro en Claude Docs (FD-01).
4. Conversaciones con IA (FG, FC): insumos.

## Fuentes registradas

| ID | Tipo | Título | Origen | Fecha | Fidelidad | Resumen |
|---|---|---|---|---|---|---|
| FG-01 | Conversación Gemini | Arquitectura y Grafos Operacionales JSON | `gemini.google.com/app/51a36387e1ad4904` | Impreso 2026-10-20 | PDF sin texto; código truncado | [FG-01](gemini/FG-01-arquitectura-grafos-operacionales.md) |
| FG-02 | Conversación Gemini | Revisión del Documento maestro v0.1 | `gemini.google.com/app/2089c669571c646c` | Impreso 2026-10-20 | PDF sin texto; completo | [FG-02](gemini/FG-02-revision-documento-maestro.md) |
| FG-03 | Conversación Gemini | Arquitectura y Límites de Ingeniería Agéntica | `gemini.google.com/app/ed5f0b0c36b9dc28` | Impreso 2026-10-20; JSON hasta 2026-10-19 | PDF sin texto; JSON truncados | [FG-03](gemini/FG-03-arquitectura-limites-ingenieria-agentica.md) |
| FG-04 | Conversación Gemini | Estado del Arte Repositorios GitHub: origen del registro L3, de `S_Planetario` y del kernel `1.1.0-DURABLE-KERNEL` | `gemini.google.com/app/67237e484bbc548b` | Recibida 2026-10-22; kernel del 2026-10-20 | PDF sin texto; código y ecuación truncados | [FG-04](gemini/FG-04-estado-del-arte-repositorios.md) |
| FG-05 | Criterios trabajados con Gemini | Constitución AGENTS.md y sincronización del grafo SoC v0.9 | Pegado en una conversación con Claude | 2026-10-26 | Texto completo; T1 cortado en su sección 6 | [FG-05](gemini/FG-05-constitucion-agents-md.md) · [texto literal](gemini/FG-05-texto-original.md) |
| FG-06 | Conversación Gemini y mensaje de decisiones | Atractor extraño en el grafo SoC; decisiones del 2026-10-26 sobre P13, ADR-0004 y la capacidad | `gemini.google.com/app/3d8b8a948021d279` | Impreso 2026-10-26; decisiones del 2026-10-26 | PDF sin texto; código cortado | [FG-06](gemini/FG-06-atractor-extrano-soc.md) · [texto de las decisiones](gemini/FG-06-texto-original.md) |
| FG-07 | Conversación Gemini | Verificación de acceso al repositorio y diseño del SoC v0.9 de Gemini | `gemini.google.com/app/d4b46981c081f0b1` | Impreso 2026-10-26 | PDF sin texto; errores de PowerShell | [FG-07](gemini/FG-07-verificacion-acceso-repositorio.md) |
| FC-01 | Conversación ChatGPT | Diseño de producto inicial | `chatgpt.com/share/6ad23b39-6550-83e9-bf42-c9e45cbac7c5` | Leída 2026-10-16 | Enlace compartido | Pendiente de resumir |
| FD-01 | Documento Claude Docs | Documento maestro de estructura — Popayán Planetario v0.1 | `claude.ai/code/artifact/01fc69b7-adf1-4d0e-853f-3f80bb4b872f` (enlace compartido: `claude.ai/artifact/1FDyw1neXhzV7oyJ7uW73U`) | Desde 2026-10-16 | Documento vivo | Fuente de las reglas de producto; pestaña "Presupuesto de producción" del 2026-10-17 |
| FD-02 | Documento Claude Docs | Universo visual de Popayán Planetario | `claude.ai/code/artifact/34bf8d5e-ca7f-4008-a417-c3e04e5ff3f1` | 2026-10-17 | Documento vivo; estado propuesta | Guía visual |

### Archivos originales de las conversaciones Gemini

Los PDFs no se copian al repo (son imágenes sin texto). Se identifican por su huella SHA-256 para comprobar que un archivo es el mismo que se auditó.

| ID | Archivo | Páginas | SHA-256 |
|---|---|---|---|
| FG-01 | `Base durable.pdf` | 4 | `36575d3595edf475227a29d76504cf03ab0ecdf536b28b17807e46348ed3f098` |
| FG-02 | `base durable 1.1.pdf` | 4 | `af7a7d7d79d69347de1ccbbc7b72b20d9aa374bd0cbcc3a4f6adefc00ef0b79b` |
| FG-03 | `base durable 2.pdf` | 26 | `94a8542e237fba2d1939f54742c4c533b6af0f0f56a175bfea4090fb7b766412` |
| FG-04 | `base durable 2.1.pdf` | 40 | `db6df6d90900ba04c97310a45162732dc680fc27689c7c81c60f67564947646d` |
| FG-06 | `base_durable_3.1.pdf` | 18 | `7488b9ba13bc9c4c3a6342070a5557bafb5090855fad1bd4bfb15c789dd8b22a` |
| FG-07 | `base_durable_3_2.pdf` | 36 | `996c801eb3cc60f5e53ada71e2630a904c3ac9a43395fb4f4a3ab9a306fbed25` |

### Referencias citadas en las fuentes que no se pudieron leer

| Referencia | Citada en | Nota |
|---|---|---|
| `share.gemini.google/03s3AsoYQ2Z3` | FG-01 T2 | Gemini no pudo abrirla; su contenido no entró en la respuesta |
| `claude.ai/artifact/1FDyw1neXhzV7oyJ7uW73U` | FG-02 T1 | Es el enlace compartido del documento maestro (FD-01), comprobado el 2026-10-20. Gemini no pudo abrirlo; el usuario pegó después su contenido |
| `panc310-lgtm/CRM-ERIKA` | FG-02, FG-03 | **Solo referencia de aprendizaje.** Ningún archivo, tabla ni métrica de ese repositorio forma parte de Popayán Planetario |

Los repositorios de estado del arte (L3) están en `arquitectura/kernel-durable.json`, sección `L3_distilled_sota_mapping`, con su verificación del 2026-10-20. La investigación del 2026-10-22 ([informe](../investigacion/2026-10-22-repositorios-harness-hexagonal/informe.md)) los volvió a verificar y amplió el estado del arte.

## Cómo registrar una fuente nueva

1. Asignar el siguiente ID del tipo: `FG` Gemini, `FC` ChatGPT, `FA` Claude (chat), `FD` documento, `FR` repositorio externo.
2. Si es un archivo, calcular su SHA-256 y anotarlo; preferir siempre exportar el texto (Markdown o Documento) en vez de imprimir a PDF.
3. Crear el resumen en la carpeta del tipo, turno por turno, con las páginas o la ubicación de cada afirmación.
4. Marcar cada afirmación con una etiqueta: `[VIGENTE]`, `[SUPERADO]`, `[CORREGIDO]`, `[ABIERTO]`, `[NO VERIFICABLE]`, `[INCORRECTO]` o `[NO APLICA]`.
5. Llevar al kernel o a un ADR solo lo que el usuario confirme; la fuente queda citada en esa decisión.
