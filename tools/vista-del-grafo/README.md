# Vista interactiva del grafo

Dibuja el grafo operacional como un lienzo de nodos al estilo de un editor de flujos, para entender el sistema sin leer el JSON. Se abre con doble clic en cualquier navegador.

- **Lienzo:** cada nodo con su icono y cada arista con su dirección, coloreadas por tipo (punteadas si son asíncronas). Las notas de color agrupan los nodos según dónde corren: servicio api, servicio agentes, datos, procesos asíncronos y demás.
- **Vistas:** todo el sistema, ruta del pedido, pagos Bre-B, agentes de IA, eventos y gobierno.
- **Recorrido paso a paso de la ruta del pedido.**
- **Ficha de cada nodo y arista:** gobierno, capacidad, conexiones, restricciones de aislamiento, telemetría y carga en el pico, del modelo de carga.

| Archivo | Rol | ¿Se edita a mano? |
|---|---|---|
| `tools/vista-del-grafo/disposicion.mjs` | Posición e icono de cada nodo, carriles de las aristas que van hacia atrás, notas de color, vistas, pasos del recorrido y a qué aplica cada restricción | Sí |
| `tools/vista-del-grafo/plantilla.html` | Página: estilos, dibujo, zoom, panel de detalle y recorrido | Sí |
| `tools/vista-del-grafo/generar.mjs` | Comprueba la disposición contra el grafo y escribe la página | Sí |
| `docs/grafo-operacional.html` | La vista, con los datos del grafo y del modelo de carga incluidos | No: la genera la herramienta |

Los datos salen de `arquitectura/grafo-operacional.json`, `arquitectura/kernel-durable.json` y `arquitectura/modelo-de-carga.resultados.json`. La disposición solo dice cómo dibujarlos.

## Uso

Requiere Node.js 24 o posterior; no tiene dependencias.

```bash
node tools/vista-del-grafo/generar.mjs
```

Escribe `docs/grafo-operacional.html`. Se ejecuta después de cambiar el grafo o de regenerar el modelo de carga, y la página se confirma junto con el cambio.

```bash
node tools/vista-del-grafo/generar.mjs --check
```

No escribe nada. Termina con error si la página no coincide con el grafo y el modelo de carga actuales, o si la disposición no está al día. La integración continua lo corre en cada pull request y en cada cambio de `main`.

```bash
node tools/vista-del-grafo/generar.mjs --fragmento RUTA
```

Escribe además la página sin `<html>` ni `<head>`, que es la forma en que se publica como artefacto de Claude.

## Qué comprueba

Antes de escribir, el generador falla si:

- Un nodo del grafo no tiene posición o icono.
- La disposición cita un nodo, una arista o una restricción que no existe.
- Los pasos del recorrido no cubren exactamente las aristas con `ruta_pedido`, o repiten alguna.

Avisa, sin fallar, de las aristas que van hacia atrás sin carril, porque se dibujan como un lazo que cruza otros nodos.

## Cuando cambia el grafo

- **Nodo nuevo:** se le da posición e icono en `disposicion.mjs`; si corre en un servicio con nota de color, se agrega a esa nota.
- **Arista nueva:** se dibuja sola de la salida de un nodo a la entrada del otro. Si va hacia atrás, se le asigna un carril libre.
- **Cambio en la ruta del pedido:** se actualizan los pasos del recorrido y su texto.
- **Cambio de textos, capacidades o del modelo de carga:** basta con volver a generar la página.
