# ADR-0003 — Proveedor de verificación automática de pagos Bre-B

| Campo | Valor |
|---|---|
| Estado | **Aprobada** (Bold condicionado; contingencia: confirmación manual) |
| Fecha | 2026-10-21 |
| Decide | El usuario; aprobó el 2026-10-21 |
| Resuelve | PEN-01 (proveedor de verificación automática Bre-B), compuerta `gate_1_to_mvp` |
| Afecta | Nodo X7 y aristas E42, E62 y E66 del grafo; restricciones R09 y R10; máquina de estados del pedido (P4); telemetría T09 |

## Contexto y problema

El MVP del 10-dic-2026 solo puede abrir con pagos reales verificados automáticamente (`gate_1_to_mvp`). Quedan 50 días.

Las reglas aprobadas que debe cumplir el proveedor:

1. **Bre-B**: el comprador paga por Bre-B.
2. **Dinero directo a la marca**: el pago llega a una cuenta de la marca; la plataforma no lo toca, no lo recauda ni cobra comisión por transacción. La tarifa del proveedor la paga la marca.
3. **Verificación automática**: solo un webhook con firma verificada marca un pedido como pagado, cotejando monto y marca, con clave de idempotencia por evento (R10).

Historia de la decisión:

- **17-oct-2026**: se descartó Bold por su costo (2,89 % por QR) y se eligió la confirmación manual: cada marca cobra en su llave Bre-B y confirma por WhatsApp.
- **20-oct-2026**: el usuario volvió a exigir verificación automática como compuerta del MVP, con el proveedor abierto. La investigación de ese día encontró que solo Bold cumple las tres reglas.

**Pregunta:** ¿con qué proveedor se verifica automáticamente cada pago Bre-B, y cómo se integra sin romper las reglas?

## Factores de decisión

| Factor | Peso | Por qué pesa así |
|---|---|---|
| F1 Cumplimiento de las tres reglas | 30 | Bre-B, dinero directo a la marca y verificación automática son decisiones aprobadas |
| F2 Costo para la marca en pedidos típicos | 20 | El público inicial son universitarios: pedidos de $20.000 a $40.000 |
| F3 Riesgo de integración y operación | 20 | APIs en beta, aprobaciones manuales y modelo de muchas marcas sin documentar |
| F4 Tiempo hasta el MVP | 15 | 50 días, con pruebas con marcas del 1 al 9 de diciembre |
| F5 Experiencia de compra | 10 | Confirmación inmediata frente a minutos de incertidumbre en hora pico |
| F6 Portabilidad | 5 | Poder cambiar de proveedor sin tocar el dominio |

## Opciones consideradas

**A. Bold.** Cada marca abre su Cuenta Bold y activa la API de pagos en línea. La plataforma genera un QR Bre-B por pedido con la llave de la marca, y el webhook de Bold confirma el pago.

**B. Pasarela con Bre-B (PayU u OnePay).** Bre-B por API y notificación automática, pero el proveedor recauda el dinero y lo abona después a la marca.

**C. Confirmación manual.** Cada marca cobra en su propia llave Bre-B y confirma el pago con un botón en Telegram. Es lo decidido el 17-oct.

**D. Mercado Pago, modelo de marketplace.** Cada marca autoriza a la plataforma por OAuth y el dinero llega a su cuenta de Mercado Pago, pero sin Bre-B.

**E. Esperar la regulación del Banco de la República** sobre referencia de pago en el QR, que permitiría conciliar sin intermediario. Descartada para el MVP: no hay norma ni fecha.

## Costo para la marca

Tarifas publicadas el 17-oct-2026 (documento maestro, pestaña "Proveedores de pago"), por pedido. Entre paréntesis, con IVA del 19 % sobre la tarifa y como porcentaje del pedido.

