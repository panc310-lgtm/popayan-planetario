// Máquina de estados del pedido (P4, ADR-0003, R10). Funciones puras: mismas entradas, misma salida.
// La tabla de transiciones es la de @planetario/contracts; aquí se aplican sus guardas.
import { ESTADOS_CON_PAGO_CONFIRMADO, TIPOS_DE_EVENTO_DEL_PEDIDO, TRANSICIONES } from "@planetario/contracts";
import type {
  Actor,
  CamposPorModalidad,
  Cobro,
  Evaluacion,
  FechaHora,
  GalaxiaId,
  Id,
  Item,
  ModoDeConfirmacion,
  Pedido,
  Transicion,
  UuidV7,
} from "@planetario/contracts";
import type { NotificacionValida, ResultadoConsultaCobro } from "@planetario/ports";

/** Las únicas pruebas que llevan un pedido a pagado (R10). */
export type EvidenciaDePago =
  /** Webhook con firma verificada por el adaptador con el secreto de la marca de la ruta. */
  | { via: "notificacion"; marcaId: Id; notificacion: NotificacionValida }
  /** Consulta autenticada del estado del cobro al proveedor. */
  | { via: "consulta"; marcaId: Id; referenciaCobro: Id; consulta: ResultadoConsultaCobro }
  /** Contingencia manual: el botón del responsable de la marca en Telegram, con el chat ya validado (R07). */
  | { via: "boton_marca" };

export type ComandoDelPedido =
  | { tipo: "emitirCobro"; cobro: Cobro }
  | { tipo: "vencerCobro" }
  | { tipo: "informarPago" }
  | { tipo: "confirmarPago"; evidencia: EvidenciaDePago }
  | { tipo: "aceptar" }
  | { tipo: "despachar" }
  | { tipo: "entregar" }
  | { tipo: "evaluar"; evaluacion: Evaluacion }
  | { tipo: "cancelar"; motivo?: string }
  | { tipo: "registrarReembolso" };

export type EventoDelPedido = { tipo: string; payload: Record<string, unknown> };

export type MotivoDeRechazoDelPedido = "transicion_invalida" | "actor_no_autorizado" | "evidencia_invalida" | "evaluacion_invalida";

export type ResultadoDeTransicion =
  | { tipo: "aplicada"; pedido: Pedido; evento: EventoDelPedido }
  /** La segunda vía de confirmación del mismo cobro no tiene efecto (ADR-0003). */
  | { tipo: "sin_efecto"; motivo: "pago_ya_confirmado" }
  | { tipo: "rechazada"; motivo: MotivoDeRechazoDelPedido; detalle: string };

const rechazo = (motivo: MotivoDeRechazoDelPedido, detalle: string): ResultadoDeTransicion => ({ tipo: "rechazada", motivo, detalle });

/** El actor es dueño del pedido: el comprador que lo hizo o el responsable de su marca. */
function actorSobreSuPedido(actor: Actor, pedido: Pedido): boolean {
  if (actor.tipo === "comprador") return actor.comprador_id === pedido.comprador_id;
  if (actor.tipo === "responsable_marca") return actor.marca_id === pedido.marca_id;
  return true;
}

function buscarTransicion(pedido: Pedido, comando: ComandoDelPedido["tipo"], actor: Actor): Transicion | MotivoDeRechazoDelPedido {
  const posibles = TRANSICIONES.filter(
    (t) => t.comando === comando && t.desde.includes(pedido.estado) && (t.modo === undefined || t.modo === pedido.modo_confirmacion),
  );
  if (posibles.length === 0) return "transicion_invalida";
  return posibles.find((t) => t.actores.includes(actor.tipo)) ?? "actor_no_autorizado";
}

