// Cortafuegos de visibilidad (R03, kernel brand_visibility_firewall): la marca recibe en Telegram solo el nombre y el
// celular del comprador, la dirección de entrega en domicilio y el detalle de su propio pedido.
import type { CamposPorModalidad, Pedido, VistaDePedidoParaMarca } from "@planetario/contracts";

export type DatosDeContactoDelComprador = { nombre: string; celular: string };

export type ResultadoDeProyeccion =
  | { tipo: "proyectada"; vista: VistaDePedidoParaMarca }
  | { tipo: "rechazada"; motivo: "item_de_otra_marca"; detalle: string };

/**
 * Arma la vista con una lista cerrada de campos: lo que no está aquí no llega a la marca, aunque el pedido lo tenga.
 * Un ítem de otra marca no se filtra en silencio: es un pedido mal formado (una marca por pedido) y se rechaza.
 */
export function proyectarPedidoParaMarca(pedido: Pedido, comprador: DatosDeContactoDelComprador): ResultadoDeProyeccion {
  const ajeno = pedido.items.find((i) => i.marca_id !== pedido.marca_id);
  if (ajeno) return { tipo: "rechazada", motivo: "item_de_otra_marca", detalle: `el ítem ${ajeno.producto_id} es de la marca ${ajeno.marca_id}` };

  let campos: CamposPorModalidad;
  if (pedido.modalidad === "domicilio") campos = { modalidad: "domicilio", direccion_entrega: { ...pedido.direccion_entrega } };
  else if (pedido.modalidad === "pedido_anticipado") campos = { modalidad: "pedido_anticipado", hora_estimada_llegada: pedido.hora_estimada_llegada };
  else campos = { modalidad: "recogida_en_establecimiento" };

  return {
    tipo: "proyectada",
    vista: {
      pedido_id: pedido.pedido_id,
      marca_id: pedido.marca_id,
      estado: pedido.estado,
      comprador: { nombre: comprador.nombre, celular: comprador.celular },
      ...campos,
      items: pedido.items.map((i) => ({ ...i })),
      monto_cop: pedido.monto_cop,
    },
  };
}
