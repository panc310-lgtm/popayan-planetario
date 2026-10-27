// Tipos comunes de los contratos. Reflejan los $defs que se repiten en los esquemas de ../schemas/.

/** Comuna urbana de Popayán: g ∈ {1..9}. */
export type GalaxiaId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const GALAXIAS: readonly GalaxiaId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Identificador corto: letras, dígitos, guion y guion bajo (patrón `id` de los esquemas). */
export type Id = string;

/** UUIDv7 en minúsculas (INV_02: event_id generado en la aplicación). */
export type UuidV7 = string;

/** Fecha y hora ISO 8601 con zona horaria. */
export type FechaHora = string;

export const PATRON_ID = /^[A-Za-z0-9_-]{1,64}$/;
export const PATRON_UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
