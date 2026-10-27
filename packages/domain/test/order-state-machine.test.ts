import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Actor, Pedido } from "@planetario/contracts";
import { aplicarComando, crearPedido } from "@planetario/domain";
import type { ComandoDelPedido, EvidenciaDePago, ResultadoDeTransicion } from "@planetario/domain";
import { COMPRADOR, MARCA_A, MARCA_B, itemsDe } from "../../../test/dobles/ejemplos.ts";

const T = "2026-12-10T15:00:00.000Z";
const comprador: Actor = { tipo: "comprador", comprador_id: COMPRADOR };
const responsableA: Actor = { tipo: "responsable_marca", marca_id: MARCA_A, responsable_id: "r1" };
const proveedor: Actor = { tipo: "proveedor_pagos", proveedor: "simulado" };
const sistema: Actor = { tipo: "sistema", tarea: "consulta-de-cobro" };
const COBRO = { referencia_cobro: "sim-1", qr_payload: "QR", vence_en: "2026-12-10T15:10:00.000Z" };

function nuevo(modo: Pedido["modo_confirmacion"] = "automatica", modalidad: "domicilio" | "recogida_en_establecimiento" = "domicilio"): Pedido {
  const datos =
    modalidad === "domicilio"
      ? { compradorId: COMPRADOR, marcaId: MARCA_A, galaxiaId: 4 as const, items: itemsDe(MARCA_A), modoConfirmacion: modo, modalidad, direccion_entrega: { direccion: "Calle 5" } }
      : { compradorId: COMPRADOR, marcaId: MARCA_A, galaxiaId: 4 as const, items: itemsDe(MARCA_A), modoConfirmacion: modo, modalidad };
  const r = crearPedido("019a2b3c-4d5e-7000-8000-000000000001", datos, T);
  assert.equal(r.tipo, "creado");
  return r.tipo === "creado" ? r.pedido : (undefined as never);
}

function aplicar(p: Pedido, comando: ComandoDelPedido, actor: Actor): ResultadoDeTransicion {
  return aplicarComando(p, comando, actor, T);
}

function avanzar(p: Pedido, comando: ComandoDelPedido, actor: Actor): Pedido {
  const r = aplicar(p, comando, actor);
  assert.equal(r.tipo, "aplicada", r.tipo === "rechazada" ? r.detalle : r.tipo);
  return r.tipo === "aplicada" ? r.pedido : p;
}

const notificacion = (monto = 34000, referencia = "sim-1"): EvidenciaDePago => ({
  via: "notificacion",
  marcaId: MARCA_A,
  notificacion: { valida: true, eventoProveedorId: "evt-1", referenciaCobro: referencia, montoCop: monto, estado: "pagado" },
});

describe("crear pedido: una sola marca, sin carrito combinado", () => {
  it("calcula el monto y arranca en creado, versión 0, sin cobro", () => {
    const p = nuevo();
    assert.equal(p.monto_cop, 34000);
    assert.equal(p.estado, "creado");
    assert.equal(p.version, 0);
    assert.equal(p.cobro, null);
  });

  it("rechaza ítems de otra marca y datos que faltan por modalidad", () => {
    const base = { compradorId: COMPRADOR, marcaId: MARCA_A, galaxiaId: 4 as const, modoConfirmacion: "automatica" as const };
    const mezcla = crearPedido("019a2b3c-4d5e-7000-8000-000000000001", { ...base, items: [...itemsDe(MARCA_A), ...itemsDe(MARCA_B)], modalidad: "recogida_en_establecimiento" }, T);
    assert.equal(mezcla.tipo === "rechazado" && mezcla.motivo, "varias_marcas");
    const sinDireccion = crearPedido("019a2b3c-4d5e-7000-8000-000000000001", { ...base, items: itemsDe(MARCA_A), modalidad: "domicilio", direccion_entrega: { direccion: "" } }, T);
    assert.equal(sinDireccion.tipo === "rechazado" && sinDireccion.motivo, "datos_de_modalidad");
    const vacio = crearPedido("019a2b3c-4d5e-7000-8000-000000000001", { ...base, items: [], modalidad: "recogida_en_establecimiento" }, T);
    assert.equal(vacio.tipo === "rechazado" && vacio.motivo, "sin_items");
  });
});

