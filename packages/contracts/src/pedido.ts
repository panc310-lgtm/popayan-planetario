// Tipos y tabla de transiciones de ../schemas/order-state-machine.schema.json (P4, ADR-0003).
import type { FechaHora, GalaxiaId, Id, UuidV7 } from "./comunes.ts";
import type { TipoDeActor } from "./evento.ts";

export const ESTADOS_DEL_PEDIDO = [
  "creado",
  "cobro_emitido",
  "cobro_vencido",
  "pago_informado",
  "pagado",
  "aceptado",
  "en_camino",
  "entregado",
  "evaluado",
  "cancelado",
  "reembolsado",
] as const;
export type EstadoDelPedido = (typeof ESTADOS_DEL_PEDIDO)[number];

/** Tres modalidades de compra (kernel N5_FULFILLMENT_SERVICES). Los servicios van aparte: SolicitudDeServicio. */
export const MODALIDADES = ["domicilio", "recogida_en_establecimiento", "pedido_anticipado"] as const;
export type Modalidad = (typeof MODALIDADES)[number];

export const MODOS_DE_CONFIRMACION = ["automatica", "contingencia_manual"] as const;
export type ModoDeConfirmacion = (typeof MODOS_DE_CONFIRMACION)[number];

export type Item = {
  producto_id: Id;
  variante_id: Id;
  marca_id: Id;
  nombre: string;
  cantidad: number;
  precio_unitario_cop: number;
};

export type DireccionEntrega = { direccion: string; barrio?: string; indicaciones?: string };

export type Cobro = { referencia_cobro: Id; qr_payload: string; vence_en: FechaHora };

type PedidoBase = {
  pedido_id: UuidV7;
  comprador_id: Id;
  /** Una sola marca por pedido. */
  marca_id: Id;
  galaxia_id: GalaxiaId;
  items: Item[];
  monto_cop: number;
  estado: EstadoDelPedido;
  version: number;
  modo_confirmacion: ModoDeConfirmacion;
  cobro: Cobro | null;
  creado_en: FechaHora;
  actualizado_en: FechaHora;
};

/** La dirección solo existe en domicilio (R03); la hora estimada de llegada solo en pedido anticipado (S20, propuesto). */
export type CamposPorModalidad =
  | { modalidad: "domicilio"; direccion_entrega: DireccionEntrega }
  | { modalidad: "recogida_en_establecimiento" }
  | { modalidad: "pedido_anticipado"; hora_estimada_llegada: FechaHora };

export type Pedido = PedidoBase & CamposPorModalidad;

export type Evaluacion = { atencion: number; producto: number; precio: number; distribucion?: number };

/** Lo único que la marca recibe del comprador en Telegram (R03, brand_visibility_firewall). */
export type VistaDePedidoParaMarca = {
  pedido_id: UuidV7;
  marca_id: Id;
  estado: EstadoDelPedido;
  comprador: { nombre: string; celular: string };
  items: Item[];
  monto_cop: number;
} & CamposPorModalidad;

/** Campos de primer nivel que puede llevar una proyección hacia la marca (R03). */
export const CAMPOS_PERMITIDOS_HACIA_LA_MARCA = [
  "pedido_id",
  "marca_id",
  "modalidad",
  "estado",
  "comprador",
  "direccion_entrega",
  "hora_estimada_llegada",
  "items",
  "monto_cop",
] as const;

/** Solicitud identificada en la plataforma; la cita y el anticipo siguen por WhatsApp directo con la marca (E61). */
export type SolicitudDeServicio = {
  solicitud_id: UuidV7;
  comprador_id: Id;
  marca_id: Id;
  galaxia_id: GalaxiaId;
  producto_id: Id;
  canal: "whatsapp";
  creada_en: FechaHora;
};

export const COMANDOS_DEL_PEDIDO = [
  "emitirCobro",
  "vencerCobro",
  "informarPago",
  "confirmarPago",
  "aceptar",
  "despachar",
  "entregar",
  "evaluar",
  "cancelar",
  "registrarReembolso",
] as const;
export type NombreDeComandoDelPedido = (typeof COMANDOS_DEL_PEDIDO)[number];

export type Transicion = {
  comando: NombreDeComandoDelPedido;
  desde: readonly EstadoDelPedido[];
  hacia: EstadoDelPedido;
  actores: readonly TipoDeActor[];
  /** Si se indica, la transición solo existe en ese modo de confirmación. */
  modo?: ModoDeConfirmacion;
};

/**
 * Máquina de estados de P4: la misma tabla que $defs.tabla_de_transiciones del esquema, que la versiona; las pruebas
 * exigen que coincidan. Los estados y la confirmación del pago son de ADR-0003 y R10; los pasos de la marca siguen
 * las aristas E43 a E45. Cancelar y registrar el reembolso son propuesta (S18, PEN-19): no se cancela con un cobro
 * vigente, que el comprador todavía puede pagar, para que un pago confirmado nunca caiga sobre un pedido cancelado.
 */
export const TRANSICIONES: readonly Transicion[] = [
  { comando: "emitirCobro", desde: ["creado", "cobro_vencido"], hacia: "cobro_emitido", actores: ["comprador", "sistema"] },
  { comando: "vencerCobro", desde: ["cobro_emitido"], hacia: "cobro_vencido", actores: ["sistema"] },
  { comando: "informarPago", desde: ["cobro_emitido"], hacia: "pago_informado", actores: ["comprador"], modo: "contingencia_manual" },
  { comando: "confirmarPago", desde: ["cobro_emitido"], hacia: "pagado", actores: ["proveedor_pagos", "sistema"], modo: "automatica" },
  { comando: "confirmarPago", desde: ["pago_informado"], hacia: "pagado", actores: ["responsable_marca"], modo: "contingencia_manual" },
  { comando: "aceptar", desde: ["pagado"], hacia: "aceptado", actores: ["responsable_marca"] },
  { comando: "despachar", desde: ["aceptado"], hacia: "en_camino", actores: ["responsable_marca"] },
  { comando: "entregar", desde: ["en_camino"], hacia: "entregado", actores: ["responsable_marca"] },
  { comando: "evaluar", desde: ["entregado"], hacia: "evaluado", actores: ["comprador"] },
  { comando: "cancelar", desde: ["creado", "cobro_vencido"], hacia: "cancelado", actores: ["comprador", "responsable_marca"] },
  { comando: "cancelar", desde: ["pago_informado"], hacia: "cancelado", actores: ["responsable_marca"], modo: "contingencia_manual" },
  { comando: "registrarReembolso", desde: ["pagado", "aceptado", "en_camino"], hacia: "reembolsado", actores: ["responsable_marca"] },
];

/** Estados en los que el pago ya está confirmado: una segunda confirmación no tiene efecto (ADR-0003). */
export const ESTADOS_CON_PAGO_CONFIRMADO: readonly EstadoDelPedido[] = ["pagado", "aceptado", "en_camino", "entregado", "evaluado", "reembolsado"];
