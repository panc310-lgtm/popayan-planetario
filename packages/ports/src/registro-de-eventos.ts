// EventLedgerPort: puerto único de escritura de planetario_events (D3; INV_01, INV_02, rule_03).
import type { EventoCanonico } from "@planetario/contracts";

/**
 * insertado: el evento entra al registro; su posición canónica la asigna D3 al COMMIT (INV_01).
 * duplicado: ya existe un evento con esa clave de idempotencia y el mismo contenido; no se repiten efectos.
 * conflicto: la clave ya existe con otro contenido (comparación del payload, INV_02); es un error de la fuente.
 */
export type ResultadoDelAppend = { resultado: "insertado" } | { resultado: "duplicado" } | { resultado: "conflicto" };

export interface EventLedgerPort {
  /**
   * Escribe un hecho confirmado. Corre dentro de la misma transacción que el cambio de estado (E35), así que solo
   * se obtiene desde TransaccionDeEscritura. El adaptador valida el evento contra canonical-event.schema.json, que
   * exige agente, versión del contrato, modelo y turno cuando el actor es un agente (rule_03).
   */
  appendCanonicalEvent(evento: EventoCanonico): Promise<ResultadoDelAppend>;
}