| Proveedor | Pedido de $20.000 | Pedido de $40.000 | Pedido de $80.000 |
|---|---|---|---|
| A. Bold: 2,89 % | $578 ($688; 3,4 %) | $1.156 ($1.376; 3,4 %) | $2.312 ($2.751; 3,4 %) |
| B. PayU: 3,29 % + $300, mínimo $450 | $958 ($1.140; 5,7 %) | $1.616 ($1.923; 4,8 %) | $2.932 ($3.489; 4,4 %) |
| B. OnePay: $2.200 fijos | $2.200 ($2.618; 13,1 %) | $2.200 ($2.618; 6,5 %) | $2.200 ($2.618; 3,3 %) |
| C. Manual | $0 | $0 | $0 |
| D. Mercado Pago: 3,29 % + $800 | $1.458 ($1.735; 8,7 %) | $2.116 ($2.518; 6,3 %) | $3.432 ($4.084; 5,1 %) |

Bold es el más barato de los proveedores con API en pedidos menores de unos $76.000; por encima de ese valor, OnePay cuesta menos. Las tarifas se publican antes de IVA. En Bold el IVA se suma a la tarifa, y el 2,89 % ya incluye el 4x1000; así que la cifra que aplica es la de la columna con IVA: 3,4 % del pedido.

## Hechos verificados el 2026-10-21

### Bold

