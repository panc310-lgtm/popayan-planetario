// Disposición de la vista interactiva del grafo: dónde va cada nodo, qué icono lleva, cómo se agrupan
// y qué cuenta cada vista. Los datos (nodos, aristas, capacidades, restricciones, telemetría y carga)
// salen de arquitectura/; aquí solo está lo que el grafo no dice sobre cómo dibujarlo.
// generar.mjs comprueba que todo lo citado aquí exista en el grafo.

// Esquina superior izquierda de la caja de cada nodo, en píxeles del lienzo (2560 × 2100).
// Las cajas miden 84 px y las columnas van cada 250 px.
export const posiciones = {
  X5: [380, 100], X6: [620, 100],
  N0: [1120, 350],
  G5: [80, 550], G4: [620, 550], G1: [1120, 550], G2: [1620, 550], G3: [2120, 550],
  P11: [1120, 860], D2: [1370, 860], P9: [1870, 860],
  P3: [1120, 1050], D4: [1370, 1050], P10: [1870, 1050],
  A1: [80, 1240], P1: [350, 1240], P2: [620, 1240], D1: [1370, 1240], P12: [1870, 1240],
  P4: [1120, 1430], D3: [1370, 1430], P5: [1620, 1430], P6: [1870, 1430], X1: [2120, 1430], A2: [2370, 1430],
  X4: [480, 1460],
  A3: [2120, 1620], P7: [870, 1660], X3: [1370, 1715],
  X2: [210, 1810], X7: [480, 1810], P8: [870, 1850],
};

// Aristas que van hacia atrás o cruzarían cajas: salen a la derecha, recorren un carril horizontal
// y entran por la izquierda. salida y entrada son los px que se separan del nodo antes de girar;
// etiqueta es dónde va el número del paso sobre el carril (0 a 1).
export const carriles = {
  E51: { carril: 712, salida: 24, entrada: 56 }, E52: { carril: 724, salida: 36, entrada: 64 }, E53: { carril: 736, salida: 48, entrada: 72 },
  E46: { carril: 752, salida: 24, entrada: 52 }, E63: { carril: 768, salida: 24, entrada: 24 },
  E50: { carril: 1188, salida: 24, entrada: 24 }, E61: { carril: 1200, salida: 24, entrada: 36 },
  E43: { carril: 1572, salida: 24, entrada: 24, etiqueta: 0.25 }, E44: { carril: 1584, salida: 32, entrada: 32, etiqueta: 0.5 },
  E45: { carril: 1596, salida: 40, entrada: 40, etiqueta: 0.75 },
  E54: { carril: 2010, salida: 56, entrada: 24 }, E41: { carril: 2034, salida: 24, entrada: 24 },
};

// Las aristas de gobierno salen por debajo del nodo y entran por arriba, como las de un subnodo.
export const verticales = { origenes: ["N0", "G1", "G2", "G3", "G4", "G5", "X5", "X6"], aristas: ["E57"] };

// Nodos donde empieza un flujo: se dibujan con el lado izquierdo redondeado.
export const inicio = ["N0", "A1"];

// Notas de color detrás de los nodos, agrupados por dónde corren. ancho_texto evita que el texto
// quede bajo las líneas que cruzan la nota.
export const notas = [
  { nodos: ["X5", "X6"], color: "gray", titulo: "Construcción", texto: "Insumos del mapa y las imágenes; no corren en producción.", ancho_texto: 300 },
  { nodos: ["N0", "G1", "G2", "G3", "G4", "G5"], color: "yellow", titulo: "Organización y gobierno", texto: "N0 y sus cinco áreas. Sus líneas salen por debajo: son de control.", ancho_texto: 360 },
  { nodos: ["A1", "P1"], color: "rose", titulo: "Dispositivo del comprador", texto: "El universo 3D corre en el navegador.", ancho_texto: 118 },
  { nodos: ["P2", "P11", "P3", "P4"], color: "blue", titulo: "Servicio api", texto: "Fastify: entrada única, catálogo, pedidos y Noticias.", ancho_texto: 180 },
  { nodos: ["P7", "P8"], color: "purple", titulo: "Servicio agentes", texto: "Proponen; el dominio decide.", ancho_texto: 140 },
  { nodos: ["D2", "D4", "D1", "D3"], color: "gray", titulo: "Datos", texto: "Supabase, Upstash y R2.", ancho_texto: 140 },
  { nodos: ["P5", "P6", "P9", "P10", "P12"], color: "green", titulo: "Asíncrono", texto: "Eventos, avisos y proyecciones.", ancho_texto: 116 },
  { nodos: ["X1", "A2", "A3"], color: "orange", titulo: "Marcas", texto: "Operan sus pedidos por Telegram.", ancho_texto: 116 },
  { nodos: ["X2", "X7"], color: "amber", titulo: "Pago Bre-B", texto: "El dinero va directo a la marca.", ancho_texto: 200 },
];

