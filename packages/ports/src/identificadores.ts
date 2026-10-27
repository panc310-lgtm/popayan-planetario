// IdGeneratorPort (S1, INV_02): el dominio nunca genera identificadores ni azar; los recibe inyectados.
import type { UuidV7 } from "@planetario/contracts";

export interface IdGeneratorPort {
  /**
   * UUIDv7 nuevo para event_id y para los identificadores de pedidos y solicitudes. PostgreSQL 17 no trae uuidv7(),
   * así que se genera en la aplicación (INV_02). La clave de idempotencia no sale de aquí: es determinista y la
   * deriva el dominio de la fuente (packages/domain/src/idempotencia.ts).
   */
  nuevoUuidV7(): UuidV7;
}