/** R10: la evidencia corresponde al cobro de este pedido, de esta marca, por el monto exacto y en estado pagado. */
function evidenciaValida(pedido: Pedido, evidencia: EvidenciaDePago, modo: ModoDeConfirmacion): string | null {
  if (modo === "contingencia_manual") {
    return evidencia.via === "boton_marca" ? null : "en la contingencia manual solo confirma el botón del responsable de la marca";
  }
  if (evidencia.via === "boton_marca") return "con verificación automática solo confirma el proveedor";
  if (evidencia.marcaId !== pedido.marca_id) return "la confirmación llegó por la ruta de otra marca";
  if (pedido.cobro === null) return "el pedido no tiene cobro emitido";
  const { referenciaCobro, montoCop, estado } =
    evidencia.via === "notificacion"
      ? evidencia.notificacion
      : { referenciaCobro: evidencia.referenciaCobro, montoCop: evidencia.consulta.montoCop, estado: evidencia.consulta.estado };
  if (referenciaCobro !== pedido.cobro.referencia_cobro) return "la referencia no es la del cobro del pedido";
  if (montoCop !== pedido.monto_cop) return `el monto confirmado (${montoCop}) no es el del pedido (${pedido.monto_cop})`;
  if (estado !== "pagado") return `el proveedor informa el cobro como ${estado}`;
  return null;
}

/** Una segunda confirmación del mismo cobro, ya pagado, no tiene efecto; una de otro cobro se rechaza. */
function confirmacionRepetida(pedido: Pedido, evidencia: EvidenciaDePago, actor: Actor): ResultadoDeTransicion {
  if (evidencia.via === "boton_marca") {
    return actor.tipo === "responsable_marca" && actor.marca_id === pedido.marca_id
      ? { tipo: "sin_efecto", motivo: "pago_ya_confirmado" }
      : rechazo("actor_no_autorizado", "solo el responsable de la marca confirma en la contingencia");
  }
  const referencia = evidencia.via === "notificacion" ? evidencia.notificacion.referenciaCobro : evidencia.referenciaCobro;
  if (evidencia.marcaId === pedido.marca_id && pedido.cobro !== null && referencia === pedido.cobro.referencia_cobro) {
    return { tipo: "sin_efecto", motivo: "pago_ya_confirmado" };
  }
  return rechazo("evidencia_invalida", "la confirmación no corresponde al cobro de este pedido");
}

function evaluacionValida(pedido: Pedido, e: Evaluacion): string | null {
  const nota = (n: number | undefined) => n === undefined || (Number.isInteger(n) && n >= 1 && n <= 5);
  if (![e.atencion, e.producto, e.precio, e.distribucion].every(nota)) return "cada calificación va de 1 a 5";
  const conDomicilio = pedido.modalidad === "domicilio";
  if (conDomicilio && e.distribucion === undefined) return "con domicilio se califica también la distribución";
  if (!conDomicilio && e.distribucion !== undefined) return "la distribución solo se califica con domicilio";
  return null;
}

/** Aplica un comando al pedido. No lee el reloj: `ocurridoEn` llega del ClockPort del caso de uso. */
export function aplicarComando(pedido: Pedido, comando: ComandoDelPedido, actor: Actor, ocurridoEn: FechaHora): ResultadoDeTransicion {
  if (comando.tipo === "confirmarPago" && ESTADOS_CON_PAGO_CONFIRMADO.includes(pedido.estado)) {
    return confirmacionRepetida(pedido, comando.evidencia, actor);
  }
  const transicion = buscarTransicion(pedido, comando.tipo, actor);
  if (typeof transicion === "string") {
    return rechazo(transicion, `${comando.tipo} desde ${pedido.estado} (modo ${pedido.modo_confirmacion}) por ${actor.tipo}`);
  }
  if (!actorSobreSuPedido(actor, pedido)) return rechazo("actor_no_autorizado", "el actor no es dueño de este pedido");

  const extra: Record<string, unknown> = {};
  let cobro = pedido.cobro;
  switch (comando.tipo) {
    case "emitirCobro":
      cobro = comando.cobro;
      extra.referencia_cobro = comando.cobro.referencia_cobro;
      extra.vence_en = comando.cobro.vence_en;
      break;
    case "confirmarPago": {
      const error = evidenciaValida(pedido, comando.evidencia, pedido.modo_confirmacion);
      if (error !== null) return rechazo("evidencia_invalida", error);
      extra.via = comando.evidencia.via;
      extra.referencia_cobro = pedido.cobro?.referencia_cobro ?? null;
      extra.monto_cop = pedido.monto_cop;
      if (comando.evidencia.via === "notificacion") extra.evento_proveedor_id = comando.evidencia.notificacion.eventoProveedorId;
      break;
    }
    case "evaluar": {
      const error = evaluacionValida(pedido, comando.evaluacion);
      if (error !== null) return rechazo("evaluacion_invalida", error);
      extra.evaluacion = { ...comando.evaluacion };
      break;
    }
    case "cancelar":
      if (comando.motivo !== undefined) extra.motivo = comando.motivo;
      break;
    default:
      break;
  }

  const nuevo: Pedido = { ...pedido, estado: transicion.hacia, version: pedido.version + 1, cobro, actualizado_en: ocurridoEn };
  return {
    tipo: "aplicada",
    pedido: nuevo,
    evento: {
      tipo: TIPOS_DE_EVENTO_DEL_PEDIDO[comando.tipo],
      payload: { pedido_id: pedido.pedido_id, estado_anterior: pedido.estado, estado_nuevo: transicion.hacia, version: nuevo.version, ...extra },
    },
  };
}

