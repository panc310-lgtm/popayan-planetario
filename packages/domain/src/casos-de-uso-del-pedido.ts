// Casos de uso del pedido sobre los puertos. Cada uno sigue INV_05: lectura corta → llamada al proveedor sin
// transacción abierta → escritura corta. Ω se evalúa antes de cada comando (rule_01) y cada transición escribe su
// evento canónico en la misma transacción que el estado (E35, rule_03).
import type { Actor, EventoCanonico, Id, Pedido, UuidV7, VistaDePedidoParaMarca } from "@planetario/contracts";
import type {
  ClockPort,
  ConfiguracionDePagosPort,
  IdGeneratorPort,
  MasterWriteDatabasePort,
  MotivoDeRechazo,
  TransaccionDeEscritura,
  VerificadorDePagos,
} from "@planetario/ports";
import { proyectarPedidoParaMarca } from "./brand-visibility-firewall.ts";
import type { DatosDeContactoDelComprador } from "./brand-visibility-firewall.ts";
import { claveDeIdempotencia } from "./idempotencia.ts";
import type { FuenteDeIdempotencia } from "./idempotencia.ts";
import { aplicarComando, autorizarComando, crearPedido } from "./order-state-machine.ts";
import type { ComandoDelPedido, DatosDelPedidoNuevo, EventoDelPedido } from "./order-state-machine.ts";
import { evaluarOmega } from "./policy-gate-omega.ts";
import type { MotivoOmega } from "./policy-gate-omega.ts";

export type DependenciasDelPedido = {
  escritura: MasterWriteDatabasePort;
  reloj: ClockPort;
  ids: IdGeneratorPort;
  verificador: VerificadorDePagos;
  configuracionDePagos: ConfiguracionDePagosPort;
};

export type ResultadoDelCasoDeUso =
  | { tipo: "aplicada"; pedido: Pedido; evento: EventoCanonico }
  | { tipo: "sin_efecto"; motivo: "pago_ya_confirmado" | "evento_repetido" | "cobro_pendiente" }
  /** Ω = 0: la transacción no se ejecutó; el llamador la registra en T12. */
  | { tipo: "bloqueada_por_omega"; motivo: MotivoOmega; detalle: string }
  /** Rechazo del adaptador de pagos antes de tocar la base (ADR-0003, telemetría de notificaciones rechazadas). */
  | { tipo: "notificacion_rechazada"; motivoRechazo: MotivoDeRechazo }
  | { tipo: "rechazada"; motivo: string; detalle: string };

/** La transacción se revierte: otro proceso cambió el pedido entre la lectura y la escritura. */
export class ConflictoDeVersion extends Error {
  readonly pedidoId: UuidV7;
  constructor(pedidoId: UuidV7) {
    super(`El pedido ${pedidoId} cambió de versión durante la transacción`);
    this.name = "ConflictoDeVersion";
    this.pedidoId = pedidoId;
  }
}

/**
 * Clave del evento: la de la fuente (INV_02) más el tipo de evento, porque una misma petición puede producir dos
 * eventos (crear el pedido y emitir su cobro). Formato propuesto en S19.
 */
export function claveDelEvento(fuente: FuenteDeIdempotencia, tipoDeEvento: string): string {
  return `${claveDeIdempotencia(fuente)}/${tipoDeEvento}`;
}

function eventoCanonico(ids: IdGeneratorPort, evento: EventoDelPedido, pedido: Pedido, actor: Actor, fuente: FuenteDeIdempotencia, ocurridoEn: string): EventoCanonico {
  return {
    event_id: ids.nuevoUuidV7(),
    idempotency_key: claveDelEvento(fuente, evento.tipo),
    tipo: evento.tipo,
    agregado: { tipo: "pedido", id: pedido.pedido_id },
    marca_id: pedido.marca_id,
    actor,
    ocurrido_en: ocurridoEn,
    payload: evento.payload,
  };
}

/** Transacción corta: lee el pedido para decidir (S2), evalúa Ω, aplica el comando y escribe estado y evento juntos. */
async function ejecutarComando(
  deps: DependenciasDelPedido,
  localizar: (tx: TransaccionDeEscritura) => Promise<Pedido | null>,
  comando: ComandoDelPedido,
  actor: Actor,
  fuente: FuenteDeIdempotencia,
): Promise<ResultadoDelCasoDeUso> {
  return deps.escritura.enTransaccion(async (tx) => {
    const pedido = await localizar(tx);
    if (pedido === null) return { tipo: "rechazada", motivo: "pedido_inexistente", detalle: "no hay un pedido de esa marca con ese identificador o cobro" };
    const omega = evaluarOmega({ actor, comando: comando.tipo, marcaDelRecurso: pedido.marca_id });
    if (omega.omega === 0) return { tipo: "bloqueada_por_omega", motivo: omega.motivo, detalle: omega.detalle };
    const instante = deps.reloj.ahora();
    const resultado = aplicarComando(pedido, comando, actor, instante.iso);
    if (resultado.tipo === "sin_efecto") return resultado;
    if (resultado.tipo === "rechazada") return { tipo: "rechazada", motivo: resultado.motivo, detalle: resultado.detalle };
    const evento = eventoCanonico(deps.ids, resultado.evento, resultado.pedido, actor, fuente, instante.iso);
    const append = await tx.ledger.appendCanonicalEvent(evento);
    if (append.resultado === "duplicado") return { tipo: "sin_efecto", motivo: "evento_repetido" };
    if (append.resultado === "conflicto") return { tipo: "rechazada", motivo: "clave_reutilizada", detalle: `la clave ${evento.idempotency_key} ya existe con otro contenido (INV_02)` };
    if ((await tx.guardarPedido(resultado.pedido, pedido.version)) === "version_distinta") throw new ConflictoDeVersion(pedido.pedido_id);
    return { tipo: "aplicada", pedido: resultado.pedido, evento };
  });
}

