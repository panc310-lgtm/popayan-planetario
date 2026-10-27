// Pruebas del simulador de VerificadorDePagos: los casos de "Cómo se confirma" de ADR-0003 que le tocan al adaptador.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENCABEZADO_FIRMA, crearVerificadorSimulado } from "@planetario/adapters/pagos/verificador-simulado";
import { idsSecuenciales, relojManual } from "../../../test/dobles/reloj-e-ids.ts";

const SECRETOS: Record<string, string> = { marca_a: "secreto-a", marca_b: "secreto-b" };

function preparar() {
  const reloj = relojManual();
  const verificador = crearVerificadorSimulado({ reloj, ids: idsSecuenciales(reloj), secretoDeMarca: (m) => SECRETOS[m] });
  return { reloj, verificador };
}

const entrada = { pedidoId: "019a2b3c-4d5e-7000-8000-000000000001", marcaId: "marca_a", montoCop: 34000, llaveIdempotencia: "019a2b3c-4d5e-7000-8000-000000000001:v0" };

describe("simulador de VerificadorDePagos (ADR-0003)", () => {
  it("emitirCobro es idempotente por llave y el QR vence a los 10 minutos", async () => {
    const { verificador } = preparar();
    const a = await verificador.emitirCobro(entrada);
    const b = await verificador.emitirCobro(entrada);
    assert.deepEqual(a, b);
    assert.equal(a.venceEn, "2026-12-10T15:10:00.000Z");
    const otro = await verificador.emitirCobro({ ...entrada, llaveIdempotencia: `${entrada.pedidoId}:v2` });
    assert.notEqual(otro.referenciaCobro, a.referenciaCobro);
  });

  it("consultarCobro: pendiente, pagado, vencido; y rechazado si la marca no es la del cobro", async () => {
    const { reloj, verificador } = preparar();
    const cobro = await verificador.emitirCobro(entrada);
    assert.equal((await verificador.consultarCobro({ marcaId: "marca_a", referenciaCobro: cobro.referenciaCobro })).estado, "pendiente");
    assert.equal((await verificador.consultarCobro({ marcaId: "marca_b", referenciaCobro: cobro.referenciaCobro })).estado, "rechazado");
    const vence = await verificador.emitirCobro({ ...entrada, llaveIdempotencia: "otra" });
    reloj.avanzar(10 * 60 * 1000);
    assert.equal((await verificador.consultarCobro({ marcaId: "marca_a", referenciaCobro: vence.referenciaCobro })).estado, "vencido");
    verificador.simularPago(cobro.referenciaCobro);
    assert.deepEqual(await verificador.consultarCobro({ marcaId: "marca_a", referenciaCobro: cobro.referenciaCobro }), { estado: "pagado", montoCop: 34000 });
  });

  it("valida la firma HMAC-SHA256 del cuerpo crudo con el secreto de esa marca", async () => {
    const { verificador } = preparar();
    const cobro = await verificador.emitirCobro(entrada);
    const webhook = verificador.simularPago(cobro.referenciaCobro);
    assert.deepEqual(await verificador.validarNotificacion({ marcaId: "marca_a", ...webhook }), {
      valida: true,
      eventoProveedorId: webhook.eventoProveedorId,
      referenciaCobro: cobro.referenciaCobro,
      montoCop: 34000,
      estado: "pagado",
    });
  });

  it("rechaza firma inválida, monto distinto, marca distinta y formato inválido (R10)", async () => {
    const { verificador } = preparar();
    const cobro = await verificador.emitirCobro(entrada);
    const legitimo = verificador.simularPago(cobro.referenciaCobro);
    const casos: [string, Parameters<typeof verificador.validarNotificacion>[0]][] = [
      ["firma_invalida", { marcaId: "marca_a", ...verificador.simularPago(cobro.referenciaCobro, { firmarCon: "secreto-falso" }) }],
      ["firma_invalida", { marcaId: "marca_a", encabezados: {}, cuerpoCrudo: legitimo.cuerpoCrudo }],
      ["firma_invalida", { marcaId: "marca_a", encabezados: legitimo.encabezados, cuerpoCrudo: legitimo.cuerpoCrudo.replace("34000", "3400") }],
      ["firma_invalida", { marcaId: "marca_b", ...legitimo }],
      ["monto_distinto", { marcaId: "marca_a", ...verificador.simularPago(cobro.referenciaCobro, { montoCop: 30000 }) }],
      ["marca_distinta", { marcaId: "marca_a", ...verificador.simularPago(cobro.referenciaCobro, { marcaId: "marca_b" }) }],
    ];
    for (const [motivo, notificacion] of casos) {
      assert.deepEqual(await verificador.validarNotificacion(notificacion), { valida: false, motivoRechazo: motivo }, motivo);
    }
    const noJson = "no es json";
    const { createHmac } = await import("node:crypto");
    const firma = createHmac("sha256", "secreto-a").update(noJson).digest("hex");
    assert.deepEqual(await verificador.validarNotificacion({ marcaId: "marca_a", encabezados: { [ENCABEZADO_FIRMA]: firma }, cuerpoCrudo: noJson }), { valida: false, motivoRechazo: "formato_invalido" });
  });

  it("es determinista: dos corridas iguales dan los mismos cobros y firmas", async () => {
    const corrida = async () => {
      const { verificador } = preparar();
      const cobro = await verificador.emitirCobro(entrada);
      return { cobro, webhook: verificador.simularPago(cobro.referenciaCobro) };
    };
    assert.deepEqual(await corrida(), await corrida());
  });
});
