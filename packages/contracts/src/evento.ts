// Tipos de ../schemas/canonical-event.schema.json (INV_01, INV_02, rule_03).
import type { FechaHora, Id, UuidV7 } from "./comunes.ts";

export type ActorAgente = {
  tipo: "agente";
  agente: Id;
  version_contrato: string;
  modelo: string;
  turno: { conversacion_id: Id; turno_id: Id };
  /** Comprador o marca de la sesión autenticada (R05); nunca lo elige el modelo. */
  en_nombre_de: { tipo: "comprador" | "marca"; id: Id };
};

/** Quién originó un hecho. Lo fija el servidor desde la sesión autenticada (ADR-0002). */
export type Actor =
  | { tipo: "comprador"; comprador_id: Id }
  | { tipo: "responsable_marca"; marca_id: Id; responsable_id: Id }
  | { tipo: "operacion_comercial"; operador_id: Id }
  | { tipo: "proveedor_pagos"; proveedor: Id }
  | { tipo: "sistema"; tarea: Id }
  | ActorAgente;

export type TipoDeActor = Actor["tipo"];

export type TipoDeAgregado = "pedido" | "solicitud_de_servicio" | "marca" | "comprador";

export type EventoCanonico = {
  event_id: UuidV7;
  /** Determinista y de la fuente (INV_02); formato por fuente en S19. */
  idempotency_key: string;
  tipo: string;
  agregado: { tipo: TipoDeAgregado; id: Id };
  marca_id?: Id;
  actor: Actor;
  ocurrido_en: FechaHora;
  payload: Record<string, unknown>;
};

/** Tipos de los eventos del pedido, uno por transición de la máquina de estados. */
export const TIPOS_DE_EVENTO_DEL_PEDIDO = {
  crear: "PedidoCreado",
  emitirCobro: "CobroEmitido",
  vencerCobro: "CobroVencido",
  informarPago: "PagoInformado",
  confirmarPago: "PagoConfirmado",
  aceptar: "PedidoAceptado",
  despachar: "PedidoEnCamino",
  entregar: "PedidoEntregado",
  evaluar: "PedidoEvaluado",
  cancelar: "PedidoCancelado",
  registrarReembolso: "PedidoReembolsado",
} as const;
