// Tipos de ../schemas/galaxies-and-catalog.schema.json.
import type { GalaxiaId, Id } from "./comunes.ts";

export type Galaxia = { galaxia_id: GalaxiaId; nombre: string };

export type Variante = { variante_id: Id; nombre: string; precio_cop: number };

export type Producto = { producto_id: Id; marca_id: Id; nombre: string; variantes: Variante[] };

export type TipoDeOferta = { tipo_de_oferta_id: Id; nombre: string; productos: Producto[] };

/** El nicho es la subcategoría (decisión del usuario del 2026-10-27). */
export type Subcategoria = { subcategoria_id: Id; nombre: string; tipos_de_oferta: TipoDeOferta[] };

export type Interes = { interes_id: Id; nombre: string; subcategorias: Subcategoria[] };

export type Catalogo = { galaxia_id: GalaxiaId; intereses: Interes[] };

/** Año, mes y mitad del mes: "2026-10-2" es la segunda quincena de octubre de 2026. */
export type Quincena = string;

export type LiderDelNicho = { marca_id: Id; indice_de_relevancia: number };

export type MejorEvaluado = { marca_id: Id; calificacion_ajustada: number };

/**
 * Un nicho en una galaxia. El Líder del nicho (planeta central, por Índice de Relevancia) y el Mejor evaluado
 * (por calificación ajustada, ADR-0004) son conceptos distintos, aunque puedan coincidir en la misma marca.
 */
export type SistemaDelNicho = {
  galaxia_id: GalaxiaId;
  nicho_id: Id;
  quincena: Quincena;
  ventana_dias: 90;
  lider_del_nicho: LiderDelNicho | null;
  mejor_evaluado: MejorEvaluado | null;
  planetas: { marca_id: Id; indice_de_relevancia: number }[];
};
