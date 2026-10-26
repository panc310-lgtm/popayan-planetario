# Plantilla — Protocolo de doble salida

> Toda entrega de cierre o auditoría del plano A se compone **únicamente** de estos dos bloques, en este orden (`AGENTS.md` §6).

## Bloque 1 — Telemetría JSON de nivel principal

- Valida contra [`telemetria-entrega.schema.json`](telemetria-entrega.schema.json) con Ajv 8 (`ajv/dist/2020.js`) y `ajv-formats` (por `format: date-time`).
- `fase` es `DOCUMENTAL` mientras no exista `packages/`, y `CODIGO` desde el primer paquete.
- El esquema hace imposible declarar `COMPLETADO` si falta alguna verificación de la fase o alguna no está en `VERDE`, si una invariante queda `NO_VERIFICADA` o `VIOLADA`, o si el crítico no aprobó con cero hallazgos abiertos.
- `ESCALADO` exige `motivo_escalamiento`.
- Los archivos generados se declaran como `REGENERADO`, no como `MODIFICADO`.

## Bloque 2 — Cápsula didáctica de ingeniería

Cinco apartados cortos, en este orden:

1. **Qué cambió**, en lenguaje de negocio y de ingeniería.
2. **Decisión y alternativa descartada:** por qué esto y no la opción obvia.
3. **Invariante que protege:** cuál, y cómo la rompería la alternativa.
4. **Concepto para llevarse:** la idea de ingeniería que enseña el cambio, para alguien que no la conoce.
5. **Cómo comprobarlo uno mismo:** comandos o archivos concretos.

---

## Ejemplo (ilustrativo)

> La traza, los archivos y las cifras de este ejemplo son ficticios: solo muestran la forma.

```json
{
  "protocolo": "doble-salida/1.0",
  "traza": ["PEN-12", "D3"],
  "tipo_entrega": "CIERRE",
  "fase": "DOCUMENTAL",
  "estado": "COMPLETADO",
  "fecha": "2026-11-02T10:00:00-05:00",
  "agente": { "rol": "actor", "modelo": "claude-opus-5-5" },
  "baseline": { "kernel": "1.7.1-DURABLE-KERNEL", "grafo": "0.9", "modelo_de_carga": "0.6", "adrs": ["ADR-0001"] },
  "cambios": [
    { "archivo": "arquitectura/kernel-durable.json", "tipo": "MODIFICADO" },
    { "archivo": "docs/modelo-de-carga.md", "tipo": "REGENERADO" }
  ],
  "invariantes": [
    { "id": "INV_01", "estado": "CUMPLE", "evidencia": "la exportación lee eventos ya confirmados; no toca la asignación de posición" },
    { "id": "INV_05", "estado": "NO_APLICA", "evidencia": "cambio documental, sin llamadas externas" }
  ],
  "verificaciones": [
    { "comando": "node tools/validar-arquitectura/validar.mjs", "resultado": "VERDE" },
    { "comando": "node tools/validar-arquitectura/pruebas.mjs", "resultado": "VERDE", "resumen": "19 casos correctos" },
    { "comando": "node tools/modelo-de-carga/calcular.mjs --check", "resultado": "VERDE" },
    { "comando": "node tools/modelo-de-carga/calcular.mjs --estricto", "resultado": "VERDE", "resumen": "ρ máx = 0,67 en D1" },
    { "comando": "node tools/vista-del-grafo/generar.mjs --check", "resultado": "VERDE" }
  ],
  "critico": { "veredicto": "APROBADO", "ciclos": 1, "hallazgos_abiertos": 0 },
  "metricas": { "rho_max": 0.67 },
  "riesgos_abiertos": ["El costo de R2 de la exportación horaria no está en el modelo de carga"],
  "siguiente_paso": "Agregar al modelo de carga las escrituras horarias a R2"
}
```

### Cápsula didáctica de ingeniería

**1. Qué cambió.** El kernel registra la exportación horaria del registro de eventos a R2, que baja de 24 horas a 1 hora la pérdida posible de datos.

**2. Decisión y alternativa descartada.** La opción obvia era la recuperación a un punto en el tiempo de Supabase, que cuesta US$100 al mes; la exportación horaria logra casi lo mismo para el registro de eventos por una fracción.

**3. Invariante que protege.** `INV_01`: la exportación lee solo eventos con posición asignada, así que nunca copia un evento a medio confirmar.

**4. Concepto para llevarse.** *Objetivo de punto de recuperación (RPO):* cuánto trabajo se acepta perder si todo falla. Los respaldos diarios dan un RPO de un día; exportar cada hora, de una hora.

**5. Cómo comprobarlo uno mismo.** `npm run verificar:todo`.
