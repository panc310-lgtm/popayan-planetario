// Pruebas de los contratos: los ejemplos tipados validan, las variantes prohibidas no, y las constantes de src/
// coinciden con los esquemas.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CAMPOS_PERMITIDOS_HACIA_LA_MARCA, COMANDOS_DEL_PEDIDO, ESTADOS_DEL_PEDIDO, GALAXIAS, MODALIDADES, TRANSICIONES } from "@planetario/contracts";
import * as ej from "../../../test/dobles/ejemplos.ts";
import { leerEsquema, validar } from "../../../test/dobles/esquemas.ts";

const PEDIDO = "order-state-machine.schema.json";
const CATALOGO = "galaxies-and-catalog.schema.json";
const PI = "decision-vector-pi.schema.json";
const EVENTO = "canonical-event.schema.json";

const valido = (archivo: string, dato: unknown, def?: string) => {
  const r = validar(archivo, dato, def);
  assert.ok(r.valido, r.errores);
};
const invalido = (archivo: string, dato: unknown, def?: string) => assert.equal(validar(archivo, dato, def).valido, false);

describe("order-state-machine.schema.json", () => {
  it("acepta un pedido a domicilio", () => valido(PEDIDO, ej.pedidoDomicilio));

  it("exige la dirección en domicilio y la prohíbe en las otras modalidades (R03)", () => {
    const { direccion_entrega: _, ...sinDireccion } = ej.pedidoDomicilio;
    invalido(PEDIDO, sinDireccion);
    invalido(PEDIDO, { ...ej.pedidoDomicilio, modalidad: "recogida_en_establecimiento" });
    valido(PEDIDO, { ...sinDireccion, modalidad: "recogida_en_establecimiento" });
  });

  it("exige la hora estimada de llegada en el pedido anticipado (S20)", () => {
    const { direccion_entrega: _, ...base } = ej.pedidoDomicilio;
    invalido(PEDIDO, { ...base, modalidad: "pedido_anticipado" });
    valido(PEDIDO, { ...base, modalidad: "pedido_anticipado", hora_estimada_llegada: "2026-12-10T12:30:00-05:00" });
    invalido(PEDIDO, { ...ej.pedidoDomicilio, hora_estimada_llegada: "2026-12-10T12:30:00-05:00" });
  });

  it("rechaza estados, modalidades y campos que no existen", () => {
    invalido(PEDIDO, { ...ej.pedidoDomicilio, estado: "en_carrito" });
    invalido(PEDIDO, { ...ej.pedidoDomicilio, modalidad: "servicio_con_cita" });
    invalido(PEDIDO, { ...ej.pedidoDomicilio, carrito: [] });
    invalido(PEDIDO, { ...ej.pedidoDomicilio, items: [] });
    invalido(PEDIDO, { ...ej.pedidoDomicilio, pedido_id: "019a2b3c-4d5e-4000-8000-000000000001" });
  });

  it("la vista para la marca no admite datos del comprador fuera de R03", () => {
    valido(PEDIDO, ej.vistaParaMarca, "vista_para_marca");
    invalido(PEDIDO, { ...ej.vistaParaMarca, comprador_id: ej.COMPRADOR }, "vista_para_marca");
    invalido(PEDIDO, { ...ej.vistaParaMarca, comprador: { ...ej.vistaParaMarca.comprador, correo: "ana@example.com" } }, "vista_para_marca");
    const { direccion_entrega: _, ...sinDireccion } = ej.vistaParaMarca;
    invalido(PEDIDO, { ...ej.vistaParaMarca, modalidad: "recogida_en_establecimiento" }, "vista_para_marca");
    valido(PEDIDO, { ...sinDireccion, modalidad: "recogida_en_establecimiento" }, "vista_para_marca");
  });

  it("la solicitud de servicio va por WhatsApp y no es un pedido (E61)", () => {
    valido(PEDIDO, ej.solicitudDeServicio, "solicitud_de_servicio");
    invalido(PEDIDO, { ...ej.solicitudDeServicio, canal: "plataforma" }, "solicitud_de_servicio");
    invalido(PEDIDO, { ...ej.solicitudDeServicio, estado: "creado" }, "solicitud_de_servicio");
  });

  it("las constantes de src/pedido.ts coinciden con el esquema", () => {
    const esquema = leerEsquema(PEDIDO);
    assert.deepEqual([...ESTADOS_DEL_PEDIDO], esquema.$defs.estado!.enum);
    assert.deepEqual([...MODALIDADES], esquema.$defs.modalidad!.enum);
    assert.deepEqual([...CAMPOS_PERMITIDOS_HACIA_LA_MARCA].sort(), Object.keys(esquema.$defs.vista_para_marca!.properties!).sort());
  });
});

