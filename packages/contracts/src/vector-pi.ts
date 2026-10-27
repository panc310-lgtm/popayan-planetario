// Tipos de ../schemas/decision-vector-pi.schema.json (P13, E68, R04, S12).
import type { FechaHora, GalaxiaId, Id } from "./comunes.ts";

/** Datos públicos según R04: posición en el índice y calificación agregada, con sus insignias. */
export type BloquePublico = {
  posicion_indice: number;
  calificacion_agregada: number | null;
  lider_del_nicho: boolean;
  mejor_evaluado: boolean;
  nueva_en_el_nicho: boolean;
};

/** Derivados para ordenar; no se muestran al comprador mientras no se amplíe R04 (S12). */
export type BloqueInterno = {
  pedidos_recompra_90d: number;
  compradores_unicos_90d: number;
  recompra_hasta_posicion: number;
  theta_s: number;
  alterna_para_desvio: boolean;
  carga_leida: { L_m: number; marca_de_tiempo: FechaHora; posicion_registro: number };
  cupo_exploracion: { elegible: boolean; orden_rotacion: number | null };
};

/** Vector Π completo, tal como vive en D4. */
export type VectorPi = {
  pi_version: number;
  galaxia_id: GalaxiaId;
  nicho_id: Id;
  franja: string;
  posicion_registro: number;
  calculado_hasta: FechaHora;
  parametros_version: string;
  marcas: { marca_id: Id; publico: BloquePublico; interno: BloqueInterno }[];
};

/** Lo único que P3 entrega hacia el agente del usuario y la interfaz. */
export type ResultadoPublico = {
  galaxia_id: GalaxiaId;
  nicho_id: Id;
  marcas: { marca_id: Id; publico: BloquePublico }[];
};
