// Ejemplos tipados de los contratos. `satisfies` hace que tsc falle si el tipo TypeScript cambia, y las pruebas
// los validan con Ajv contra el esquema: así tipos y esquemas no se separan.
import type {
  Catalogo,
  EventoCanonico,
  Item,
  Pedido,
  ResultadoPublico,
  SistemaDelNicho,
  SolicitudDeServicio,
  VectorPi,
  VistaDePedidoParaMarca,
} from "@planetario/contracts";

export const MARCA_A = "marca_a";
export const MARCA_B = "marca_b";
export const COMPRADOR = "comprador_1";

export const itemsDe = (marca: string): Item[] => [
  { producto_id: "hamburguesa", variante_id: "doble", marca_id: marca, nombre: "Hamburguesa doble", cantidad: 2, precio_unitario_cop: 15000 },
  { producto_id: "gaseosa", variante_id: "400ml", marca_id: marca, nombre: "Gaseosa 400 ml", cantidad: 1, precio_unitario_cop: 4000 },
];

export const pedidoDomicilio = {
  pedido_id: "019a2b3c-4d5e-7000-8000-000000000001",
  comprador_id: COMPRADOR,
  marca_id: MARCA_A,
  galaxia_id: 4,
  modalidad: "domicilio",
  direccion_entrega: { direccion: "Calle 5 # 10-20", barrio: "Centro" },
  items: itemsDe(MARCA_A),
  monto_cop: 34000,
  estado: "creado",
  version: 0,
  modo_confirmacion: "automatica",
  cobro: null,
  creado_en: "2026-12-10T15:00:00.000Z",
  actualizado_en: "2026-12-10T15:00:00.000Z",
} satisfies Pedido;

export const vistaParaMarca = {
  pedido_id: pedidoDomicilio.pedido_id,
  marca_id: MARCA_A,
  modalidad: "domicilio",
  estado: "pagado",
  comprador: { nombre: "Ana", celular: "+573001234567" },
  direccion_entrega: { direccion: "Calle 5 # 10-20" },
  items: itemsDe(MARCA_A),
  monto_cop: 34000,
} satisfies VistaDePedidoParaMarca;

export const solicitudDeServicio = {
  solicitud_id: "019a2b3c-4d5e-7000-8000-000000000002",
  comprador_id: COMPRADOR,
  marca_id: MARCA_B,
  galaxia_id: 2,
  producto_id: "corte_de_cabello",
  canal: "whatsapp",
  creada_en: "2026-12-10T15:00:00.000Z",
} satisfies SolicitudDeServicio;

export const catalogo = {
  galaxia_id: 4,
  intereses: [
    {
      interes_id: "comida",
      nombre: "Comida",
      subcategorias: [
        {
          subcategoria_id: "hamburguesas",
          nombre: "Hamburguesas",
          tipos_de_oferta: [
            {
              tipo_de_oferta_id: "a_la_parrilla",
              nombre: "A la parrilla",
              productos: [{ producto_id: "hamburguesa", marca_id: MARCA_A, nombre: "Hamburguesa", variantes: [{ variante_id: "doble", nombre: "Doble", precio_cop: 15000 }] }],
            },
          ],
        },
      ],
    },
  ],
} satisfies Catalogo;

export const sistemaDelNicho = {
  galaxia_id: 4,
  nicho_id: "hamburguesas",
  quincena: "2026-12-1",
  ventana_dias: 90,
  lider_del_nicho: { marca_id: MARCA_A, indice_de_relevancia: 78.5 },
  mejor_evaluado: { marca_id: MARCA_B, calificacion_ajustada: 4.6 },
  planetas: [
    { marca_id: MARCA_A, indice_de_relevancia: 78.5 },
    { marca_id: MARCA_B, indice_de_relevancia: 61 },
  ],
} satisfies SistemaDelNicho;

const publico = { posicion_indice: 1, calificacion_agregada: 4.6, lider_del_nicho: true, mejor_evaluado: false, nueva_en_el_nicho: false };

export const vectorPi = {
  pi_version: 1,
  galaxia_id: 4,
  nicho_id: "hamburguesas",
  franja: "almuerzo",
  posicion_registro: 1200,
  calculado_hasta: "2026-12-10T17:59:58.000Z",
  parametros_version: "g1-2026-10-26",
  marcas: [
    {
      marca_id: MARCA_A,
      publico,
      interno: {
        pedidos_recompra_90d: 37,
        compradores_unicos_90d: 120,
        recompra_hasta_posicion: 1198,
        theta_s: 1,
        alterna_para_desvio: false,
        carga_leida: { L_m: 0.41, marca_de_tiempo: "2026-12-10T17:59:58.000Z", posicion_registro: 1199 },
        cupo_exploracion: { elegible: false, orden_rotacion: null },
      },
    },
  ],
} satisfies VectorPi;

export const resultadoPublico = { galaxia_id: 4, nicho_id: "hamburguesas", marcas: [{ marca_id: MARCA_A, publico }] } satisfies ResultadoPublico;

export const eventoDeComprador = {
  event_id: "019a2b3c-4d5e-7000-8000-000000000003",
  idempotency_key: "cliente:abc-123/PedidoCreado",
  tipo: "PedidoCreado",
  agregado: { tipo: "pedido", id: pedidoDomicilio.pedido_id },
  marca_id: MARCA_A,
  actor: { tipo: "comprador", comprador_id: COMPRADOR },
  ocurrido_en: "2026-12-10T15:00:00.000Z",
  payload: { estado_nuevo: "creado" },
} satisfies EventoCanonico;

export const eventoDeAgente = {
  ...eventoDeComprador,
  idempotency_key: "agente:conv-1:turno-3:llamada-1/MiUniversoActualizado",
  tipo: "MiUniversoActualizado",
  agregado: { tipo: "comprador", id: COMPRADOR },
  actor: {
    tipo: "agente",
    agente: "mi_universo",
    version_contrato: "1.0.0",
    modelo: "claude-haiku-5-5",
    turno: { conversacion_id: "conv-1", turno_id: "turno-3" },
    en_nombre_de: { tipo: "comprador", id: COMPRADOR },
  },
} satisfies EventoCanonico;
