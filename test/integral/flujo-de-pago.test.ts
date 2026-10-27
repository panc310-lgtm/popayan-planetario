// Prueba integral del flujo de pedido y pago: dominio + simulador de VerificadorDePagos + dobles en memoria de los
// puertos. Cubre "Cómo se confirma" de ADR-0003, R10, INV_02, INV_05, rule_01, rule_03 y R03.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Actor, ModoDeConfirmacion, Pedido } from "@planetario/contracts";
import type { ConfiguracionDePagosPort, MasterWriteDatabasePort, TelegramBrandPort, VerificadorDePagos } from "@planetario/ports";
import {
  ConflictoDeVersion,
  aplicarComandoDePersona,
  consultarCobroDelPedido,
  emitirCobroDelPedido,
  procesarNotificacionDePago,
  registrarPedido,
  vistaParaLaMarca,
} from "@planetario/domain";
import type { DependenciasDelPedido, ResultadoDelCasoDeUso } from "@planetario/domain";
import { crearVerificadorSimulado } from "@planetario/adapters/pagos/verificador-simulado";
import type { VerificadorSimulado } from "@planetario/adapters/pagos/verificador-simulado";
import { baseEnMemoria } from "../dobles/base-en-memoria.ts";
import type { BaseEnMemoria } from "../dobles/base-en-memoria.ts";
import { COMPRADOR, MARCA_A, MARCA_B, eventoDeAgente, itemsDe } from "../dobles/ejemplos.ts";
import { validar } from "../dobles/esquemas.ts";
import { idsSecuenciales, relojManual } from "../dobles/reloj-e-ids.ts";
import type { RelojManual } from "../dobles/reloj-e-ids.ts";

const SECRETOS: Record<string, string> = { [MARCA_A]: "secreto-a", [MARCA_B]: "secreto-b" };
const comprador: Actor = { tipo: "comprador", comprador_id: COMPRADOR };
const responsableA: Actor = { tipo: "responsable_marca", marca_id: MARCA_A, responsable_id: "resp_a" };
const responsableB: Actor = { tipo: "responsable_marca", marca_id: MARCA_B, responsable_id: "resp_b" };
const sistema: Actor = { tipo: "sistema", tarea: "emitir-cobro" };
const agente: Actor = {
  tipo: "agente",
  agente: "pedido",
  version_contrato: "1.0.0",
  modelo: "claude-haiku-5-5",
  turno: { conversacion_id: "conv_1", turno_id: "turno_1" },
  en_nombre_de: { tipo: "comprador", id: COMPRADOR },
};

/** Envuelve el verificador: cualquier llamada con una transacción abierta hace fallar la prueba (INV_05). */
function espiaDeInv05(verificador: VerificadorDePagos, base: BaseEnMemoria, llamadas: string[]): VerificadorDePagos {
  const vigilar = (metodo: string) => {
    llamadas.push(metodo);
    assert.equal(base.transaccionAbierta, false, `${metodo} se llamó con una transacción SQL abierta (INV_05)`);
  };
  return {
    proveedor: verificador.proveedor,
    emitirCobro: async (e) => (vigilar("emitirCobro"), verificador.emitirCobro(e)),
    consultarCobro: async (e) => (vigilar("consultarCobro"), verificador.consultarCobro(e)),
    validarNotificacion: async (e) => (vigilar("validarNotificacion"), verificador.validarNotificacion(e)),
  };
}

type Entorno = {
  reloj: RelojManual;
  base: BaseEnMemoria;
  simulado: VerificadorSimulado;
  deps: DependenciasDelPedido;
  llamadas: string[];
  /** Configuración del servidor: modo de confirmación de cada marca (R10); por defecto, automática. */
  modos: Map<string, ModoDeConfirmacion>;
};

