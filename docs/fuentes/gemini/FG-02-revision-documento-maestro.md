# FG-02 — Revisión del Documento maestro v0.1 ("Solicitud de Contenido de Claude")

| Campo | Valor |
|---|---|
| Origen | Gemini, `https://gemini.google.com/app/2089c669571c646c` |
| Archivo recibido | `base durable 1.1.pdf` (4 páginas, impreso con Microsoft Print to PDF el 2026-10-20 19:42 -05) |
| SHA-256 | `af7a7d7d79d69347de1ccbbc7b72b20d9aa374bd0cbcc3a4f6adefc00ef0b79b` |
| Fidelidad | Sin capa de texto; sin bloques de código, contenido completo |
| Rol | Revisión externa del Documento maestro v0.1 (fechado 16-oct-2026), antes de los cambios del 19–20 de octubre |

Etiquetas de estado: las mismas de [FG-01](FG-01-arquitectura-grafos-operacionales.md).

---

## T1 · p. 1

**Prompt del usuario:** acceder al artefacto `claude.ai/artifact/1FDyw1neXhzV7oyJ7uW73U#add6ab0f-7a49`.

**Respuesta:** no puede abrir artefactos de claude.ai; pide copiar o descargar el contenido. Menciona `ARCH-PORTS-01` y "la auditoría del segundo CRM", que pertenecen a `@crm-erika`.

## T2 · p. 1–4

**Prompt del usuario:** "revisa este markdown" (el Documento maestro v0.1, pegado).

**Respuesta — aciertos que reconoce:**

- 7 de 22 pendientes bloqueaban la maqueta y están cerrados; quedan 6 decisiones del MVP.
- Suscripción plana ($150.000 plan básico, $75.000 segundo planeta) sin comisión por venta. `[VIGENTE]`
- Rechazo de la pasarela por el costo de Bold (2,89 % por QR) y dinero directo a la llave Bre-B. Dinero directo `[VIGENTE]`; rechazo de verificación automática `[SUPERADO]` el 20-oct.
- Operación del comercio 100 % en WhatsApp Business API. `[SUPERADO]` por Telegram.
- Jerarquía Galaxia (9 comunas) → Sistema (nicho) → Planeta central (líder) → planetas en órbita. `[VIGENTE]`
- Tabla de versiones sustituidas del documento maestro. `[VIGENTE]` como práctica.

**Respuesta — alertas y su estado hoy:**

| # | Alerta de Gemini | Estado al 2026-10-20 |
|---|---|---|
| A | Cronograma: 44 días hasta congelar funciones el 30-nov; construir la maqueta sobre la misma base técnica del MVP para no tirar código | Congelamiento duro `[SUPERADO]` por baseline v1.1 el 29-nov con desarrollo continuo. "Maqueta sobre la base del MVP" `[ABIERTO]`: no hay decisión escrita |
| B | Los scripts de Blender generan 4 soles comerciales (Centro, ZonaNorte, Tulcán, Bolívar) en vez del planeta líder del nicho | `[ABIERTO]`: `scene_popayan.py` del repo **sigue** con los 4 soles, incluido Bolívar, que no es zona objetivo |
| C | Confirmación manual del pago por WhatsApp en hora pico; propone recordatorio a los 3 minutos | Resuelto por la decisión de verificación automática; proveedor `[ABIERTO]` (PEN-01) |
| D1 | Índice sin mínimo de evaluaciones: 1 compra de 5★ puede superar a 200 evaluaciones de 4,6★; propone promedio bayesiano | `[ABIERTO]`: la fórmula de desempate y antimanipulación sigue pendiente |
| D2 | "Flujo comercial" (20 %) y "Compras" (30 %) no están definidos por separado | `[ABIERTO]`: el kernel aún no define "flujo" |
| E | $20M pedidos ($10M producción + $10M pauta) frente a $2,85M de gasto operativo estimado | `[ABIERTO]` (PEN-06): presupuesto del 17-oct desactualizado |

**Cierre:** ofrece tres frentes (arquitectura de la maqueta en JSON, motor 3D con 9 galaxias, cierre de 4 pendientes del MVP).

## Qué se conserva de FG-02

Las alertas B, D1, D2 y E siguen abiertas y entran a la auditoría como pendientes.
