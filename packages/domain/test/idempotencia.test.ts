import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { claveDeIdempotencia, claveDelEvento } from "@planetario/domain";

describe("claves de idempotencia de la fuente (INV_02, S19)", () => {
  it("la misma fuente da siempre la misma clave", () => {
    assert.equal(claveDeIdempotencia({ tipo: "telegram_update", updateId: 77 }), "tg-update:77");
    assert.equal(claveDeIdempotencia({ tipo: "telegram_callback", callbackQueryId: "998877" }), "tg-callback:998877");
    assert.equal(claveDeIdempotencia({ tipo: "proveedor_pago", proveedor: "bold", eventoProveedorId: "evt_1" }), "pago:bold:evt_1");
    assert.equal(claveDeIdempotencia({ tipo: "consulta_cobro", proveedor: "bold", referenciaCobro: "ref-9" }), "consulta:bold:ref-9:pagado");
    assert.equal(claveDeIdempotencia({ tipo: "cliente", compradorId: "c1", idempotencyKey: "k-1" }), "cliente:c1:k-1");
    assert.equal(claveDeIdempotencia({ tipo: "agente", conversacionId: "c", turnoId: "t", llamadaId: "l" }), "agente:c:t:l");
  });

  it("la misma Idempotency-Key de dos compradores no choca", () => {
    assert.notEqual(
      claveDeIdempotencia({ tipo: "cliente", compradorId: "c1", idempotencyKey: "k-1" }),
      claveDeIdempotencia({ tipo: "cliente", compradorId: "c2", idempotencyKey: "k-1" }),
    );
  });

  it("una petición que produce dos eventos les da claves distintas", () => {
    const fuente = { tipo: "cliente", compradorId: "c1", idempotencyKey: "k-1" } as const;
    assert.notEqual(claveDelEvento(fuente, "PedidoCreado"), claveDelEvento(fuente, "CobroEmitido"));
  });

  it("rechaza partes que romperían el formato", () => {
    assert.throws(() => claveDeIdempotencia({ tipo: "cliente", compradorId: "c1", idempotencyKey: "a:b" }), RangeError);
    assert.throws(() => claveDeIdempotencia({ tipo: "cliente", compradorId: "c1", idempotencyKey: "" }), RangeError);
    assert.throws(() => claveDeIdempotencia({ tipo: "telegram_update", updateId: -1 }), RangeError);
  });
});