function preparar(): Entorno {
  const reloj = relojManual();
  const ids = idsSecuenciales(reloj);
  const base = baseEnMemoria();
  const simulado = crearVerificadorSimulado({ reloj, ids, secretoDeMarca: (m) => SECRETOS[m] });
  const llamadas: string[] = [];
  const modos = new Map<string, ModoDeConfirmacion>();
  const configuracionDePagos: ConfiguracionDePagosPort = { modoDeConfirmacion: async (marca) => modos.get(marca) ?? "automatica" };
  return { reloj, base, simulado, llamadas, modos, deps: { escritura: base, reloj, ids, verificador: espiaDeInv05(simulado, base, llamadas), configuracionDePagos } };
}

function aplicada(r: ResultadoDelCasoDeUso): Pedido {
  assert.equal(r.tipo, "aplicada", JSON.stringify(r));
  return r.tipo === "aplicada" ? r.pedido : (undefined as never);
}

async function pedidoCreado(e: Entorno, modo: ModoDeConfirmacion = "automatica", marca = MARCA_A, clave = "k-1"): Promise<Pedido> {
  e.modos.set(marca, modo);
  return aplicada(
    await registrarPedido(
      e.deps,
      { compradorId: COMPRADOR, marcaId: marca, galaxiaId: 4, items: itemsDe(marca), modalidad: "domicilio", direccion_entrega: { direccion: "Calle 5 # 10-20" } },
      comprador,
      { tipo: "cliente", compradorId: COMPRADOR, idempotencyKey: clave },
    ),
  );
}

async function pedidoConCobro(e: Entorno, modo: ModoDeConfirmacion = "automatica", marca = MARCA_A, clave = "k-1"): Promise<Pedido> {
  const creado = await pedidoCreado(e, modo, marca, clave);
  return aplicada(await emitirCobroDelPedido(e.deps, creado.pedido_id, sistema, { tipo: "cliente", compradorId: COMPRADOR, idempotencyKey: clave }));
}

