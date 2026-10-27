# FG-07 — Verificación de acceso al repositorio y diseño del SoC v0.9

| Campo | Valor |
|---|---|
| Origen | Gemini, `https://gemini.google.com/app/d4b46981c081f0b1` ("Verificación de Acceso a Repositorio") |
| Archivo recibido | `base_durable_3_2.pdf` (36 páginas, impreso con Microsoft Print to PDF el 2026-10-26 a las 23:29 -05) |
| SHA-256 | `996c801eb3cc60f5e53ada71e2630a904c3ac9a43395fb4f4a3ab9a306fbed25` |
| Fidelidad | PDF sin capa de texto; las páginas 1 a 9 son en su mayoría errores de PowerShell, porque el texto pegado se ejecutó como comandos |
| Rol | Conversación donde se diseñó la versión del SoC v0.9 de Gemini, antes de [FG-06](FG-06-atractor-extrano-soc.md). Es el origen de la numeración de aristas que usa el mensaje de decisiones |

Etiquetas de estado: las mismas de [FG-01](FG-01-arquitectura-grafos-operacionales.md).

---

## T1 a T2 · p. 1–9 · Estado del repositorio desde PowerShell

| Afirmación | Estado |
|---|---|
| Comando para entrar al repositorio y ver `git status` | `[NO APLICA]` |
| Volcado del repositorio pegado en el chat: rama `arquitectura/esquemas-y-validador`, kernel 1.5.0, grafo v0.6 y ADR-0003 | `[SUPERADO]`: es el estado del 2026-10-21; PEN-07 se fusionó en `main` el mismo día |
| Dos respuestas "soy un modelo de lenguaje", luego una auditoría | `[NO APLICA]` |

## T3 a T4 · p. 10–17 · Paso A y paso B en PowerShell

| Afirmación | Estado |
|---|---|
| Paso A: fusionar `arquitectura/esquemas-y-validador` en `main` | `[SUPERADO]`: ya estaba fusionada (commit 088e21e) |
| Paso B: crear `packages/ports`, `packages/domain` y `packages/adapters` con `VerificadorDePagos`, la máquina de estados de P4, un adaptador simulado con HMAC-SHA256 y sus pruebas, en la rama local `feat/adr-0003-verificador-pagos-y-p4` | `[ABIERTO]`: no está en el repositorio (GitHub solo tiene `main` y la rama de AGENTS.md). Si existe en el equipo del usuario, entra por la Definición de terminado de la fase de código (AGENTS.md §5) |

## T5 · p. 17 · Créditos

| Afirmación | Estado |
|---|---|
| No puede generar imágenes sin créditos | `[NO APLICA]` |

## T6 · p. 17–20 · Idea del SoC

| Afirmación | Estado |
|---|---|
| Grafos como planos de procesadores: tejido de memoria unificada, controlador de gestión, motor neuronal, caché de nivel de sistema y ejecución fuera de orden | `[VIGENTE]` como metáfora que motivó el SoC v0.9 |
| El grafo v0.8 tiene 28 nodos y 53 aristas | `[INCORRECTO]`: tenía 32 nodos y 61 aristas |
| El gobierno tiene grado de entrada operativo 0 y los agentes no reciben eventos del bus | `[VIGENTE]` para la v0.8; lo resuelven E70 a E73 y P13 |
| A2 llega a ρ = 2,50 en el pico | `[VIGENTE]`: la marca más activa acepta a mano un pedido por minuto; la protege la pausa automática (R06) |
| Opción 1 (solo aristas) frente a opción 2 (nodo P13) | `[VIGENTE]`: el usuario eligió la opción 2 |

## T7 · p. 20–24 · Especificación de Gemini para la opción 2

| Afirmación | Estado |
|---|---|
| P13 en el worker, 100 eventos por segundo por réplica, ρ = 0,24 en el pico | `[VIGENTE]` |
| P13 gobernado por G1 | `[CORREGIDO]`: en el repositorio lo gobierna G4, como todo servicio; G1 le publica parámetros por E76 |
| Numeración de Gemini en el script: E67 a E70 de P12 a G1, G3, G2 y G4; E71 de G1 a P13; E72 de P5 a P13; E73 de P9 a P13; E74 de P10 a P13; E75 de P13 a D4; E76 de D4 a P7 | `[CORREGIDO]`: el repositorio usa E67 y E74 (P5 → P13), E68 y E75 (P13 → D4), E69 (P13 lee D1), E70 a E73 (P12 → G1 a G4) y E76 (G1 → P13). No existe D4 → P7: los agentes no leen D4 directamente (ADR-0002) |
| Métricas T24 cobertura de decisión asistida, T25 desvío por saturación y T26 latencia del lazo de gobierno | `[CORREGIDO]`: el repositorio define T24 lectura de Π, T25 frescura de Π y T26 concentración de pedidos por nicho |
| Kernel "1.7.0-SOC-KERNEL" y grafo "0.9-SoC" | `[CORREGIDO]`: los esquemas exigen `-DURABLE-KERNEL` y versión `n.n` |
| Script de PowerShell que edita la vista HTML | `[NO APLICA]`: falló porque el archivo no estaba en la carpeta; la vista la genera `tools/vista-del-grafo/generar.mjs` |

## T8 · p. 24–26 · Definición formal del SoC v0.9

| Afirmación | Estado |
|---|---|
| El usuario prefiere que las transformaciones las haga Claude a partir de un prompt | `[VIGENTE]` |
| Pilar A, gobierno en lazo cerrado; pilar B, P13; pilar C, P7 en dos velocidades | `[VIGENTE]` en sustancia (grafo v0.9) |
| Otra numeración en este turno: E75 de P12 a P13, E76 de P13 a D4, E77 de P13 a D1 y E78 de D4 a P7 | `[CORREGIDO]`: no coincide ni con la de T7 ni con la del repositorio. P13 → D1 la descartó el usuario el 2026-10-26 (Π solo en D4) |
| Cuatro puntos por confirmar: P13 en el worker, mantener las réplicas y la ponderación de P7 en el modelo de carga, PEN-08 por exploración y desvío por saturación, y los 5 artefactos | `[VIGENTE]`: es una de las dos listas de "4 parámetros" que puede ratificar FG-06 D1 (ver allí); la tasa de turnos de P7 no cambió |

## Qué se conserva de FG-07

La motivación del SoC v0.9 y la elección de la opción 2. La numeración de aristas y las métricas de Gemini se sustituyeron por las del repositorio. El código del paso B queda fuera hasta que entre por la fase de código.