const porId = (pedidoId: UuidV7) => (tx: TransaccionDeEscritura) => tx.leerPedidoParaDecidir(pedidoId);

/** El comprador confirma su pedido desde la interfaz, con su sesión (ADR-0002). Ningún agente llega aquí (Ω). */
export async function registrarPedido(
  deps: DependenciasDelPedido,
  datos: DatosDelPedidoNuevo,
  actor: Actor,
  fuente: FuenteDeIdempotencia,
): Promise<ResultadoDelCasoDeUso> {
  const omega = evaluarOmega({ actor, comando: "crearPedido", marcaDelRecurso: datos.marcaId });
  if (omega.omega === 0) return { tipo: "bloqueada_por_omega", motivo: omega.motivo, detalle: omega.detalle };
  if (actor.tipo !== "comprador" || actor.comprador_id !== datos.compradorId) {
    return { tipo: "rechazada", motivo: "actor_no_autorizado", detalle: "solo el comprador crea su propio pedido" };
  }
  const modo = await deps.configuracionDePagos.modoDeConfirmacion(datos.marcaId);
  const instante = deps.reloj.ahora();
  const creacion = crearPedido(deps.ids.nuevoUuidV7(), datos, modo, instante.iso);
  if (creacion.tipo === "rechazado") return { tipo: "rechazada", motivo: creacion.motivo, detalle: creacion.detalle };
  const evento = eventoCanonico(deps.ids, creacion.evento, creacion.pedido, actor, fuente, instante.iso);
  return deps.escritura.enTransaccion(async (tx) => {
    const append = await tx.ledger.appendCanonicalEvent(evento);
    if (append.resultado === "duplicado") return { tipo: "sin_efecto", motivo: "evento_repetido" };
    if (append.resultado === "conflicto") return { tipo: "rechazada", motivo: "clave_reutilizada", detalle: `la clave ${evento.idempotency_key} ya existe con otro contenido (INV_02)` };
    await tx.insertarPedido(creacion.pedido);
    return { tipo: "aplicada", pedido: creacion.pedido, evento };
  });
}

/** Emite el cobro (o uno nuevo tras el vencimiento). El proveedor se llama entre dos transacciones cortas (INV_05). */
export async function emitirCobroDelPedido(deps: DependenciasDelPedido, pedidoId: UuidV7, actor: Actor, fuente: FuenteDeIdempotencia): Promise<ResultadoDelCasoDeUso> {
  const lectura = await deps.escritura.enTransaccion(async (tx) => tx.leerPedidoParaDecidir(pedidoId));
  if (lectura === null) return { tipo: "rechazada", motivo: "pedido_inexistente", detalle: `no existe el pedido ${pedidoId}` };
  const omega = evaluarOmega({ actor, comando: "emitirCobro", marcaDelRecurso: lectura.marca_id });
  if (omega.omega === 0) return { tipo: "bloqueada_por_omega", motivo: omega.motivo, detalle: omega.detalle };
  // Antes del efecto externo: no se llama al proveedor por un comando que la máquina de estados rechazaría.
  const guarda = autorizarComando(lectura, "emitirCobro", actor);
  if (guarda !== null) return { tipo: "rechazada", motivo: guarda.motivo, detalle: guarda.detalle };
  const cobro = await deps.verificador.emitirCobro({
    pedidoId,
    marcaId: lectura.marca_id,
    montoCop: lectura.monto_cop,
    // Un reintento de este mismo intento recibe el mismo cobro; un cobro nuevo tras el vencimiento sube de versión.
    llaveIdempotencia: `${pedidoId}:v${lectura.version}`,
  });
  return ejecutarComando(
    deps,
    porId(pedidoId),
    { tipo: "emitirCobro", cobro: { referencia_cobro: cobro.referenciaCobro, qr_payload: cobro.qrPayload, vence_en: cobro.venceEn } },
    actor,
    fuente,
  );
}

