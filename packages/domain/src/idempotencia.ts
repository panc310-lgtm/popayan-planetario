// Claves de idempotencia deterministas, derivadas de la fuente (INV_02). El formato de cada prefijo es S19 (propuesto).

export type FuenteDeIdempotencia =
  | { tipo: "telegram_update"; updateId: number }
  | { tipo: "telegram_callback"; callbackQueryId: string }
  | { tipo: "proveedor_pago"; proveedor: string; eventoProveedorId: string }
  /** Vía de consulta del cobro: un solo PagoConfirmado por cobro, llegue o no también el webhook. */
  | { tipo: "consulta_cobro"; proveedor: string; referenciaCobro: string }
  /** Encabezado Idempotency-Key que el cliente reutiliza en cada reintento. */
  | { tipo: "cliente"; idempotencyKey: string }
  | { tipo: "agente"; conversacionId: string; turnoId: string; llamadaId: string }
  /** Tareas programadas del worker: una por tarea y por recurso. */
  | { tipo: "sistema"; tarea: string; recursoId: string };

const PARTE = /^[A-Za-z0-9_.-]{1,96}$/;

function parte(valor: string | number, nombre: string): string {
  const texto = String(valor);
  if (!PARTE.test(texto)) throw new RangeError(`La parte ${nombre} de la clave de idempotencia no es válida: ${texto}`);
  return texto;
}

/** Misma fuente, misma clave; fuentes distintas nunca comparten prefijo. */
export function claveDeIdempotencia(fuente: FuenteDeIdempotencia): string {
  switch (fuente.tipo) {
    case "telegram_update":
      if (!Number.isSafeInteger(fuente.updateId) || fuente.updateId < 0) throw new RangeError("update_id de Telegram inválido");
      return `tg-update:${fuente.updateId}`;
    case "telegram_callback":
      return `tg-callback:${parte(fuente.callbackQueryId, "callback_query.id")}`;
    case "proveedor_pago":
      return `pago:${parte(fuente.proveedor, "proveedor")}:${parte(fuente.eventoProveedorId, "evento del proveedor")}`;
    case "consulta_cobro":
      return `consulta:${parte(fuente.proveedor, "proveedor")}:${parte(fuente.referenciaCobro, "referencia del cobro")}:pagado`;
    case "cliente":
      return `cliente:${parte(fuente.idempotencyKey, "Idempotency-Key")}`;
    case "agente":
      return `agente:${parte(fuente.conversacionId, "conversación")}:${parte(fuente.turnoId, "turno")}:${parte(fuente.llamadaId, "llamada")}`;
    case "sistema":
      return `sistema:${parte(fuente.tarea, "tarea")}:${parte(fuente.recursoId, "recurso")}`;
  }
}
