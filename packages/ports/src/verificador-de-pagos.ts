// VerificadorDePagos (ADR-0003): las tres operaciones del puerto. Cada proveedor es un adaptador (Bold, confirmación
// manual de la contingencia y el simulador de pruebas); cambiar de proveedor no toca el dominio.
import type { FechaHora, Id, UuidV7 } from "@planetario/contracts";

export type EntradaEmitirCobro = {
  pedidoId: UuidV7;
  marcaId: Id;
  montoCop: number;
  /** Misma llave, mismo cobro: un reintento no emite un segundo QR (INV_02). */
  llaveIdempotencia: string;
};

export type CobroEmitido = { referenciaCobro: Id; qrPayload: string; venceEn: FechaHora };

export type EstadoDelCobro = "pendiente" | "pagado" | "vencido" | "rechazado";

export type ResultadoConsultaCobro = { estado: EstadoDelCobro; montoCop: number };

export type NotificacionValida = {
  valida: true;
  /** Identificador del evento del proveedor: es la clave de idempotencia del webhook (INV_02). */
  eventoProveedorId: string;
  referenciaCobro: Id;
  montoCop: number;
  estado: EstadoDelCobro;
};

export type MotivoDeRechazo = "firma_invalida" | "monto_distinto" | "marca_distinta" | "formato_invalido";

export type NotificacionRechazada = { valida: false; motivoRechazo: MotivoDeRechazo };

export interface VerificadorDePagos {
  /** Nombre corto del proveedor, para las claves de idempotencia y el actor del evento. */
  readonly proveedor: Id;
  emitirCobro(entrada: EntradaEmitirCobro): Promise<CobroEmitido>;
  consultarCobro(entrada: { marcaId: Id; referenciaCobro: Id }): Promise<ResultadoConsultaCobro>;
  /** Verifica la firma sobre el cuerpo crudo con el secreto de esa marca, y normaliza o rechaza (R10). */
  validarNotificacion(entrada: { marcaId: Id; encabezados: Readonly<Record<string, string>>; cuerpoCrudo: string }): Promise<NotificacionValida | NotificacionRechazada>;
}
