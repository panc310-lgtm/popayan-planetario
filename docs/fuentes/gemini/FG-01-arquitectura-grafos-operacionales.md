# FG-01 — Arquitectura y Grafos Operacionales JSON

| Campo | Valor |
|---|---|
| Origen | Gemini, `https://gemini.google.com/app/51a36387e1ad4904` |
| Archivo recibido | `Base durable.pdf` (4 páginas, impreso con Microsoft Print to PDF el 2026-10-20 19:41 -05) |
| SHA-256 | `36575d3595edf475227a29d76504cf03ab0ecdf536b28b17807e46348ed3f098` |
| Fidelidad | Sin capa de texto; bloques de código cortados en el margen derecho (ver AUD-02) |
| Transcripción | Lectura visual, 2026-10-20, en la auditoría [AUD-2026-10-20](../../auditorias/AUD-2026-10-20-insumos-gemini.md) |
| Rol | **Conversación de origen** de `N0_ORG_CORE`, `rule_01`–`rule_03`, `F(t)`, `Φ_total` y la elección del Grafo 3 |

Etiquetas de estado: `[VIGENTE]` sigue valiendo hoy · `[SUPERADO]` reemplazado por una decisión posterior · `[CORREGIDO]` reformulado en `arquitectura/kernel-durable.json` · `[ABIERTO]` sin decidir · `[NO VERIFICABLE]` afirmación sin evidencia · `[INCORRECTO]` contradice un hecho comprobable.

---

## T1 · p. 1

**Prompt del usuario:** definir el nivel de coherencia y la estructura operacional de una app de alto tamaño poblacional; "no tomes una decisión sin una estructura básica de grafo que parta del núcleo organizacional"; inventario del proyecto en JSON, función general, integral de dimensión del flujo y al menos tres grafos.

**Respuesta:** vacía.

## T2 · p. 1–4

**Prompt del usuario:** el mismo, con la escala (100 marcas, al menos 1.000 usuarios, mercado del tamaño de Popayán) y un enlace `share.gemini.google/03s3AsoYQ2Z3`.

**Respuesta, por secciones:**

1. **Enlace compartido:** Gemini no pudo abrirlo (requiere sesión). El contenido de ese enlace no entró en la respuesta.
2. **Auditoría del prompt:** coherencia topológica 9,0; serialización 8,5; matemática 8,0; parametrización operativa 6,0; global 7,9/10. Propone un "prompt refactorizado". `[NO VERIFICABLE]` puntajes sin método. El prompt refactorizado está **truncado** en el PDF.
3. **Inventario maestro (JSON):**
   - `project_metadata`: población 330.000, 100 marcas, 1.000 usuarios base, `decision_constraint: STRICT_ROOT_GRAPH_VALIDATION_REQUIRED`. `[VIGENTE]` como regla de gobierno.
   - `organizational_core` `N0_ORG_CORE`: aislamiento multi-marca, idempotencia UUIDv7, cortacircuitos por marca, telemetría central. `[VIGENTE]`.
   - `system_dimensions`: oferta (100 marcas, `geozone_popayan`), demanda (mín. 1.000, meta 50.000), mercado con **5 zonas** (`Centro_Historico`, `Norte_Comercial`, `Sur_Residencial`, `Occidente`, `Oriente_Universitario`) y ventanas pico 11:30–14:00 y 18:30–21:30. Zonas `[SUPERADO]` por 9 galaxias = 9 comunas. Ventanas pico `[NO VERIFICABLE]` (supuesto).
   - Nodos: `N1_IDENTITY_GATEWAY`, `N2_BRAND_ORCHESTRATOR` (incluye "sincronización de stock"), `N3_EVENT_BROKER_ENGINE`, `N4_MATCHING_&_CATALOG_INDEX`, `N5_FULFILLMENT_&_DISPATCH` ("coordinación de entrega"), `N6_AUDIT_&_AI_TELEMETRY`. N5 `[SUPERADO]`: la logística es de cada marca. N1 de identidad desaparece en versiones posteriores (ver AUD-15).
   - `decision_matrix_rules`: `rule_01` política falla → abortar; `rule_02` `brand_load >= 0.90` → frenar la cola; `rule_03` toda transición emite un evento inmutable. `[VIGENTE]`; `rule_02` `[CORREGIDO]` como Θ suave.
4. **Función general** `F(t) = Ω0 · (M100 × A_G × U_Nᵀ) − Ψ_fricción`. `[CORREGIDO]` en el kernel 1.1.1: Ω por transacción, sin resta de magnitudes con unidades distintas.
5. **Integral** `Φ_total = ∫ Σ_m Σ_u [λ·γ·μ / (1 + τ_lat + δ_zona)] dt`. `[CORREGIDO]`: τ y δ normalizados (sin unidades) y el registro de eventos como identidad de cálculo.
6. **Tres grafos:** 1) jerárquico estrellado (punto único de falla), 2) DAG de eventos, 3) multicapa híbrido (Capa 0 gobierno, Capa 1 bipartita de mercado, Capa 2 DAG). Afirma que 5.000 eventos/min (≈83/s) bloquearían un nodo central. `[NO VERIFICABLE]`: 83 escrituras/s es carga baja para PostgreSQL.
7. **Veredicto:** Grafo 3. `[VIGENTE]` (`selected_graph_topology` del kernel).

## Qué se conserva de FG-01

La regla de gobierno, el nodo raíz, las tres reglas de decisión y la elección del Grafo 3. Las zonas, la logística de despacho y la forma original de las ecuaciones ya fueron reemplazadas.