describe("flujo con verificación automática (ADR-0003, R10)", () => {
  it("del pedido a la evaluación, con un evento canónico válido por transición", async () => {
    const e = preparar();
    let p = await pedidoConCobro(e);
    assert.equal(p.estado, "cobro_emitido");
    const webhook = e.simulado.simularPago(p.cobro!.referencia_cobro);
    p = aplicada(await procesarNotificacionDePago(e.deps, { marcaId: MARCA_A, ...webhook }));
    assert.equal(p.estado, "pagado");
    for (const [i, tipo] of (["aceptar", "despachar", "entregar"] as const).entries()) {
      p = aplicada(await aplicarComandoDePersona(e.deps, p.pedido_id, { tipo }, responsableA, { tipo: "telegram_callback", callbackQueryId: `cb${i}` }));
    }
    p = aplicada(
      await aplicarComandoDePersona(e.deps, p.pedido_id, { tipo: "evaluar", evaluacion: { atencion: 5, producto: 5, precio: 4, distribucion: 5 } }, comprador, { tipo: "cliente", compradorId: COMPRADOR, idempotencyKey: "k-eval" }),
    );
    assert.equal(p.estado, "evaluado");
    assert.deepEqual(
      e.base.eventos.map((x) => x.tipo),
      ["PedidoCreado", "CobroEmitido", "PagoConfirmado", "PedidoAceptado", "PedidoEnCamino", "PedidoEntregado", "PedidoEvaluado"],
    );
    const pago = e.base.eventos[2]!;
    assert.deepEqual(pago.actor, { tipo: "proveedor_pagos", proveedor: "simulado" });
    assert.equal(pago.idempotency_key, `pago:simulado:${webhook.eventoProveedorId}/PagoConfirmado`);
    assert.equal(new Set(e.base.eventos.map((x) => x.idempotency_key)).size, e.base.eventos.length);
    assert.ok(validar("order-state-machine.schema.json", e.base.pedidos.get(p.pedido_id)).valido);
  });

  it("un webhook repetido y la segunda vía no duplican efectos (INV_02)", async () => {
    const e = preparar();
    const p = await pedidoConCobro(e);
    const webhook = e.simulado.simularPago(p.cobro!.referencia_cobro);
    aplicada(await procesarNotificacionDePago(e.deps, { marcaId: MARCA_A, ...webhook }));
    const antes = e.base.eventos.length;
    assert.deepEqual(await procesarNotificacionDePago(e.deps, { marcaId: MARCA_A, ...webhook }), { tipo: "sin_efecto", motivo: "pago_ya_confirmado" });
    assert.deepEqual(await consultarCobroDelPedido(e.deps, p.pedido_id), { tipo: "sin_efecto", motivo: "pago_ya_confirmado" });
    assert.equal(e.base.eventos.length, antes);
  });

  it("la consulta del cobro confirma si el webhook no llega", async () => {
    const e = preparar();
    const p = await pedidoConCobro(e);
    assert.deepEqual(await consultarCobroDelPedido(e.deps, p.pedido_id), { tipo: "sin_efecto", motivo: "cobro_pendiente" });
    e.simulado.simularPago(p.cobro!.referencia_cobro);
    const pagado = aplicada(await consultarCobroDelPedido(e.deps, p.pedido_id));
    assert.equal(pagado.estado, "pagado");
    assert.equal(e.base.eventos.at(-1)!.idempotency_key, `consulta:simulado:${p.cobro!.referencia_cobro}:pagado/PagoConfirmado`);
  });

  it("rechaza firma inválida, monto distinto, marca distinta y formato inválido sin tocar el pedido", async () => {
    const e = preparar();
    const p = await pedidoConCobro(e);
    const ref = p.cobro!.referencia_cobro;
    const antes = e.base.eventos.length;
    const casos = [
      ["firma_invalida", { marcaId: MARCA_A, ...e.simulado.simularPago(ref, { firmarCon: "otro" }) }],
      ["monto_distinto", { marcaId: MARCA_A, ...e.simulado.simularPago(ref, { montoCop: 1000 }) }],
      ["marca_distinta", { marcaId: MARCA_A, ...e.simulado.simularPago(ref, { marcaId: MARCA_B }) }],
    ] as const;
    for (const [motivo, entrada] of casos) {
      assert.deepEqual(await procesarNotificacionDePago(e.deps, entrada), { tipo: "notificacion_rechazada", motivoRechazo: motivo }, motivo);
    }
    const { createHmac } = await import("node:crypto");
    const cuerpo = '{"evento_id":"x"}';
    const firmado = { "x-firma-simulada": createHmac("sha256", SECRETOS[MARCA_A]!).update(cuerpo).digest("hex") };
    assert.deepEqual(await procesarNotificacionDePago(e.deps, { marcaId: MARCA_A, encabezados: firmado, cuerpoCrudo: cuerpo }), { tipo: "notificacion_rechazada", motivoRechazo: "formato_invalido" });
    assert.equal(e.base.pedidos.get(p.pedido_id)!.estado, "cobro_emitido");
    assert.equal(e.base.eventos.length, antes);
  });

  it("una confirmación por la ruta de otra marca no toca el pedido (R10)", async () => {
    const e = preparar();
    const p = await pedidoConCobro(e);
    const refA = p.cobro!.referencia_cobro;
    // El adaptador la rechaza: el cobro es de la marca A y la ruta es la de B.
    const { createHmac } = await import("node:crypto");
    const cuerpoCrudo = JSON.stringify({ evento_id: "evt-x", referencia_cobro: refA, marca_id: MARCA_B, monto_cop: p.monto_cop, estado: "pagado" });
    const encabezados = { "x-firma-simulada": createHmac("sha256", SECRETOS[MARCA_B]!).update(cuerpoCrudo).digest("hex") };
    assert.deepEqual(await procesarNotificacionDePago(e.deps, { marcaId: MARCA_B, encabezados, cuerpoCrudo }), { tipo: "notificacion_rechazada", motivoRechazo: "marca_distinta" });
    // Y si un proveedor la dejara pasar, el dominio no encuentra un pedido de B con esa referencia.
    const permisivo: VerificadorDePagos = {
      ...e.deps.verificador,
      validarNotificacion: async () => ({ valida: true, eventoProveedorId: "evt-x", referenciaCobro: refA, montoCop: p.monto_cop, estado: "pagado" }),
    };
    const r = await procesarNotificacionDePago({ ...e.deps, verificador: permisivo }, { marcaId: MARCA_B, encabezados, cuerpoCrudo });
    assert.equal(r.tipo === "rechazada" && r.motivo, "pedido_inexistente");
    assert.equal(e.base.pedidos.get(p.pedido_id)!.estado, "cobro_emitido");
  });

  it("el QR vencido pasa a cobro_vencido y el comprador pide un cobro nuevo", async () => {
    const e = preparar();
    const p = await pedidoConCobro(e);
    e.reloj.avanzar(10 * 60 * 1000);
    assert.equal(aplicada(await consultarCobroDelPedido(e.deps, p.pedido_id)).estado, "cobro_vencido");
    const nuevo = aplicada(await emitirCobroDelPedido(e.deps, p.pedido_id, comprador, { tipo: "cliente", compradorId: COMPRADOR, idempotencyKey: "k-2" }));
    assert.notEqual(nuevo.cobro!.referencia_cobro, p.cobro!.referencia_cobro);
    aplicada(await procesarNotificacionDePago(e.deps, { marcaId: MARCA_A, ...e.simulado.simularPago(nuevo.cobro!.referencia_cobro) }));
  });

  it("reintentar la creación con la misma Idempotency-Key no crea otro pedido (INV_02)", async () => {
    const e = preparar();
    await pedidoConCobro(e);
    const datos = { compradorId: COMPRADOR, marcaId: MARCA_A, galaxiaId: 4 as const, items: itemsDe(MARCA_A), modalidad: "domicilio" as const, direccion_entrega: { direccion: "Calle 5 # 10-20" } };
    assert.deepEqual(await registrarPedido(e.deps, datos, comprador, { tipo: "cliente", compradorId: COMPRADOR, idempotencyKey: "k-1" }), { tipo: "sin_efecto", motivo: "evento_repetido" });
    assert.equal(e.base.pedidos.size, 1);
    const otro = await registrarPedido(e.deps, { ...datos, items: itemsDe(MARCA_A).slice(0, 1) }, comprador, { tipo: "cliente", compradorId: COMPRADOR, idempotencyKey: "k-1" });
    assert.equal(otro.tipo === "rechazada" && otro.motivo, "clave_reutilizada");
  });
});

