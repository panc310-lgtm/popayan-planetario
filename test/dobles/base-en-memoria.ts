// Doble en memoria de MasterWriteDatabasePort con transacciones de verdad: los cambios se confirman al terminar el
// trabajo y se descartan si lanza. El registro aplica UNIQUE(idempotency_key) y compara el contenido (INV_02), y
// valida cada evento contra canonical-event.schema.json (rule_03).
import type { EventoCanonico, Pedido } from "@planetario/contracts";
import type { MasterWriteDatabasePort, ResultadoDelAppend, TransaccionDeEscritura } from "@planetario/ports";
import { validar } from "./esquemas.ts";

export type BaseEnMemoria = MasterWriteDatabasePort & {
  readonly pedidos: Map<string, Pedido>;
  readonly eventos: EventoCanonico[];
  /** true mientras hay una transacción abierta: lo usan las pruebas de INV_05. */
  readonly transaccionAbierta: boolean;
};

const copia = <T>(x: T): T => structuredClone(x);
// INV_02: la clave repetida con el mismo tipo y el mismo payload es un reintento; con otro contenido, un conflicto.
const contenido = (e: EventoCanonico) => JSON.stringify({ tipo: e.tipo, payload: e.payload });

export function baseEnMemoria(): BaseEnMemoria {
  const pedidos = new Map<string, Pedido>();
  const eventos: EventoCanonico[] = [];
  let abiertas = 0;

  return {
    pedidos,
    eventos,
    get transaccionAbierta() {
      return abiertas > 0;
    },
    async enTransaccion<T>(trabajo: (tx: TransaccionDeEscritura) => Promise<T>): Promise<T> {
      abiertas++;
      const pendientes = new Map<string, Pedido>();
      const nuevos: EventoCanonico[] = [];
      const vigente = (id: string) => pendientes.get(id) ?? pedidos.get(id);
      const tx: TransaccionDeEscritura = {
        async leerPedidoParaDecidir(id) {
          const p = vigente(id);
          return p === undefined ? null : copia(p);
        },
        async leerPedidoPorCobroParaDecidir({ marcaId, referenciaCobro }) {
          const ids = new Set([...pedidos.keys(), ...pendientes.keys()]);
          for (const id of ids) {
            const p = vigente(id);
            if (p !== undefined && p.marca_id === marcaId && p.cobro?.referencia_cobro === referenciaCobro) return copia(p);
          }
          return null;
        },
        async insertarPedido(p) {
          if (vigente(p.pedido_id) !== undefined) throw new Error(`El pedido ${p.pedido_id} ya existe`);
          const r = validar("order-state-machine.schema.json", p);
          if (!r.valido) throw new Error(`Pedido inválido: ${r.errores}`);
          pendientes.set(p.pedido_id, copia(p));
        },
        async guardarPedido(p, versionEsperada) {
          const actual = vigente(p.pedido_id);
          if (actual === undefined || actual.version !== versionEsperada) return "version_distinta";
          const r = validar("order-state-machine.schema.json", p);
          if (!r.valido) throw new Error(`Pedido inválido: ${r.errores}`);
          pendientes.set(p.pedido_id, copia(p));
          return "guardado";
        },
        ledger: {
          async appendCanonicalEvent(e): Promise<ResultadoDelAppend> {
            const r = validar("canonical-event.schema.json", e);
            if (!r.valido) throw new Error(`Evento inválido: ${r.errores}`);
            const previo = [...eventos, ...nuevos].find((x) => x.idempotency_key === e.idempotency_key);
            if (previo !== undefined) return { resultado: contenido(previo) === contenido(e) ? "duplicado" : "conflicto" };
            nuevos.push(copia(e));
            return { resultado: "insertado" };
          },
        },
      };
      try {
        const resultado = await trabajo(tx);
        for (const [id, p] of pendientes) pedidos.set(id, p);
        eventos.push(...nuevos);
        return resultado;
      } finally {
        abiertas--;
      }
    },
  };
}