describe("pago con verificación automática (R10)", () => {
  it("creado → cobro_emitido → pagado → aceptado → en_camino → entregado → evaluado", () => {
    let p = nuevo();
    p = avanzar(p, { tipo: "emitirCobro", cobro: COBRO }, sistema);
    assert.equal(p.estado, "cobro_emitido");
    p = avanzar(p, { tipo: "confirmarPago", evidencia: notificacion() }, proveedor);
    assert.equal(p.estado, "pagado");
    p = avanzar(p, { tipo: "aceptar" }, responsableA);
    p = avanzar(p, { tipo: "despachar" }, responsableA);
    p = avanzar(p, { tipo: "entregar" }, responsableA);
    p = avanzar(p, { tipo: "evaluar", evaluacion: { atencion: 5, producto: 4, precio: 4, distribucion: 5 } }, comprador);
    assert.equal(p.estado, "evaluado");
    assert.equal(p.version, 6);
  });

  it("rechaza otro monto, otra referencia, otra marca o un cobro no pagado", () => {
    const p = avanzar(nuevo(), { tipo: "emitirCobro", cobro: COBRO }, sistema);
    for (const evidencia of [
      notificacion(30000),
      notificacion(34000, "sim-otro"),
      { ...notificacion(), marcaId: MARCA_B } as EvidenciaDePago,
      { via: "consulta", marcaId: MARCA_A, referenciaCobro: "sim-1", consulta: { estado: "pendiente", montoCop: 34000 } } as EvidenciaDePago,
    ]) {
      const r = aplicar(p, { tipo: "confirmarPago", evidencia }, proveedor);
      assert.equal(r.tipo === "rechazada" && r.motivo, "evidencia_invalida");
    }
  });

  it("la consulta aprobada también confirma, y la segunda vía no tiene efecto", () => {
    const emitido = avanzar(nuevo(), { tipo: "emitirCobro", cobro: COBRO }, sistema);
    const pagado = avanzar(emitido, { tipo: "confirmarPago", evidencia: { via: "consulta", marcaId: MARCA_A, referenciaCobro: "sim-1", consulta: { estado: "pagado", montoCop: 34000 } } }, sistema);
    assert.equal(pagado.estado, "pagado");
    assert.deepEqual(aplicar(pagado, { tipo: "confirmarPago", evidencia: notificacion() }, proveedor), { tipo: "sin_efecto", motivo: "pago_ya_confirmado" });
  });

  it("con verificación automática nadie informa el pago ni lo confirma con un botón", () => {
    const p = avanzar(nuevo(), { tipo: "emitirCobro", cobro: COBRO }, sistema);
    assert.equal(aplicar(p, { tipo: "informarPago" }, comprador).tipo, "rechazada");
    const boton = aplicar(p, { tipo: "confirmarPago", evidencia: { via: "boton_marca" } }, responsableA);
    assert.equal(boton.tipo === "rechazada" && boton.motivo, "actor_no_autorizado");
  });

  it("el QR vencido pasa a cobro_vencido y admite un cobro nuevo", () => {
    let p = avanzar(nuevo(), { tipo: "emitirCobro", cobro: COBRO }, sistema);
    p = avanzar(p, { tipo: "vencerCobro" }, sistema);
    assert.equal(p.estado, "cobro_vencido");
    p = avanzar(p, { tipo: "emitirCobro", cobro: { ...COBRO, referencia_cobro: "sim-2" } }, comprador);
    assert.equal(p.cobro?.referencia_cobro, "sim-2");
  });
});

