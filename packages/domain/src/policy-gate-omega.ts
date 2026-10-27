// Compuerta Ω(u, m, t) ∈ {0, 1} por transacción (rule_01). La evalúa esta función antes de cada comando; ningún
// agente la evalúa ni la evade. Con Ω = 0 la transacción no se ejecuta y el llamador la registra en T12.
import { CAMPOS_PERMITIDOS_HACIA_LA_MARCA } from "@planetario/contracts";
import type { Actor, Id } from "@planetario/contracts";

/** Comandos que existen en el dominio y que se evalúan con Ω. */
export type ComandoConPolitica =
  | "crearPedido"
  | "emitirCobro"
  | "vencerCobro"
  | "informarPago"
  | "confirmarPago"
  | "aceptar"
  | "despachar"
  | "entregar"
  | "evaluar"
  | "cancelar"
  | "registrarReembolso"
  | "cambiarLlaveBreB"
  | "leerReputacion"
  | "publicarLanding"
  | "enviarPedidoALaMarca";

/**
 * Lo que ningún agente puede hacer (ADR-0002): pagar, confirmar un pedido, cambiar la llave Bre-B, leer la
 * reputación o publicar una landing. Tampoco ejecuta los pasos del pedido, que son de una persona con su sesión
 * (el comprador o el responsable de la marca) o del proveedor de pagos.
 */
export const COMANDOS_PROHIBIDOS_A_AGENTES: readonly ComandoConPolitica[] = [
  "crearPedido",
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
  "cambiarLlaveBreB",
  "leerReputacion",
  "publicarLanding",
];

export type SolicitudDePolitica = {
  actor: Actor;
  comando: ComandoConPolitica;
  /** Marca dueña del recurso sobre el que actúa el comando, si la hay (R01). */
  marcaDelRecurso?: Id;
  /** Campos de primer nivel que el comando expone hacia una marca (R03). */
  camposHaciaLaMarca?: readonly string[];
};

export type MotivoOmega = "aislamiento_marca" | "prohibicion_agente" | "cortafuegos_visibilidad";

export type VeredictoOmega = { omega: 1 } | { omega: 0; motivo: MotivoOmega; detalle: string };

/** Marca de la sesión del actor, si actúa en nombre de una marca (responsable o agente de marca, R05). */
function marcaDelActor(actor: Actor): Id | null {
  if (actor.tipo === "responsable_marca") return actor.marca_id;
  if (actor.tipo === "agente" && actor.en_nombre_de.tipo === "marca") return actor.en_nombre_de.id;
  return null;
}

export function evaluarOmega(solicitud: SolicitudDePolitica): VeredictoOmega {
  const { actor, comando } = solicitud;

  if (actor.tipo === "agente" && COMANDOS_PROHIBIDOS_A_AGENTES.includes(comando)) {
    return { omega: 0, motivo: "prohibicion_agente", detalle: `El agente ${actor.agente} no puede ejecutar ${comando} (ADR-0002)` };
  }

  const marca = marcaDelActor(actor);
  if (marca !== null && solicitud.marcaDelRecurso !== undefined && solicitud.marcaDelRecurso !== marca) {
    return { omega: 0, motivo: "aislamiento_marca", detalle: `La sesión de la marca ${marca} no puede actuar sobre un recurso de la marca ${solicitud.marcaDelRecurso} (R01, R05, R07)` };
  }

  if (solicitud.camposHaciaLaMarca !== undefined) {
    const permitidos: readonly string[] = CAMPOS_PERMITIDOS_HACIA_LA_MARCA;
    const sobrantes = solicitud.camposHaciaLaMarca.filter((c) => !permitidos.includes(c));
    if (sobrantes.length > 0) {
      return { omega: 0, motivo: "cortafuegos_visibilidad", detalle: `Campos que R03 no permite enviar a la marca: ${sobrantes.join(", ")}` };
    }
  }

  return { omega: 1 };
}
