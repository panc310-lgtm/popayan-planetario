// @planetario/contracts: tipos y constantes de los esquemas de ../schemas/. No importa nada fuera del paquete (INV_06, S1).
export * from "./comunes.ts";
export type * from "./catalogo.ts";
export * from "./pedido.ts";
export * from "./evento.ts";
export type * from "./vector-pi.ts";

/** Esquemas del paquete, con su $id. Las versiones y huellas están en schemas/versiones.json. */
export const ESQUEMAS = {
  catalogo: { archivo: "galaxies-and-catalog.schema.json", id: "urn:popayan-planetario:contracts:galaxies-and-catalog" },
  pedido: { archivo: "order-state-machine.schema.json", id: "urn:popayan-planetario:contracts:order-state-machine" },
  vectorPi: { archivo: "decision-vector-pi.schema.json", id: "urn:popayan-planetario:contracts:decision-vector-pi" },
  evento: { archivo: "canonical-event.schema.json", id: "urn:popayan-planetario:contracts:canonical-event" },
} as const;