export type DatosDelPedidoNuevo = {
  compradorId: Id;
  marcaId: Id;
  galaxiaId: GalaxiaId;
  items: Item[];
  modoConfirmacion: ModoDeConfirmacion;
} & CamposPorModalidad;

export type MotivoDeRechazoAlCrear = "sin_items" | "varias_marcas" | "item_invalido" | "datos_de_modalidad";

export type ResultadoDeCreacion =
  | { tipo: "creado"; pedido: Pedido; evento: EventoDelPedido }
  | { tipo: "rechazado"; motivo: MotivoDeRechazoAlCrear; detalle: string };

/** Crea un pedido de una sola marca (sin carrito combinado). El monto lo calcula el dominio, nunca lo trae el cliente. */
export function crearPedido(pedidoId: UuidV7, datos: DatosDelPedidoNuevo, ocurridoEn: FechaHora): ResultadoDeCreacion {
  if (datos.items.length === 0) return { tipo: "rechazado", motivo: "sin_items", detalle: "un pedido necesita al menos un ítem" };
  const otras = datos.items.filter((i) => i.marca_id !== datos.marcaId);
  if (otras.length > 0) return { tipo: "rechazado", motivo: "varias_marcas", detalle: "todos los ítems deben ser de la marca del pedido" };
  const invalido = datos.items.find(
    (i) => !Number.isInteger(i.cantidad) || i.cantidad < 1 || !Number.isInteger(i.precio_unitario_cop) || i.precio_unitario_cop < 1,
  );
  if (invalido) return { tipo: "rechazado", motivo: "item_invalido", detalle: `ítem ${invalido.producto_id}: cantidad y precio deben ser enteros positivos` };

  let campos: CamposPorModalidad;
  if (datos.modalidad === "domicilio") {
    if (!datos.direccion_entrega?.direccion) return { tipo: "rechazado", motivo: "datos_de_modalidad", detalle: "domicilio exige dirección de entrega" };
    campos = { modalidad: "domicilio", direccion_entrega: datos.direccion_entrega };
  } else if (datos.modalidad === "pedido_anticipado") {
    if (!datos.hora_estimada_llegada) return { tipo: "rechazado", motivo: "datos_de_modalidad", detalle: "el pedido anticipado exige la hora estimada de llegada (S20)" };
    campos = { modalidad: "pedido_anticipado", hora_estimada_llegada: datos.hora_estimada_llegada };
  } else {
    campos = { modalidad: "recogida_en_establecimiento" };
  }

  const monto = datos.items.reduce((suma, i) => suma + i.cantidad * i.precio_unitario_cop, 0);
  const pedido: Pedido = {
    pedido_id: pedidoId,
    comprador_id: datos.compradorId,
    marca_id: datos.marcaId,
    galaxia_id: datos.galaxiaId,
    ...campos,
    items: datos.items.map((i) => ({ ...i })),
    monto_cop: monto,
    estado: "creado",
    version: 0,
    modo_confirmacion: datos.modoConfirmacion,
    cobro: null,
    creado_en: ocurridoEn,
    actualizado_en: ocurridoEn,
  };
  return {
    tipo: "creado",
    pedido,
    evento: {
      tipo: TIPOS_DE_EVENTO_DEL_PEDIDO.crear,
      // Sin pedido_id, que va en el agregado: un reintento con la misma clave genera otro identificador, y la
      // comparación del contenido (INV_02) debe reconocerlo como el mismo pedido.
      payload: { estado_nuevo: "creado", version: 0, marca_id: pedido.marca_id, modalidad: pedido.modalidad, monto_cop: monto, items: pedido.items.map((i) => ({ variante_id: i.variante_id, cantidad: i.cantidad })) },
    },
  };
}
