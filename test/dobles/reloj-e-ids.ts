// Dobles deterministas de ClockPort e IdGeneratorPort (S1) para las pruebas.
import type { ClockPort, IdGeneratorPort, Instante } from "@planetario/ports";

export type RelojManual = ClockPort & { avanzar(ms: number): void };

const instante = (ms: number): Instante => ({ ms, iso: new Date(ms).toISOString() });

export function relojManual(inicio = "2026-12-10T15:00:00.000Z"): RelojManual {
  let ms = Date.parse(inicio);
  return {
    ahora: () => instante(ms),
    sumar: (desde, delta) => instante(desde.ms + delta),
    avanzar: (delta) => {
      ms += delta;
    },
  };
}

/** UUIDv7 con el milisegundo del reloj y un contador: únicos, ordenados y siempre iguales entre corridas. */
export function idsSecuenciales(reloj: ClockPort): IdGeneratorPort {
  let n = 0;
  return {
    nuevoUuidV7() {
      const t = reloj.ahora().ms.toString(16).padStart(12, "0");
      const c = (n++).toString(16).padStart(18, "0");
      return `${t.slice(0, 8)}-${t.slice(8, 12)}-7${c.slice(0, 3)}-8${c.slice(3, 6)}-${c.slice(6, 18)}`;
    },
  };
}
