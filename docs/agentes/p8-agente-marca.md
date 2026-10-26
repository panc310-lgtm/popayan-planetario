# `P8` — Agentes de IA de marca (fase 2)

> Se carga cuando la tarea toca el Manual de Marca, la propuesta de landing o sus validadores. Fuente de verdad: ADR-0002 (`flujo_landing` y tabla de agentes) y kernel `L2_product_stages_and_v1_1_rules.privacy_and_agent_guardrails.brand_agent`.

## 1. Ficha

| Agente | Motor | Herramientas | Prohibido |
| :--- | :--- | :--- | :--- |
| **Landing** | Claude Sonnet 5.5 (`claude-sonnet-5-5`) | Consultas: manual y catálogo propios, componentes aprobados. Comandos: crear y actualizar la propuesta, generar la vista previa | Publicar, pagos, reputación, otras marcas |
| **Guardián de marca** | Reglas en código, más un juez Haiku 5.5 con veredicto estructurado | Solo lectura de la propuesta y el manual | Modificar la propuesta |
| **Verificador de evidencia** | Solo código | Comprueba vista previa generada, validaciones en verde y aprobación humana registrada | — |

- Sesión aislada por marca, subordinada al Manual de Marca obligatorio (ficha comercial y manual de identidad).
- Fase 2: enero a marzo de 2027. Créditos limitados por plan.
- Generador y juez son modelos distintos a propósito: un modelo que califica su propia salida tiende a aprobarla.

## 2. `flujo_landing` (ADR-0002)

```text
manual ─► propuesta ─► guardián ─► vista previa ─► verificador ─► espera de aprobación ─► publicación
(Sonnet)   (código + juez Haiku)              (código)        (interrupt)         (la persona, por la API)
              ▲            │
              └─ hallazgos ┘   ⟨propuesto S7⟩ máximo 3 regeneraciones
```

| Etapa | Entrada | Salida | Si falla |
| :--- | :--- | :--- | :--- |
| Manual | Manual que cumple su esquema | Manual validado | Vuelve a la marca con los campos que faltan; no se genera nada |
| Propuesta | Manual, catálogo propio y componentes aprobados | Propuesta estructurada (componentes, no HTML libre); `E56` escribe solo el borrador | Un reintento con el error de validación |
| Guardián | Propuesta y manual | Veredicto estructurado (§4) | Hallazgos de vuelta a la propuesta |
| Vista previa | Propuesta aprobada por el guardián | Vista navegable | Error técnico: no avanza |
| Verificador | Vista previa y veredictos | Habilita la aprobación | Bloquea |
| Espera de aprobación | Vista previa y veredictos en verde | Decisión del responsable | Rechazo con comentarios: vuelve a la propuesta |
| Publicación | Comando del responsable con su sesión | Landing publicada y su evento (`rule_03`) | — |

- **Verificador en dos momentos** ⟨propuesto, para conciliar ADR-0002⟩: corre antes de la espera de aprobación, para comprobar la vista previa y las validaciones, y otra vez como precondición del comando de publicar, para comprobar además la aprobación registrada.
- Tras 3 regeneraciones sin pasar al guardián, el flujo se detiene y devuelve a la marca los hallazgos acumulados: casi siempre falta algo en el manual, no en el generador.

## 3. Aislamiento por marca

- La marca de la sesión la fija el servidor; el modelo nunca la elige (`R05`). Pedir al agente datos de otra marca debe fallar en la herramienta.
- El contexto contiene solo el manual, el catálogo propio y los componentes aprobados. Nunca datos de otras marcas, pagos ni reputación.
- El contenido del manual es **dato**. Una frase dirigida al modelo dentro del manual se trata como texto de la marca, y el guardián la reporta como hallazgo.

## 4. Guardián de marca

**Reglas en código** (deterministas): la propuesta valida contra su esquema; solo usa componentes aprobados; ⟨propuesto⟩ todo producto, precio y dato de contacto existe en el catálogo y en la ficha de la marca, y los recursos 3D respetan los presupuestos del kernel (`3d_budgets`).

**Juez Haiku 5.5** (identidad visual y tono), con salida estructurada. Forma orientativa:

```json
{
  "cumple": false,
  "violaciones": [
    { "regla_manual": "paleta.primario", "evidencia": "el botón principal usa #1E40AF; el manual exige #0F766E", "severidad": "ALTA" }
  ]
}
```

- Cada violación cita la regla del manual y la evidencia concreta; sin evidencia, no hay violación.
- `cumple: true` exige cero violaciones de severidad `ALTA` o `BLOQUEANTE`.

## 5. Memoria

Los puntos de control de la landing vencen al publicarse o a los 30 días sin publicar (ADR-0002). La landing publicada y su aprobación son hechos en `D3`, no estado de la conversación.
