import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Actor } from "@planetario/contracts";
import { COMANDOS_PROHIBIDOS_A_AGENTES, evaluarOmega } from "@planetario/domain";

const agenteDeUsuario: Actor = {
  tipo: "agente",
  agente: "pedido",
  version_contrato: "1.0.0",
  modelo: "claude-haiku-5-5",
  turno: { conversacion_id: "c1", turno_id: "t1" },
  en_nombre_de: { tipo: "comprador", id: "comprador_1" },
};
const agenteDeMarcaA: Actor = { ...agenteDeUsuario, agente: "landing", en_nombre_de: { tipo: "marca", id: "marca_a" } };
const responsableA: Actor = { tipo: "responsable_marca", marca_id: "marca_a", responsable_id: "r1" };

describe("Ω por transacción (rule_01)", () => {
  it("ningún agente paga, confirma, cambia la llave Bre-B, lee la reputación ni publica (ADR-0002)", () => {
    for (const comando of ["confirmarPago", "informarPago", "crearPedido", "cambiarLlaveBreB", "leerReputacion", "publicarLanding"] as const) {
      const v = evaluarOmega({ actor: agenteDeUsuario, comando, marcaDelRecurso: "marca_a" });
      assert.deepEqual(v.omega === 0 && v.motivo, "prohibicion_agente", comando);
    }
    assert.ok(COMANDOS_PROHIBIDOS_A_AGENTES.includes("confirmarPago"));
  });

  it("la sesión de una marca no actúa sobre otra marca (R01, R05, R07)", () => {
    const v = evaluarOmega({ actor: responsableA, comando: "aceptar", marcaDelRecurso: "marca_b" });
    assert.equal(v.omega === 0 && v.motivo, "aislamiento_marca");
    const agente = evaluarOmega({ actor: agenteDeMarcaA, comando: "enviarPedidoALaMarca", marcaDelRecurso: "marca_b" });
    assert.equal(agente.omega === 0 && agente.motivo, "aislamiento_marca");
    assert.deepEqual(evaluarOmega({ actor: responsableA, comando: "aceptar", marcaDelRecurso: "marca_a" }), { omega: 1 });
  });

  it("nada fuera de R03 sale hacia la marca", () => {
    const sistema: Actor = { tipo: "sistema", tarea: "outbox" };
    const v = evaluarOmega({ actor: sistema, comando: "enviarPedidoALaMarca", marcaDelRecurso: "marca_a", camposHaciaLaMarca: ["pedido_id", "comprador", "comprador_id"] });
    assert.equal(v.omega === 0 && v.motivo, "cortafuegos_visibilidad");
    assert.deepEqual(evaluarOmega({ actor: sistema, comando: "enviarPedidoALaMarca", marcaDelRecurso: "marca_a", camposHaciaLaMarca: ["pedido_id", "comprador", "items"] }), { omega: 1 });
  });

  it("el comprador y el proveedor pasan la compuerta en sus comandos", () => {
    assert.deepEqual(evaluarOmega({ actor: { tipo: "comprador", comprador_id: "c" }, comando: "crearPedido", marcaDelRecurso: "marca_a" }), { omega: 1 });
    assert.deepEqual(evaluarOmega({ actor: { tipo: "proveedor_pagos", proveedor: "simulado" }, comando: "confirmarPago", marcaDelRecurso: "marca_a" }), { omega: 1 });
  });
});
