// MasterWriteDatabasePort y SlaveReadDatabasePort (INV_07): CQRS por puertos sobre la misma base D1.
import type { Catalogo, EstadoDelPedido, GalaxiaId, Id, Pedido, UuidV7 } from "@planetario/contracts";
import type { EventLedgerPort } from "./registro-de-eventos.ts";

export type ResultadoDeGuardado = "guardado" | "version_distinta";

/**
 * Lo que se puede hacer dentro de una transacción corta de escritura. Las lecturas que deciden una mutación van
 * aquí y no por SlaveReadDatabasePort (S2): el adaptador las hace con bloqueo de fila (FOR UPDATE) dentro de la
 * transacción, para que sigan siendo correctas cuando exista una réplica con retraso.
 */
export interface TransaccionDeEscritura {
  leerPedidoParaDecidir(pedidoId: UuidV7): Promise<Pedido | null>;
  /** Pedido de esa marca dueño del cobro; la referencia de otra marca no lo encuentra (ADR-0003, webhook paso 2). */
  leerPedidoPorCobroParaDecidir(entrada: { marcaId: Id; referenciaCobro: Id }): Promise<Pedido | null>;
  insertarPedido(pedido: Pedido): Promise<void>;
  /** Concurrencia optimista: guarda solo si la versión en la base sigue siendo `versionEsperada`. */
  guardarPedido(pedido: Pedido, versionEsperada: number): Promise<ResultadoDeGuardado>;
  /** El registro de eventos de esta misma transacción (E35). */
  readonly ledger: EventLedgerPort;
}

export interface MasterWriteDatabasePort {
  /**
   * Abre una transacción corta, ejecuta `trabajo` y confirma; si `trabajo` lanza, la revierte. Va por el pooler en
   * modo sesión (PEN-17). Dentro de `trabajo` no se llama a ningún servicio externo (INV_05).
   */
  enTransaccion<T>(trabajo: (tx: TransaccionDeEscritura) => Promise<T>): Promise<T>;
}

export type EstadoVisibleDelPedido = { pedido_id: UuidV7; estado: EstadoDelPedido; actualizado_en: string };

/**
 * Consultas de catálogo, exploración e hidratación, precedidas por la caché de D4. Va por el pooler en modo
 * transacción (PEN-17): cada lectura es una sola consulta sin estado de sesión. Nunca decide una mutación (S2).
 */
export interface SlaveReadDatabasePort {
  consultarCatalogo(galaxiaId: GalaxiaId): Promise<Catalogo>;
  consultarEstadoDelPedido(entrada: { pedidoId: UuidV7; compradorId: Id }): Promise<EstadoVisibleDelPedido | null>;
}