// Iconos de trazo en una caja de 24 × 24. Genéricos: ninguno reproduce un logotipo.
const escudo = '<path d="M12 3l7 2.8v5.4c0 4.6-3 8-7 9.8-4-1.8-7-5.2-7-9.8V5.8z"/>';
export const iconos = {
  N0: '<path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z"/><circle cx="12" cy="12" r="3"/>',
  G1: escudo + '<path d="M9 12l2 2 4-4"/>',
  G2: escudo + '<circle cx="12" cy="11.5" r="2.8"/>',
  G3: escudo + '<circle cx="12" cy="9.6" r="1.8"/><path d="M9 15c.6-1.4 1.7-2 3-2s2.4.6 3 2"/>',
  G4: escudo + '<path d="M10.2 9.5L8.4 12l1.8 2.5M13.8 9.5l1.8 2.5-1.8 2.5"/>',
  G5: escudo + '<path d="M8.8 14.5l2.4-2.4 1.6 1.6 2.6-3"/>',
  A1: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-3.6 3.8-5.6 7.5-5.6s6.7 2 7.5 5.6"/>',
  A2: '<path d="M4 9.5L5.5 4h13L20 9.5"/><path d="M4 9.5c0 1.5 1.2 2.5 2.7 2.5s2.6-1 2.6-2.5c0 1.5 1.2 2.5 2.7 2.5s2.7-1 2.7-2.5c0 1.5 1.1 2.5 2.6 2.5S20 11 20 9.5"/><path d="M5.5 12v8h13v-8"/><path d="M10 20v-4.5h4V20"/>',
  A3: '<path d="M12 21s6.5-5.8 6.5-11a6.5 6.5 0 0 0-13 0c0 5.2 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  P1: '<circle cx="12" cy="12" r="5.5"/><ellipse cx="12" cy="12" rx="10.5" ry="3.2" transform="rotate(-22 12 12)"/>',
  P2: '<path d="M3 12h7"/><path d="M14 6h7M14 12h7M14 18h7"/><path d="M10 12l4-6M10 12h4M10 12l4 6"/>',
  P3: '<circle cx="10.5" cy="10.5" r="6"/><path d="M20 20l-5-5"/>',
  P4: '<path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  P5: '<path d="M4 8h14"/><path d="M15 5l3 3-3 3"/><path d="M20 16H6"/><path d="M9 13l-3 3 3 3"/>',
  P6: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  P7: '<path d="M10 3.5l1.6 4.4 4.4 1.6-4.4 1.6L10 15.5l-1.6-4.4L4 9.5l4.4-1.6z"/><path d="M17.5 13.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  P8: '<path d="M4 20l10-10"/><path d="M12.5 8.5l3 3"/><path d="M17 3.5l.7 1.8 1.8.7-1.8.7L17 8.5l-.7-1.8-1.8-.7 1.8-.7z"/>',
  P9: '<path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  P10: '<path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6z"/>',
  P11: '<rect x="4" y="4.5" width="16" height="15" rx="2"/><path d="M8 9h8M8 12.5h8M8 16h5"/>',
  P12: '<path d="M3 12h4l2.5-6.5 5 13L17 12h4"/>',
  D1: '<ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6"/><path d="M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8"/>',
  D2: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  D3: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h2M4 12h2M4 18h2"/>',
  D4: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
  X1: '<path d="M20.5 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.6A8 8 0 1 1 20.5 11.5z"/><path d="M8.5 11.5h7M8.5 8.5h5"/>',
  X2: '<path d="M3 9.5L12 4l9 5.5"/><path d="M5 10v7M9.7 10v7M14.3 10v7M19 10v7"/><path d="M3 20h18"/>',
  X3: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3"/>',
  X4: '<circle cx="8" cy="15" r="4"/><path d="M10.9 12.1L20 3"/><path d="M16.5 6.5l2.5 2.5M14.5 8.5l2 2"/>',
  X5: '<path d="M3.5 6.5l5.5-2.5 6 2.5 5.5-2.5v13.5l-5.5 2.5-6-2.5-5.5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  X6: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18l5-4.5 3.5 3 3-2.5 4.5 4"/>',
  X7: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/>',
};

