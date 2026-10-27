// Reputación y relevancia: solo lo decidido (respuesta del usuario del 2026-10-27, FG-08 D2).
// - Calificación bayesiana de ADR-0004 (P9).
// - Ponderación del Índice de Relevancia del kernel (reglas_nucleo.indice_y_calificacion), sobre componentes que ya
//   llegan normalizados en [0, 1]: cómo se normalizan compras, flujo y sedes está por decidir (PEN-18).
// - Carga operativa y amortiguación Θ_s de rule_02.

/** C de ADR-0004: evaluaciones con valor igual a la media del nicho que se suman a cada marca. G1 lo versiona (E06). */
export const C_INICIAL = 10;

export type EntradaCalificacionAjustada = {
  /** Media del nicho en la ventana de 90 días, entre 1 y 5. */
  mediaDelNicho: number;
  /** Suma de las notas de la marca en la ventana. */
  sumaDeNotas: number;
  /** Número de notas de la marca en la ventana. */
  numeroDeNotas: number;
  c?: number;
};

/** (C·m + suma de notas) / (C + n) (ADR-0004). Una marca sin notas arranca en la media del nicho. */
export function calificacionAjustada({ mediaDelNicho, sumaDeNotas, numeroDeNotas, c = C_INICIAL }: EntradaCalificacionAjustada): number {
  if (!(mediaDelNicho >= 1 && mediaDelNicho <= 5)) throw new RangeError("la media del nicho va de 1 a 5");
  if (!Number.isInteger(numeroDeNotas) || numeroDeNotas < 0) throw new RangeError("el número de notas es un entero no negativo");
  if (!(sumaDeNotas >= numeroDeNotas && sumaDeNotas <= 5 * numeroDeNotas)) throw new RangeError("la suma de notas debe quedar entre n y 5n");
  if (!(c > 0)) throw new RangeError("C debe ser positivo");
  return (c * mediaDelNicho + sumaDeNotas) / (c + numeroDeNotas);
}

/** Pesos del kernel: calificación 40, compras 30, flujo 20 y sedes 10. La calificación nunca se excluye. */
export const PESOS_DEL_INDICE = { calificacion: 0.4, compras: 0.3, flujo: 0.2, sedes: 0.1 } as const;

/** Componentes ya normalizados en [0, 1]; la normalización la define PEN-18. */
export type ComponentesNormalizados = { calificacion: number; compras: number; flujo: number; sedes: number };

/** Índice de Relevancia en [0, 100]. Rechaza componentes fuera de [0, 1]: normalizar no es tarea de esta función. */
export function indiceDeRelevancia(componentes: ComponentesNormalizados): number {
  for (const [nombre, valor] of Object.entries(componentes)) {
    if (!(valor >= 0 && valor <= 1)) throw new RangeError(`el componente ${nombre} debe llegar normalizado en [0, 1] (PEN-18)`);
  }
  const p = PESOS_DEL_INDICE;
  return 100 * (p.calificacion * componentes.calificacion + p.compras * componentes.compras + p.flujo * componentes.flujo + p.sedes * componentes.sedes);
}

/** Capacidad por defecto de una marca (T10). */
export const CAPACIDAD_POR_DEFECTO = 15;

/** L_m(t) = pedidos pendientes / capacidad (rule_02). */
export function cargaOperativa(pedidosPendientes: number, capacidad: number = CAPACIDAD_POR_DEFECTO): number {
  if (!Number.isInteger(pedidosPendientes) || pedidosPendientes < 0) throw new RangeError("los pedidos pendientes son un entero no negativo");
  if (!(capacidad > 0)) throw new RangeError("la capacidad debe ser positiva");
  return pedidosPendientes / capacidad;
}

/**
 * Θ_s(L) = min(1, max(0, (1 − L) / 0,10)): vale 1 hasta L = 0,90 y amortigua linealmente hasta 0 en L = 1 (rule_02).
 * Los extremos se devuelven exactos: en coma flotante (1 − 0,9) / 0,1 da 0,9999999999999998, no 1.
 */
export function thetaS(carga: number): number {
  if (!(carga >= 0)) throw new RangeError("la carga no puede ser negativa");
  if (carga <= 0.9) return 1;
  if (carga >= 1) return 0;
  return (1 - carga) / 0.1;
}
