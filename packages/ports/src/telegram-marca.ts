// TelegramBrandPort (R03, R07): avisos a la marca por Telegram con botones inline.
import type { Id, VistaDePedidoParaMarca } from "@planetario/contracts";

export interface TelegramBrandPort {
  /**
   * Solo acepta la vista filtrada de R03 que arma el cortafuegos de visibilidad del dominio. Se llama desde el
   * despachador del outbox, después del COMMIT y sin conexión SQL abierta (INV_05).
   */
  enviarPedidoALaMarca(entrada: { marcaId: Id; vista: VistaDePedidoParaMarca }): Promise<void>;
}