describe("contingencia manual (ADR-0003)", () => {
  it("solo el botón del responsable de la marca lleva de pago_informado a pagado", () => {
    let p = avanzar(nuevo("contingencia_manual"), { tipo: "emitirCobro", cobro: COBRO }, sistema);
    assert.equal(aplicar(p, { tipo: "confirmarPago", evidencia: notificacion() }, proveedor).tipo, "rechazada");
    p = avanzar(p, { tipo: "informarPago" }, comprador);
    assert.equal(p.estado, "pago_informado");
    const otraMarca: Actor = { tipo: "responsable_marca", marca_id: MARCA_B, responsable_id: "r2" };
    assert.equal(aplicar(p, { tipo: "confirmarPago", evidencia: { via: "boton_marca" } }, otraMarca).tipo, "rechazada");
    assert.equal(aplicar(p, { tipo: "confirmarPago", evidencia: { via: "boton_marca" } }, comprador).tipo, "rechazada");
    p = avanzar(p, { tipo: "confirmarPago", evidencia: { via: "boton_marca" } }, responsableA);
    assert.equal(p.estado, "pagado");
  });
});

describe("cancelar, reembolsar y evaluar (S18)", () => {
  it("el comprador cancela antes del pago; un pedido pagado se reembolsa, no se cancela", () => {
    const emitido = avanzar(nuevo(), { tipo: "emitirCobro", cobro: COBRO }, sistema);
    assert.equal(avanzar(emitido, { tipo: "cancelar" }, comprador).estado, "cancelado");
    const pagado = avanzar(emitido, { tipo: "confirmarPago", evidencia: notificacion() }, proveedor);
    assert.equal(aplicar(pagado, { tipo: "cancelar" }, comprador).tipo, "rechazada");
    assert.equal(aplicar(pagado, { tipo: "registrarReembolso" }, comprador).tipo, "rechazada");
    assert.equal(avanzar(pagado, { tipo: "registrarReembolso" }, responsableA).estado, "reembolsado");
  });

  it("la distribución se califica solo con domicilio, y cada nota va de 1 a 5", () => {
    const entregar = (p: Pedido) => {
      let x = avanzar(p, { tipo: "emitirCobro", cobro: COBRO }, sistema);
      x = avanzar(x, { tipo: "confirmarPago", evidencia: notificacion() }, proveedor);
      for (const tipo of ["aceptar", "despachar", "entregar"] as const) x = avanzar(x, { tipo }, responsableA);
      return x;
    };
    const domicilio = entregar(nuevo());
    assert.equal(aplicar(domicilio, { tipo: "evaluar", evaluacion: { atencion: 5, producto: 5, precio: 5 } }, comprador).tipo, "rechazada");
    assert.equal(aplicar(domicilio, { tipo: "evaluar", evaluacion: { atencion: 6, producto: 5, precio: 5, distribucion: 5 } }, comprador).tipo, "rechazada");
    const recogida = entregar(nuevo("automatica", "recogida_en_establecimiento"));
    assert.equal(aplicar(recogida, { tipo: "evaluar", evaluacion: { atencion: 5, producto: 5, precio: 5, distribucion: 5 } }, comprador).tipo, "rechazada");
    assert.equal(aplicar(recogida, { tipo: "evaluar", evaluacion: { atencion: 5, producto: 5, precio: 5 } }, comprador).tipo, "aplicada");
  });

  it("otro comprador no toca el pedido", () => {
    const otro: Actor = { tipo: "comprador", comprador_id: "comprador_2" };
    const r = aplicar(nuevo(), { tipo: "cancelar" }, otro);
    assert.equal(r.tipo === "rechazada" && r.motivo, "actor_no_autorizado");
  });

  it("el evento lleva el estado anterior, el nuevo y la versión", () => {
    const r = aplicar(nuevo(), { tipo: "emitirCobro", cobro: COBRO }, sistema);
    assert.ok(r.tipo === "aplicada");
    assert.deepEqual(r.evento, {
      tipo: "CobroEmitido",
      payload: { pedido_id: "019a2b3c-4d5e-7000-8000-000000000001", estado_anterior: "creado", estado_nuevo: "cobro_emitido", version: 1, referencia_cobro: "sim-1", vence_en: COBRO.vence_en },
    });
  });
});
