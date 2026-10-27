// ConfiguracionDePagosPort: de dónde sale el régimen de confirmación de R10 para los pedidos de una marca.
import type { Id, ModoDeConfirmacion } from "@planetario/contracts";

export interface ConfiguracionDePagosPort {
  /**
   * automatica si la marca cobra con verificación del proveedor; contingencia_manual si la plataforma opera con la
   * contingencia de ADR-0003 o la marca no está habilitada con el proveedor (E66). Lo decide la configuración del
   * servidor, nunca los datos que trae el comprador.
   */
  modoDeConfirmacion(marcaId: Id): Promise<ModoDeConfirmacion>;
}