describe("reglas que protegen al comprador y a la marca", () => {
  it("la misma Idempotency-Key de otro comprador no choca con la de este", async () => {
    const e = preparar();
    await pedidoCreado(e);
    const otro: Actor = { tipo: "comprador", comprador_id: "comprador_2" };
    const r = await registrarPedido(
      e.deps,
      { compradorId: "comprador_2", marcaId: MARCA_A, galaxiaId: 4, items: itemsDe(MARCA_A), modalidad: "domicilio", direccion_entrega: { direccion: "Calle 5 # 10-20" } },
      otro,
      { tipo: "cliente", compradorId: "comprador_2", idempotencyKey: "k-1" },
    );
    assert.equal(r.tipo, "aplicada");
    assert.equal(e.base.pedidos.size, 2);
  });

  it("un reintento con otra dirección es un conflicto, no un duplicado (INV_02)", async () => {
    const e = preparar();
    await pedidoCreado(e);
    const r = await registrarPedido(
      e.deps,
      { compradorId: COMPRADOR, marcaId: MARCA_A, galaxiaId: 4, items: itemsDe(MARCA_A), modalidad: "domicilio", direccion_entrega: { direccion: "Carrera 9 # 1-1" } },
      comprador,
      { tipo: "cliente", compradorId: COMPRADOR, idempotencyKey: "k-1" },
    );
    assert.equal(r.tipo === "rechazada" && r.motivo, "clave_reutilizada");
  });

  it("el modo de confirmación lo fija la configuración del servidor, no los datos del comprador (R10)", async () => {
    const e = preparar();
    assert.equal((await pedidoCreado(e, "contingencia_manual")).modo_confirmacion, "contingencia_manual");
    assert.equal((await pedidoCreado(e, "automatica", MARCA_B, "k-b")).modo_confirmacion, "automatica");
  });

  it("un actor que no puede emitir el cobro no provoca una llamada al proveedor", async () => {
    const e = preparar();
    const p = await pedidoCreado(e);
    for (const actor of [{ tipo: "comprador", comprador_id: "comprador_2" }, responsableA] as Actor[]) {
      const r = await emitirCobroDelPedido(e.deps, p.pedido_id, actor, { tipo: "cliente", compradorId: COMPRADOR, idempotencyKey: "k-x" });
      assert.equal(r.tipo === "rechazada" && r.motivo, "actor_no_autorizado");
    }
    assert.deepEqual(e.llamadas, []);
  });

  it("con el cobro vigente el comprador no puede cancelar: un pago tardío nunca cae sobre un pedido cancelado", async () => {
    const e = preparar();
    const p = await pedidoConCobro(e);
    const r = await aplicarComandoDePersona(e.deps, p.pedido_id, { tipo: "cancelar" }, comprador, { tipo: "cliente", compradorId: COMPRADOR, idempotencyKey: "k-c" });
    assert.equal(r.tipo === "rechazada" && r.motivo, "transicion_invalida");
    assert.equal(aplicada(await procesarNotificacionDePago(e.deps, { marcaId: MARCA_A, ...e.simulado.simularPago(p.cobro!.referencia_cobro) })).estado, "pagado");
  });
});