| Tema | Hecho | Fuente |
|---|---|---|
| Tarifa | QR en línea: 2,89 % sin cargo fijo; incluye el 4x1000; **más IVA**. Solo para comercios con Cuenta Bold | [Tarifas](https://bold.co/tarifas) |
| Estado de la API | La API de pagos en línea sigue marcada como **beta**. QR Bre-B es uno de sus métodos; el QR vence a los 10 minutos por defecto | [Integración](https://developers.bold.co/pagos-en-linea/api-de-pagos-en-linea/integracion) |
| Consulta de estado | El cobro lleva el identificador del pedido en `reference_id` y su estado se consulta con `GET /v1/payment/{reference_id}` | [Integración](https://developers.bold.co/pagos-en-linea/api-de-pagos-en-linea/integracion) |
| Webhook | Firma HMAC-SHA256 en el encabezado `x-bold-signature`, con la llave secreta del comercio. Reintenta hasta 5 veces durante 24 horas, así que puede llegar repetido. Cada comercio registra hasta 5 destinos en su panel | [Webhook](https://developers.bold.co/webhook) |
| Webhook y QR de la API | **Sin confirmar** que el webhook cubra los QR creados por la API. Para pagos QR, la referencia del pedido en el webhook "puede ser null" | [Webhook](https://developers.bold.co/webhook) |
| Pruebas | No hay simulación de pagos QR Bre-B, y en modo de pruebas no se envían webhooks | [Integración](https://developers.bold.co/pagos-en-linea/api-de-pagos-en-linea/integracion) |
| Activación | Cada comercio la pide en su panel; el equipo de Bold la revisa, **sin plazo publicado** | [Activación](https://developers.bold.co/pagos-en-linea/api-de-pagos-en-linea/activacion) |
| Uso por terceros | La licencia de la API es "personal… no transferible", prohíbe sublicenciarla y revelar las llaves; la llave secreta "solo tú debes conocerla"; la Cuenta Bold no puede ser operada por terceros. El programa de partners de Bold solo cubre reventa de datáfonos y referidos | [Términos de la API](https://bold.co/legal/api-pagos-en-linea), [Reglamento de la Cuenta Bold](https://bold.co/cf/legal/reglamento-de-cuenta-bold), [Partners](https://bold.co/legal/partners-bold) |
| Tope | La cuenta de depósito de bajo monto (solo personas naturales) admite hasta 210,5 UVT al mes, unos $11 millones en 2026; las operaciones por encima se rechazan. Las cuentas ordinarias no tienen ese tope | [Reglamento de la Cuenta Bold](https://bold.co/cf/legal/reglamento-de-cuenta-bold) |

### Mercado

Ningún proveedor documenta a la vez cobro Bre-B por API, dinero en una cuenta propia de cada marca y un modelo de muchas marcas. No apareció nada nuevo desde mediados de octubre.

| Proveedor | Bre-B por API | Dinero directo a la marca | Muchas marcas |
|---|---|---|---|
| Bold | Sí (beta) | Sí | No |
| PayU | Sí | No: va a la cuenta virtual PayU | Sin confirmar |
| OnePay | Sí | No: queda en el saldo de OnePay | No documentado |
| Cobre | Sí | No: va a la cuenta Cobre | No |
| Wompi | No | No | No |
| ePayco | Solo presencial | No | Solo como agregador |
| Mercado Pago | No | Sí, a la cuenta de cada marca | Sí, por OAuth |

Fuentes: [Wompi](https://docs.wompi.co/docs/colombia/metodos-de-pago/), [PayU](https://developers.payulatam.com/latam/es/docs/integrations/api-integration/payments-api-colombia.html), [OnePay](https://docs.onepay.la/client/charges/bre-b), [Cobre](https://www.cobre.co/breb/payin), [ePayco](https://docs.epayco.com/docs/split-descripcion), [Mercado Pago](https://www.mercadopago.com.co/developers/es/docs/checkout-api-payments/how-tos/integrate-marketplace). Kushki, Nequi Negocios, Bancolombia, Davivienda, Movii y Treinta no publican documentación de Bre-B para desarrolladores.

### Regulación

El proyecto PR-DSP-008 del Banco de la República cerró comentarios el 17-oct-2026 y, hasta donde se pudo confirmar, sigue en borrador.
- Define la "Referencia de Pago", pero solo "cuando esto aplique".
- Deja las fechas a un cronograma que el Banco definirá. [Proyecto PR-DSP-008](https://www.banrep.gov.co/es/normatividad/proyecto-regulacion-pr-dsp-008)

## Análisis de las opciones

### A. Bold

- A favor:
  - Es el único que cumple las tres reglas: QR Bre-B por API, el dinero llega a la Cuenta Bold de la marca y hay dos vías de confirmación automática (webhook firmado y consulta de estado por referencia).
  - Es el más barato de los que tienen API en pedidos típicos: 3,4 % con IVA.
- En contra:
  - **Sus términos chocan con que la plataforma opere las llaves de cada marca**, y sin esas llaves no se puede emitir el QR ni verificar el pago. Sin una aprobación escrita de Bold, la opción no es usable.
  - La API está en beta, la activación de cada marca no tiene plazo y no hay modo de pruebas para QR Bre-B.
  - No está confirmado que el webhook cubra los QR de la API. La consulta de estado tendría que ser la vía principal, no el respaldo.

### B. Pasarela con Bre-B (PayU u OnePay)

- A favor: documentan el cobro con QR Bre-B por API y notifican el pago; son productos en producción.
- En contra:
  - El dinero no llega directo a la marca. PayU recauda y abona después; en OnePay queda en un saldo de OnePay que la marca retira a una cuenta del mismo NIT. Incumple la regla 2.
  - Ninguna documenta un modelo de muchas marcas: cada marca abre su propia cuenta de comercio, y operar esas cuentas desde la plataforma plantea el mismo problema de llaves que Bold, sin confirmar en sus términos.
  - Cuesta más que Bold en los pedidos típicos: 4,8 % (PayU) y 6,5 % (OnePay) en un pedido de $40.000, con IVA.

### C. Confirmación manual

- A favor: costo cero para la marca y nada que integrar.
- En contra:
  - Incumple la regla 3 y la compuerta del MVP: una persona confirma el pago mirando su banco.
  - En hora pico la confirmación puede tardar minutos, y una captura de pantalla no prueba el pago (alerta C de FG-02).
  - Abre la puerta a fraudes con comprobantes falsos.

### D. Mercado Pago

- A favor: es el único con un modelo de muchas marcas documentado (cada marca autoriza a la plataforma por OAuth) y el dinero llega a la cuenta de Mercado Pago de la marca.
- En contra: no tiene Bre-B, así que incumple la regla 1, y cuesta 6,3 % en un pedido de $40.000.

### E. Esperar la regulación

El proyecto PR-DSP-008 sigue en borrador, la referencia de pago es opcional ("cuando esto aplique") y no hay fechas. No sirve para el MVP del 10-dic. Conviene revisarlo cuando se publique la norma, porque una referencia de pago estándar permitiría conciliar sin depender de un proveedor.

### Matriz de decisión

Puntajes de 1 a 5 por juicio de ingeniería; el total es el promedio ponderado. Para A se muestran dos casos, porque depende de la respuesta de Bold.

| Factor (peso) | A. Bold aprobado por escrito | A. Bold sin aprobación | B. PayU u OnePay | C. Manual | D. Mercado Pago |
|---|---|---|---|---|---|
| F1 Cumple las tres reglas (30) | 5 | 1 | 2 | 1 | 2 |
| F2 Costo para la marca (20) | 4 | 4 | 2 | 5 | 2 |
| F3 Riesgo de integración y operación (20) | 2 | 1 | 2 | 3 | 4 |
| F4 Tiempo hasta el MVP (15) | 2 | 2 | 3 | 5 | 4 |
| F5 Experiencia de compra (10) | 4 | 4 | 4 | 1 | 4 |
| F6 Portabilidad (5) | 3 | 3 | 3 | 5 | 3 |
| **Total ponderado** | **3,55** | **2,15** | **2,40** | **3,00** | **2,95** |

**Lectura**:
- Con la aprobación escrita de Bold, A es la mejor opción con margen.
- Sin ella, A queda por debajo de todas, y C (manual) y D (Mercado Pago) quedan casi empatadas: 3,00 frente a 2,95.
- Elegir entre C y D no es un tema técnico. Es decidir qué regla aprobada se relaja: C renuncia a la verificación automática, que es la compuerta del MVP; D renuncia a Bre-B.

## Decisión

Aprobada por el usuario el 2026-10-21, con la confirmación manual como contingencia.

1. **Bold como proveedor, condicionado a su aprobación escrita antes del 31-oct-2026.** La primera consulta (a) es la que decide; las demás afinan el diseño:
    - a. ¿Puede una plataforma, con autorización de cada titular, emitir cobros QR Bre-B y consultar o verificar pagos con las llaves de muchas Cuentas Bold? ¿O existe o existirá un esquema para plataformas?
    - b. ¿El webhook cubre los pagos QR Bre-B creados por la API de pagos en línea, y trae el `reference_id` del pedido?
    - c. ¿Qué llave usa la consulta `GET /v1/payment/{reference_id}`, qué límites tiene, y se puede hacer con una credencial de solo lectura que no sea la llave secreta?
    - d. ¿Cuándo sale la API de beta y cuánto tarda la revisión de activación de cada comercio?
    - e. ¿Cómo se prueba un pago QR Bre-B de punta a punta sin modo de pruebas?
2. **Construir ya el puerto `VerificadorDePagos` con un adaptador simulado**, sin esperar la respuesta. El dominio, la máquina de estados, el webhook y la conciliación quedan probados con el simulador, y el MVP no se atrasa por el proveedor.
3. **Contingencia elegida: confirmación manual (C).** Si Bold no aprueba la consulta (a), o no responde antes del 31-oct-2026, el MVP abre con confirmación manual: cada marca cobra en su propia llave Bre-B y confirma el pago con un botón en Telegram. Se conservan Bre-B y el costo cero para la marca; se renuncia a la verificación automática como compuerta del MVP. La contingencia se implementa con estas protecciones (los tiempos son valores iniciales, ajustables):
    - El pedido queda en `pago_informado` cuando el comprador avisa que pagó, y el comprador ve ese estado en la app hasta que la marca confirma.
    - Solo el botón de confirmación de la marca en Telegram lleva el pedido a `pagado`. El evento queda registrado con la identidad del responsable de la marca como actor humano.
    - Si la marca no confirma en 3 minutos, recibe un recordatorio; a los 10 minutos se alerta a operación comercial (alerta C de FG-02).
    - El puerto `VerificadorDePagos` se mantiene con un adaptador de confirmación manual. Pasar a verificación automática después es cambiar de adaptador, sin tocar el dominio.

    Mercado Pago (D) queda registrada como alternativa considerada y no elegida.
4. **Ajustar R10** para que acepte dos vías equivalentes de confirmación del proveedor: webhook firmado o consulta autenticada del estado. Con Bold, la consulta puede ser la vía principal mientras no se confirme el webhook para QR. En la contingencia manual, la confirmación válida es el botón del responsable de la marca.

### Consecuencias

**Positivas**
- La decisión técnica deja de bloquear: el puerto y el simulador avanzan desde hoy.
- La dependencia crítica (la aprobación de Bold) tiene fecha y una salida decidida de antemano.
- Cambiar de proveedor después es cambiar de adaptador, no de dominio.

**Negativas y riesgos**
- Si se elige Bold, la plataforma custodia llaves de terceros: cifrado, acceso mínimo y un contrato con cada marca que lo autorice, a revisar con el abogado de comercio electrónico y datos.
- Sin modo de pruebas, cada marca se habilita con un pago real de bajo monto.
- Las marcas que sean personas naturales con cuenta de bajo monto quedan topadas en unos $11 millones al mes de movimientos; las que vendan más necesitan una cuenta ordinaria.
- El costo de 3,4 % por pedido lo paga la marca; con 30 pedidos de $40.000 al mes son unos $41.000, frente a la suscripción de $150.000.

**Cambios aplicados en el kernel y el grafo (2026-10-21)**
- Kernel 1.5.0:
  - nueva sección `L1_payment_verification`;
  - `gate_1_to_mvp` ajustada a los dos caminos;
  - PEN-01 decidido, a la espera de la respuesta de Bold antes del 31-oct-2026.
- Grafo v0.6:
  - X7 es Bold, condicionado, con la contingencia manual.
  - P4 suma `cobro_emitido` y `cobro_vencido`; `pago_informado` solo se usa en la contingencia manual.
  - R10 acepta webhook firmado, consulta autenticada y, en la contingencia, el botón del responsable de la marca.
  - T09 se redefine y entran T21 a T23.

### Cómo se confirma

1. Bold responde por escrito las preguntas (a) a (e) antes del 31-oct-2026.
2. El puerto y el adaptador simulado pasan las pruebas de R10:
    - una notificación sin firma válida, con otro monto o de otra marca se rechaza;
    - un evento repetido no duplica efectos.
3. Con la primera marca habilitada, un pago QR real de bajo monto llega a `pagado` por webhook o por consulta en menos de 10 minutos (T09).

## Diseño de integración

Vale para el proveedor que se elija. Lo específico de Bold se marca como tal.

### Puerto en el dominio

El dominio no conoce al proveedor. `packages/ports` define un puerto `VerificadorDePagos` con tres operaciones, y cada proveedor es un adaptador (INV_06):

| Operación | Entrada | Salida |
|---|---|---|
| `emitirCobro` | pedido, marca, monto | referencia del cobro, QR y vencimiento |
| `consultarCobro` | marca, referencia | estado (pendiente, pagado, vencido o rechazado) y monto |
| `validarNotificacion` | marca, encabezados y cuerpo crudo del webhook | notificación normalizada (identificador del evento, referencia, monto, estado) o rechazo |

Cambiar de proveedor es escribir otro adaptador; el dominio, la máquina de estados y las pruebas no cambian.

### Estados del pedido

`creado` → `cobro_emitido` → `pagado` → `aceptado` → `en_camino` → `entregado` → `evaluado`, más `cobro_vencido`, `cancelado` y `reembolsado`. En la contingencia manual se suma `pago_informado`, entre `cobro_emitido` y `pagado`.

- Con verificación automática nadie "informa" un pago: el proveedor lo confirma.
- Si el QR vence sin pago, el pedido pasa a `cobro_vencido` y el comprador puede pedir un cobro nuevo.
- Solo una notificación validada o una consulta al proveedor llevan un pedido a `pagado` (R10). En la contingencia manual, solo el botón del responsable de la marca.

### Webhook de confirmación (E42)

1. Cada marca tiene su propia ruta de webhook. La firma se verifica sobre el cuerpo crudo con el secreto de **esa** marca; si no cuadra, se responde con rechazo y se registra.
2. La referencia debe corresponder a un pedido de esa marca, el monto debe ser igual al del pedido y el estado debe ser aprobado.
3. La clave de idempotencia es el identificador del evento del proveedor (INV_02). Un reintento del mismo evento responde éxito sin repetir efectos.
4. La transición a `pagado` y el evento `PagoConfirmado` se escriben en una transacción corta con `appendCanonicalEvent`. Los avisos a la marca (Telegram) y al comprador (en la app) salen después por el outbox.
5. Se responde rápido; el trabajo pesado no ocurre dentro de la petición del proveedor.

Con Bold:
- La firma viene en `x-bold-signature` (HMAC-SHA256 con la llave secreta de la marca).
- Bold reintenta durante 24 horas, así que la idempotencia del paso 3 es obligatoria.
- Para pagos QR la referencia "puede ser null"; si no viene, el pedido se identifica por la consulta de estado.

### Consulta del estado al proveedor

Es la segunda vía de confirmación, equivalente al webhook. Con Bold puede ser la principal mientras no se confirme que el webhook cubre los QR de la API.

- **Mientras el comprador está en la pantalla de pago**, el servicio `worker` consulta el cobro (`consultarCobro`) cada pocos segundos hasta que se pague o venza (10 minutos con Bold). Así la confirmación aparece apenas ocurre.
- **Al vencer el QR**, una última consulta cubre el pago hecho en el último momento.
- **Si llegan las dos vías**, la que llegue segunda no tiene efecto, gracias a la idempotencia.
- **Carga**: en el pico de 10.000 sesiones hay unos 1,4 cobros nuevos por segundo (modelo de carga). La frecuencia de consulta se ajusta a los límites que confirme el proveedor (pregunta c).

### Credenciales de cada marca

- Las llaves de la API de cada marca se guardan cifradas con una llave maestra que vive en los secretos del host, nunca en texto plano en la base. Tampoco aparecen en registros ni en el contexto de ningún agente (ADR-0002).
- Solo el adaptador de pagos las descifra, y solo en el momento de usarlas.
- Cambiarlas sigue la regla R09: solo el responsable de la marca, con verificación en dos pasos, registro y aviso por Telegram.
- Con Bold, la plataforma solo guarda llaves si Bold lo aprueba por escrito (pregunta a) y si cada marca lo autoriza en su contrato con la plataforma.

### Habilitación de cada marca (E66)

Una marca solo cobra en la plataforma después de completar estos pasos:

1. Abre su cuenta con el proveedor.
2. Activa el cobro por API, con la revisión que haga el proveedor.
3. Entrega sus llaves por un formulario seguro de la plataforma, nunca por chat.
4. Registra en el panel del proveedor la URL del webhook de su marca.
5. Hace un pago real de bajo monto de punta a punta, que debe llegar a `pagado`. Con Bold no hay modo de pruebas para QR Bre-B, así que esta prueba es con dinero real.

Con Bold, una marca que sea persona natural con cuenta de depósito de bajo monto queda topada en 210,5 UVT al mes (unos $11 millones); si espera vender más, abre una cuenta ordinaria.

### Telemetría

- **T09** se redefine: tiempo desde `cobro_emitido` hasta `pagado`.
- **Nuevas**:
  - notificaciones rechazadas (firma inválida, monto o marca distintos);
  - pagos confirmados por consulta y no por webhook (indica webhooks perdidos);
  - cobros vencidos sin pago.

## Fuentes

- **Verificación del 2026-10-21**: enlaces en las tablas de "Hechos verificados".
- **Comparación del 17-oct-2026**: documento maestro (FD-01), pestaña "Proveedores de pago".
  - Tarifas de [PayU](https://rapyd.net/products/pricing), [OnePay](https://onepay.la/pricing), [Wompi](https://wompi.com/es/co/planes-tarifas) y [ePayco](https://epayco.com/tarifas).
- **Decisiones del usuario**: 17-oct-2026 (confirmación manual) y 20-oct-2026 (verificación automática como compuerta del MVP), registradas en el kernel.
