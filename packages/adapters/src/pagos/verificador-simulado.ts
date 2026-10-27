// Simulador determinista de VerificadorDePagos (ADR-0003, decisión 2): prueba el dominio, la máquina de estados, el
// webhook y la conciliación sin esperar al proveedor. Firma como un proveedor real (HMAC-SHA256 sobre el cuerpo crudo
// con el secreto de cada marca) y no lee el reloj ni el azar: los recibe por ClockPort e IdGeneratorPort (S1).
import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  ClockPort,
  CobroEmitido,
  EntradaEmitirCobro,
  IdGeneratorPort,
  NotificacionRechazada,
  NotificacionValida,
  ResultadoConsultaCobro,
  VerificadorDePagos,
} from "@planetario/ports";

/** Encabezado de la firma del simulador. Con Bold sería x-bold-signature (ADR-0003). */
export const ENCABEZADO_FIRMA = "x-firma-simulada";

/** El QR de Bold vence a los 10 minutos por defecto (ADR-0003). */
export const VENCIMIENTO_POR_DEFECTO_MS = 10 * 60 * 1000;

type CobroSimulado = {
  referenciaCobro: string;
  pedidoId: string;
  marcaId: string;
  montoCop: number;
  qrPayload: string;
  venceMs: number;
  venceEn: string;
  pagado: boolean;
};

export type OpcionesDelSimulador = {
  reloj: ClockPort;
  ids: IdGeneratorPort;
  /** Secreto de firma de cada marca; undefined si la marca no está habilitada (E66). */
  secretoDeMarca: (marcaId: string) => string | undefined;
  vencimientoMs?: number;
};

export type NotificacionSimulada = { encabezados: Record<string, string>; cuerpoCrudo: string; eventoProveedorId: string };

export interface VerificadorSimulado extends VerificadorDePagos {
  /**
   * El comprador paga: marca el cobro como pagado y devuelve el webhook firmado que mandaría el proveedor. Para probar
   * R10, `opciones` cambia el monto o la marca del cuerpo antes de firmarlo, o lo firma con otro secreto.
   */
  simularPago(referenciaCobro: string, opciones?: { montoCop?: number; marcaId?: string; firmarCon?: string }): NotificacionSimulada;
}

const firmar = (secreto: string, cuerpo: string) => createHmac("sha256", secreto).update(cuerpo, "utf8").digest("hex");

function firmaCoincide(esperada: string, recibida: string | undefined): boolean {
  if (recibida === undefined || !/^[0-9a-f]{64}$/.test(recibida)) return false;
  return timingSafeEqual(Buffer.from(esperada, "hex"), Buffer.from(recibida, "hex"));
}

export function crearVerificadorSimulado(opciones: OpcionesDelSimulador): VerificadorSimulado {
  const vencimientoMs = opciones.vencimientoMs ?? VENCIMIENTO_POR_DEFECTO_MS;
  const porLlave = new Map<string, CobroSimulado>();
  const porReferencia = new Map<string, CobroSimulado>();
  const rechazo = (motivoRechazo: NotificacionRechazada["motivoRechazo"]): NotificacionRechazada => ({ valida: false, motivoRechazo });

  return {
    proveedor: "simulado",

    async emitirCobro(entrada: EntradaEmitirCobro): Promise<CobroEmitido> {
      const previo = porLlave.get(entrada.llaveIdempotencia);
      if (previo !== undefined) return { referenciaCobro: previo.referenciaCobro, qrPayload: previo.qrPayload, venceEn: previo.venceEn };
      const ahora = opciones.reloj.ahora();
      const vence = opciones.reloj.sumar(ahora, vencimientoMs);
      const referenciaCobro = `sim-${opciones.ids.nuevoUuidV7()}`;
      const cobro: CobroSimulado = {
        referenciaCobro,
        pedidoId: entrada.pedidoId,
        marcaId: entrada.marcaId,
        montoCop: entrada.montoCop,
        qrPayload: `SIMULADO|${entrada.marcaId}|${referenciaCobro}|${entrada.montoCop}`,
        venceMs: vence.ms,
        venceEn: vence.iso,
        pagado: false,
      };
      porLlave.set(entrada.llaveIdempotencia, cobro);
      porReferencia.set(referenciaCobro, cobro);
      return { referenciaCobro, qrPayload: cobro.qrPayload, venceEn: cobro.venceEn };
    },

    async consultarCobro({ marcaId, referenciaCobro }): Promise<ResultadoConsultaCobro> {
      const cobro = porReferencia.get(referenciaCobro);
      if (cobro === undefined || cobro.marcaId !== marcaId) return { estado: "rechazado", montoCop: 0 };
      if (cobro.pagado) return { estado: "pagado", montoCop: cobro.montoCop };
      if (opciones.reloj.ahora().ms >= cobro.venceMs) return { estado: "vencido", montoCop: cobro.montoCop };
      return { estado: "pendiente", montoCop: cobro.montoCop };
    },

    async validarNotificacion({ marcaId, encabezados, cuerpoCrudo }): Promise<NotificacionValida | NotificacionRechazada> {
      const secreto = opciones.secretoDeMarca(marcaId);
      if (secreto === undefined) return rechazo("firma_invalida");
      if (!firmaCoincide(firmar(secreto, cuerpoCrudo), encabezados[ENCABEZADO_FIRMA])) return rechazo("firma_invalida");
      let cuerpo: unknown;
      try {
        cuerpo = JSON.parse(cuerpoCrudo);
      } catch {
        return rechazo("formato_invalido");
      }
      if (typeof cuerpo !== "object" || cuerpo === null) return rechazo("formato_invalido");
      const c = cuerpo as Record<string, unknown>;
      if (typeof c.evento_id !== "string" || typeof c.referencia_cobro !== "string" || typeof c.marca_id !== "string" || !Number.isInteger(c.monto_cop) || c.estado !== "pagado") {
        return rechazo("formato_invalido");
      }
      if (c.marca_id !== marcaId) return rechazo("marca_distinta");
      const cobro = porReferencia.get(c.referencia_cobro);
      if (cobro !== undefined && cobro.marcaId !== marcaId) return rechazo("marca_distinta");
      if (cobro !== undefined && cobro.montoCop !== c.monto_cop) return rechazo("monto_distinto");
      return { valida: true, eventoProveedorId: c.evento_id, referenciaCobro: c.referencia_cobro, montoCop: c.monto_cop as number, estado: "pagado" };
    },

    simularPago(referenciaCobro, cambios = {}) {
      const cobro = porReferencia.get(referenciaCobro);
      if (cobro === undefined) throw new Error(`El simulador no emitió el cobro ${referenciaCobro}`);
      cobro.pagado = true;
      const eventoProveedorId = `evt-${opciones.ids.nuevoUuidV7()}`;
      const marcaId = cambios.marcaId ?? cobro.marcaId;
      const cuerpoCrudo = JSON.stringify({ evento_id: eventoProveedorId, referencia_cobro: referenciaCobro, marca_id: marcaId, monto_cop: cambios.montoCop ?? cobro.montoCop, estado: "pagado" });
      const secreto = cambios.firmarCon ?? opciones.secretoDeMarca(cobro.marcaId) ?? "";
      return { encabezados: { [ENCABEZADO_FIRMA]: firmar(secreto, cuerpoCrudo) }, cuerpoCrudo, eventoProveedorId };
    },
  };
}