describe("contingencia manual (ADR-0003)", () => {
  it("pago informado por el comprador y confirmado solo por el responsable de la marca", async () => {
    const e = preparar();
    let p = await pedidoConCobro(e, "contingencia_manual");
    p = aplicada(await aplicarComandoDePersona(e.deps, p.pedido_id, { tipo: "informarPago" }, comprador, { tipo: "cliente", compradorId: COMPRADOR, idempotencyKey: "k-inf" }));
    assert.equal(p.estado, "pago_informado");
    const otraMarca = await aplicarComandoDePersona(e.deps, p.pedido_id, { tipo: "confirmarPago", evidencia: { via: "boton_marca" } }, responsableB, { tipo: "telegram_callback", callbackQueryId: "cb-b" });
    assert.equal(otraMarca.tipo === "bloqueada_por_omega" && otraMarca.motivo, "aislamiento_marca");
    const webhook = await procesarNotificacionDePago(e.deps, { marcaId: MARCA_A, ...e.simulado.simularPago(p.cobro!.referencia_cobro) });
    assert.equal(webhook.tipo, "rechazada");
    p = aplicada(await aplicarComandoDePersona(e.deps, p.pedido_id, { tipo: "confirmarPago", evidencia: { via: "boton_marca" } }, responsableA, { tipo: "telegram_callback", callbackQueryId: "cb-a" }));
    assert.equal(p.estado, "pagado");
    assert.deepEqual(e.base.eventos.at(-1)!.actor, responsableA);
  });
});

describe("compuerta Ω y agentes (rule_01, ADR-0002)", () => {
  it("un agente no crea, no confirma y no paga; la transacción no se ejecuta", async () => {
    const e = preparar();
    const p = await pedidoConCobro(e, "contingencia_manual");
    const antes = e.base.eventos.length;
    const crear = await registrarPedido(
      e.deps,
      { compradorId: COMPRADOR, marcaId: MARCA_A, galaxiaId: 4, items: itemsDe(MARCA_A), modalidad: "recogida_en_establecimiento" },
      agente,
      { tipo: "agente", conversacionId: "conv_1", turnoId: "turno_1", llamadaId: "l1" },
    );
    assert.equal(crear.tipo === "bloqueada_por_omega" && crear.motivo, "prohibicion_agente");
    for (const comando of [{ tipo: "informarPago" }, { tipo: "confirmarPago", evidencia: { via: "boton_marca" } }] as const) {
      const r = await aplicarComandoDePersona(e.deps, p.pedido_id, comando, agente, { tipo: "agente", conversacionId: "conv_1", turnoId: "turno_1", llamadaId: comando.tipo });
      assert.equal(r.tipo === "bloqueada_por_omega" && r.motivo, "prohibicion_agente", comando.tipo);
    }
    assert.equal(e.base.eventos.length, antes);
  });

  it("el registro rechaza un evento de agente sin sus metadatos (rule_03)", async () => {
    const e = preparar();
    const { modelo: _, ...sinModelo } = eventoDeAgente.actor;
    await assert.rejects(e.base.enTransaccion((tx) => tx.ledger.appendCanonicalEvent({ ...eventoDeAgente, actor: sinModelo } as never)), /Evento inválido/);
    assert.deepEqual(await e.base.enTransaccion((tx) => tx.ledger.appendCanonicalEvent(eventoDeAgente)), { resultado: "insertado" });
  });
});

