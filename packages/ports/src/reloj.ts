// ClockPort (S1): el dominio nunca lee el reloj; lo recibe inyectado.
import type { FechaHora } from "@planetario/contracts";

/** Un instante en dos formas que siempre coinciden: milisegundos desde 1970 (UTC) e ISO 8601 en UTC. */
export type Instante = { ms: number; iso: FechaHora };

export interface ClockPort {
  ahora(): Instante;
  /** Instante `ms` milisegundos después de `desde`, sin que el dominio tenga que formatear fechas. */
  sumar(desde: Instante, ms: number): Instante;
}
