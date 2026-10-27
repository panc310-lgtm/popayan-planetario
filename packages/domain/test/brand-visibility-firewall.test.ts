import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Pedido } from "@planetario/contracts";
import { proyectarPedidoParaMarca, vistaParaLaMarca } from "@planetario/domain";
import { MARCA_A, MARCA_B, itemsDe, pedidoDomicilio } from "../../../test/dobles/ejemplos.ts";
import { validar } from "../../../test/dobles/esquemas.ts";

const contacto = { nombre: "Ana", celular: "+573001234567" };
const sistema = { tipo: "sistema", tarea: "outbox" } as const;

describe("cortafuegos de visibilidad (R03), prueba con dos marcas", () => {
  it("cada marca recibe solo su pedido, con nombre, celular y dirección en domicilio", () => {
    const pedidoB: Pedido = { ...pedidoDomicilio, pedido_id: "019a2b3c-4d5e-7000-8000-0000000000b0", marca_id: MARCA_B, items: itemsDe(MARCA_B) };
    for (const pedido of [pedidoDomicilio as Pedido, pedidoB]) {
      const r = proyectarPedidoParaMarca(pedido, contacto);
      assert.ok(r.tipo === "proyectada");
      assert.equal(r.vista.marca_id, pedido.marca_id);
      assert.ok(r.vista.items.every((i) => i.marca_id === pedido.marca_id));
      assert.deepEqual(Object.keys(r.vista).sort(), ["comprador", "direccion_entrega", "estado", "items", "marca_id", "modalidad", "monto_cop", "pedido_id"]);
      assert.equal("comprador_id" in r.vista, false);
      const esquema = validar("order-state-machine.schema.json", r.vista, "vista_para_marca");
      assert.ok(esquema.valido, esquema.errores);
    }
  });

  it("sin domicilio la marca no ve ninguna dirección", () => {
    const { direccion_entrega: _, ...base } = pedidoDomicilio;
    const r = proyectarPedidoParaMarca({ ...base, modalidad: "recogida_en_establecimiento" }, contacto);
    assert.ok(r.tipo === "proyectada");
    assert.equal("direccion_entrega" in r.vista, false);
  });

  it("un ítem de otra marca no se filtra en silencio: se rechaza", () => {
    const r = proyectarPedidoParaMarca({ ...pedidoDomicilio, items: [...itemsDe(MARCA_A), ...itemsDe(MARCA_B)] }, contacto);
    assert.equal(r.tipo === "rechazada" && r.motivo, "item_de_otra_marca");
  });

  it("la vista para el outbox pasa además por Ω", () => {
    const r = vistaParaLaMarca(pedidoDomicilio, contacto, sistema);
    assert.equal(r.tipo, "lista");
    const agente = { tipo: "agente", agente: "landing", version_contrato: "1.0.0", modelo: "claude-sonnet-5-5", turno: { conversacion_id: "c", turno_id: "t" }, en_nombre_de: { tipo: "marca", id: MARCA_B } } as const;
    const bloqueada = vistaParaLaMarca(pedidoDomicilio, contacto, agente);
    assert.equal(bloqueada.tipo === "bloqueada" && bloqueada.motivo, "aislamiento_marca");
  });
});