describe("INV_05: nada externo con una transacción abierta", () => {
  it("el flujo llama al proveedor solo entre transacciones", async () => {
    const e = preparar();
    const p = await pedidoConCobro(e);
    await procesarNotificacionDePago(e.deps, { marcaId: MARCA_A, ...e.simulado.simularPago(p.cobro!.referencia_cobro) });
    await consultarCobroDelPedido(e.deps, p.pedido_id);
    assert.deepEqual(e.llamadas, ["emitirCobro", "validarNotificacion", "consultarCobro"]);
  });

  it("la prueba detecta una llamada al proveedor dentro de la transacción", async () => {
    const e = preparar();
    const p = await pedidoConCobro(e);
    await assert.rejects(
      e.base.enTransaccion(async () => e.deps.verificador.consultarCobro({ marcaId: MARCA_A, referenciaCobro: p.cobro!.referencia_cobro })),
      /INV_05/,
    );
  });
});

describe("concurrencia optimista", () => {
  it("si otro proceso cambia el pedido entre la lectura y la escritura, la transacción se revierte entera", async () => {
    const e = preparar();
    const p = await pedidoCreado(e);
    const antes = e.base.eventos.length;
    const carrera: MasterWriteDatabasePort = {
      enTransaccion: (trabajo) =>
        e.base.enTransaccion((tx) =>
          trabajo({
            ...tx,
            ledger: tx.ledger,
            leerPedidoParaDecidir: async (id) => {
              const leido = await tx.leerPedidoParaDecidir(id);
              const actual = e.base.pedidos.get(id)!;
              e.base.pedidos.set(id, { ...actual, version: actual.version + 1 });
              return leido;
            },
          }),
        ),
    };
    await assert.rejects(
      aplicarComandoDePersona({ ...e.deps, escritura: carrera }, p.pedido_id, { tipo: "cancelar" }, comprador, { tipo: "cliente", compradorId: COMPRADOR, idempotencyKey: "k-c" }),
      ConflictoDeVersion,
    );
    assert.equal(e.base.eventos.length, antes);
  });
});

describe("cortafuegos de visibilidad hacia Telegram (R03), con dos marcas", () => {
  it("cada marca recibe solo la vista filtrada de su pedido", async () => {
    const e = preparar();
    const enviados: { marcaId: string; vista: unknown }[] = [];
    const telegram: TelegramBrandPort = { enviarPedidoALaMarca: async (x) => void enviados.push(x) };
    const outbox: Actor = { tipo: "sistema", tarea: "outbox" };
    for (const [marca, clave] of [[MARCA_A, "k-a"], [MARCA_B, "k-b"]] as const) {
      const p = await pedidoConCobro(e, "automatica", marca, clave);
      const v = vistaParaLaMarca(p, { nombre: "Ana", celular: "+573001234567" }, outbox);
      assert.ok(v.tipo === "lista");
      await telegram.enviarPedidoALaMarca({ marcaId: marca, vista: v.vista });
    }
    assert.deepEqual(enviados.map((x) => x.marcaId), [MARCA_A, MARCA_B]);
    for (const { marcaId, vista } of enviados) {
      const r = validar("order-state-machine.schema.json", vista, "vista_para_marca");
      assert.ok(r.valido, r.errores);
      assert.ok((vista as Pedido).items.every((i) => i.marca_id === marcaId));
    }
  });
});