describe("tabla de transiciones de P4 (ADR-0003)", () => {
  const estados: readonly string[] = ESTADOS_DEL_PEDIDO;

  it("solo usa estados y comandos declarados", () => {
    for (const t of TRANSICIONES) {
      assert.ok(COMANDOS_DEL_PEDIDO.includes(t.comando), t.comando);
      assert.ok(estados.includes(t.hacia), t.hacia);
      for (const d of t.desde) assert.ok(estados.includes(d), d);
    }
  });

  it("pago_informado solo existe en la contingencia manual", () => {
    for (const t of TRANSICIONES.filter((t) => t.hacia === "pago_informado" || t.desde.includes("pago_informado"))) {
      assert.equal(t.modo, "contingencia_manual", `${t.comando} desde ${t.desde.join(", ")}`);
    }
  });

  it("solo confirmarPago lleva a pagado (R10)", () => {
    assert.deepEqual([...new Set(TRANSICIONES.filter((t) => t.hacia === "pagado").map((t) => t.comando))], ["confirmarPago"]);
  });

  it("todo estado se alcanza desde creado y solo cancelado, reembolsado y evaluado son finales", () => {
    const alcanzados = new Set<string>(["creado"]);
    for (let cambio = true; cambio; ) {
      cambio = false;
      for (const t of TRANSICIONES) {
        if (t.desde.some((d) => alcanzados.has(d)) && !alcanzados.has(t.hacia)) {
          alcanzados.add(t.hacia);
          cambio = true;
        }
      }
    }
    assert.deepEqual([...alcanzados].sort(), [...estados].sort());
    const finales = estados.filter((e) => !TRANSICIONES.some((t) => t.desde.includes(e as never)));
    assert.deepEqual(finales.sort(), ["cancelado", "evaluado", "reembolsado"]);
  });
});

describe("galaxies-and-catalog.schema.json", () => {
  it("acepta el catálogo jerárquico y el sistema del nicho", () => {
    valido(CATALOGO, ej.catalogo);
    valido(CATALOGO, ej.sistemaDelNicho, "sistema_del_nicho");
  });

  it("solo hay 9 galaxias", () => {
    assert.deepEqual([...GALAXIAS], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    invalido(CATALOGO, { ...ej.catalogo, galaxia_id: 10 });
    invalido(CATALOGO, { ...ej.catalogo, galaxia_id: 0 });
  });

  it("el Líder del nicho y el Mejor evaluado son campos distintos, con su propia métrica", () => {
    invalido(CATALOGO, { ...ej.sistemaDelNicho, lider_del_nicho: { marca_id: ej.MARCA_A, calificacion_ajustada: 4.6 } }, "sistema_del_nicho");
    invalido(CATALOGO, { ...ej.sistemaDelNicho, ventana_dias: 30 }, "sistema_del_nicho");
    valido(CATALOGO, { ...ej.sistemaDelNicho, lider_del_nicho: null, mejor_evaluado: null, planetas: [] }, "sistema_del_nicho");
  });

  it("un producto necesita al menos una variante con precio", () => {
    const producto = { producto_id: "x", marca_id: ej.MARCA_A, nombre: "X", variantes: [] };
    invalido(CATALOGO, producto, "producto");
  });
});

describe("decision-vector-pi.schema.json", () => {
  it("acepta el vector completo y el resultado público", () => {
    valido(PI, ej.vectorPi);
    valido(PI, ej.resultadoPublico, "resultado_publico");
  });

  it("el resultado público no admite el bloque interno (R04, S12)", () => {
    const conInterno = { ...ej.resultadoPublico, marcas: [{ ...ej.vectorPi.marcas[0] }] };
    invalido(PI, conInterno, "resultado_publico");
  });

  it("el bloque público no admite datos de operación", () => {
    const marca = ej.vectorPi.marcas[0]!;
    invalido(PI, { ...ej.vectorPi, marcas: [{ ...marca, publico: { ...marca.publico, theta_s: 1 } }] });
  });
});

describe("canonical-event.schema.json (INV_02, rule_03)", () => {
  it("acepta un evento de una persona y uno de un agente con sus metadatos", () => {
    valido(EVENTO, ej.eventoDeComprador);
    valido(EVENTO, ej.eventoDeAgente);
  });

  it("un evento de agente sin modelo, turno, versión del contrato o sesión se rechaza (rule_03)", () => {
    for (const campo of ["modelo", "turno", "version_contrato", "en_nombre_de", "agente"]) {
      const { [campo as keyof typeof ej.eventoDeAgente.actor]: _, ...actor } = ej.eventoDeAgente.actor;
      invalido(EVENTO, { ...ej.eventoDeAgente, actor });
    }
  });

  it("event_id es UUIDv7 y la posición canónica no viaja en el evento (INV_01, INV_02)", () => {
    invalido(EVENTO, { ...ej.eventoDeComprador, event_id: "019a2b3c-4d5e-4000-8000-000000000003" });
    invalido(EVENTO, { ...ej.eventoDeComprador, posicion: 42 });
    invalido(EVENTO, { ...ej.eventoDeComprador, idempotency_key: "sin-prefijo" });
  });
});