// Vistas de la barra superior. Cada una muestra una lista de aristas o las que cumplen un criterio:
// todo, ruta_pedido (las marcadas en el grafo) o vertical (las de gobierno).
export const vistas = [
  { id: "todo", nombre: "Todo el sistema", criterio: "todo",
    desc: "Cada caja es un nodo del grafo y cada línea, una arista: sale por la derecha de un nodo y entra por la izquierda del siguiente. Las notas de color agrupan los nodos según dónde corren." },
  { id: "pedido", nombre: "Ruta del pedido", criterio: "ruta_pedido",
    desc: "Las aristas que el grafo marca como ruta del pedido. El comprador paga a la marca por Bre-B, Bold confirma el pago, la marca opera el pedido por Telegram y el comprador ve cada estado en la app. Los números dan el orden del recorrido." },
  { id: "pagos", nombre: "Pagos Bre-B", aristas: ["E40", "E41", "E62", "E42", "E66"],
    desc: "Cómo se mueve el dinero y quién lo confirma (ADR-0003). El dinero va del banco del comprador a la llave Bre-B de la marca; Bold solo detecta y confirma el pago. Si Bold no lo aprueba por escrito antes del 31-oct-2026, la marca confirma con un botón en Telegram." },
  { id: "agentes", nombre: "Agentes de IA", aristas: ["E29", "E30", "E31", "E32", "E54", "E55", "E56", "E14"],
    desc: "Los agentes de IA (ADR-0002). El del usuario busca, organiza Mi universo y arma borradores de pedido; el de marca propone landings en la fase 2. Ninguno paga ni confirma pedidos; proponen comandos y el dominio decide." },
  { id: "eventos", nombre: "Eventos", aristas: ["E35", "E36", "E37", "E47", "E48", "E49", "E63", "E51", "E52", "E53"],
    desc: "Del registro planetario_events al bus y a sus consumidores. Cada hecho confirmado se escribe una vez, en la misma transacción que el estado, y desde ahí se reparte a Telegram, reputación, fidelidad, telemetría y al comprador." },
  { id: "gobierno", nombre: "Gobierno", criterio: "vertical",
    desc: "El núcleo N0 delega en cinco áreas, que gobiernan servicios, marcas y proveedores. Estas líneas salen por debajo de cada nodo, como las conexiones de un subnodo. Incluye los insumos de construcción del mapa y las imágenes." },
];

// Orden del recorrido de la ruta del pedido. Debe cubrir exactamente las aristas con ruta_pedido.
export const pasos = [
  ["E33", "La API crea el pedido y aplica sus transiciones: creado y cobro emitido."],
  ["E34", "Pedidos escribe el estado en la base, con la versión del pedido."],
  ["E35", "En la misma transacción, el evento entra a planetario_events."],
  ["E40", "El comprador paga desde su banco a la llave Bre-B de la marca. Mientras tanto ve las instrucciones de pago y el pedido espera 30 minutos."],
  ["E41", "El dinero llega directo a la cuenta de la marca; la plataforma no lo toca."],
  ["E62", "Bold detecta el pago Bre-B en la Cuenta Bold de la marca. En la contingencia manual este paso no existe: la marca confirma con un botón."],
  ["E42", "Bold confirma con un webhook firmado o por consulta autenticada del cobro. Solo así el pedido pasa a pagado (R10)."],
  ["E36", "El relay lleva el evento confirmado de planetario_events al bus."],
  ["E37", "El bus entrega el evento al notificador de Telegram."],
  ["E38", "El notificador envía el mensaje con botones inline a la Bot API de Telegram."],
  ["E39", "La marca recibe el pedido pagado en su chat de Telegram."],
  ["E63", "El comprador ve el nuevo estado dentro de la app, sin Telegram ni WhatsApp."],
  ["E43", "La marca acepta el pedido con un botón."],
  ["E46", "Telegram envía la respuesta del botón al webhook de la API, que descarta duplicados por update_id y aplica la transición."],
  ["E44", "La marca indica que el pedido salió."],
  ["E45", "La marca confirma la entrega a domicilio. Cada botón vuelve a pasar por la API, Pedidos y el registro de eventos."],
];

// Nodos y aristas a los que se aplica cada restricción de aislamiento, según el texto de la regla.
export const restricciones = {
  R01: ["D1"], R02: ["A2", "A3", "E57"], R03: ["A2"], R04: ["P3", "P9"], R05: ["P8"], R06: ["A2", "P4"],
  R07: ["X1", "P2", "E46"], R08: ["D2", "E60"], R09: ["A2"], R10: ["P4", "X7", "E42"],
};