/** Webhook del proveedor (E42). La firma se valida sin transacción; solo una notificación válida abre la escritura. */
export async function procesarNotificacionDePago(
  deps: DependenciasDelPedido,
  entrada: { marcaId: Id; encabezados: Readonly<Record<string, string>>; cuerpoCrudo: string },
): Promise<ResultadoDelCasoDeUso> {
  const notificacion = await deps.verificador.validarNotificacion(entrada);
  if (!notificacion.valida) return { tipo: "notificacion_rechazada", motivoRechazo: notificacion.motivoRechazo };
  const proveedor = deps.verificador.proveedor;
  return ejecutarComando(
    deps,
    (tx) => tx.leerPedidoPorCobroParaDecidir({ marcaId: entrada.marcaId, referenciaCobro: notificacion.referenciaCobro }),
    { tipo: "confirmarPago", evidencia: { via: "notificacion", marcaId: entrada.marcaId, notificacion } },
    { tipo: "proveedor_pagos", proveedor },
    { tipo: "proveedor_pago", proveedor, eventoProveedorId: notificacion.eventoProveedorId },
  );
}

/**
 * Consulta autenticada del cobro (segunda vía de R10), mientras el comprador espera o al vencer el QR: si el
 * proveedor dice pagado, confirma; si dice vencido, vence el cobro; si sigue pendiente, no cambia nada.
 */
export async function consultarCobroDelPedido(deps: DependenciasDelPedido, pedidoId: UuidV7): Promise<ResultadoDelCasoDeUso> {
  const lectura = await deps.escritura.enTransaccion(async (tx) => tx.leerPedidoParaDecidir(pedidoId));
  if (lectura === null) return { tipo: "rechazada", motivo: "pedido_inexistente", detalle: `no existe el pedido ${pedidoId}` };
  if (lectura.cobro === null) return { tipo: "rechazada", motivo: "sin_cobro", detalle: "el pedido no tiene cobro emitido" };
  const referenciaCobro = lectura.cobro.referencia_cobro;
  const consulta = await deps.verificador.consultarCobro({ marcaId: lectura.marca_id, referenciaCobro });
  const proveedor = deps.verificador.proveedor;
  const actor: Actor = { tipo: "sistema", tarea: "consulta-de-cobro" };
  if (consulta.estado === "pagado") {
    return ejecutarComando(
      deps,
      porId(pedidoId),
      { tipo: "confirmarPago", evidencia: { via: "consulta", marcaId: lectura.marca_id, referenciaCobro, consulta } },
      actor,
      { tipo: "consulta_cobro", proveedor, referenciaCobro },
    );
  }
  if (consulta.estado === "vencido") {
    return ejecutarComando(deps, porId(pedidoId), { tipo: "vencerCobro" }, actor, { tipo: "sistema", tarea: "vencer-cobro", recursoId: referenciaCobro });
  }
  return { tipo: "sin_efecto", motivo: "cobro_pendiente" };
}

/**
 * Comandos de una persona sobre su pedido: informar el pago (contingencia), confirmarlo con el botón del responsable
 * de la marca (contingencia, R10), los pasos de la marca (E43 a E45), evaluar, cancelar y registrar el reembolso.
 */
export async function aplicarComandoDePersona(
  deps: DependenciasDelPedido,
  pedidoId: UuidV7,
  comando: Exclude<ComandoDelPedido, { tipo: "emitirCobro" | "vencerCobro" }>,
  actor: Actor,
  fuente: FuenteDeIdempotencia,
): Promise<ResultadoDelCasoDeUso> {
  if (comando.tipo === "confirmarPago" && comando.evidencia.via !== "boton_marca") {
    return { tipo: "rechazada", motivo: "evidencia_invalida", detalle: "la confirmación del proveedor entra por el webhook o la consulta" };
  }
  return ejecutarComando(deps, porId(pedidoId), comando, actor, fuente);
}

export type ResultadoDeVista = { tipo: "lista"; vista: VistaDePedidoParaMarca } | { tipo: "bloqueada"; motivo: string; detalle: string };

/** Vista que el despachador del outbox envía a la marca por TelegramBrandPort: cortafuegos (R03) más Ω. */
export function vistaParaLaMarca(pedido: Pedido, comprador: DatosDeContactoDelComprador, actor: Actor): ResultadoDeVista {
  const proyeccion = proyectarPedidoParaMarca(pedido, comprador);
  if (proyeccion.tipo === "rechazada") return { tipo: "bloqueada", motivo: proyeccion.motivo, detalle: proyeccion.detalle };
  const omega = evaluarOmega({ actor, comando: "enviarPedidoALaMarca", marcaDelRecurso: pedido.marca_id, camposHaciaLaMarca: Object.keys(proyeccion.vista) });
  if (omega.omega === 0) return { tipo: "bloqueada", motivo: omega.motivo, detalle: omega.detalle };
  return { tipo: "lista", vista: proyeccion.vista };
}
