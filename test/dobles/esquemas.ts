// Validadores Ajv 8 (JSON Schema 2020-12, modo estricto) de los esquemas de packages/contracts, para las pruebas.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "../../packages/contracts/schemas");

const ajv = new Ajv2020({ strict: true, allErrors: true });
const ids: Record<string, string> = {};
for (const archivo of readdirSync(DIR).filter((f) => f.endsWith(".schema.json"))) {
  const esquema = JSON.parse(readFileSync(join(DIR, archivo), "utf8"));
  ajv.addSchema(esquema);
  ids[archivo] = esquema.$id;
}

/** Valida `dato` contra la definición `def` del esquema `archivo` (o contra su raíz si no se indica). */
export function validar(archivo: string, dato: unknown, def?: string): { valido: boolean; errores: string } {
  const id = ids[archivo];
  if (id === undefined) throw new Error(`No existe el esquema ${archivo}`);
  const v = ajv.getSchema(def === undefined ? id : `${id}#/$defs/${def}`);
  if (v === undefined) throw new Error(`No existe la definición ${def} en ${archivo}`);
  const valido = v(dato) as boolean;
  return { valido, errores: ajv.errorsText(v.errors) };
}

type EsquemaLeido = { $defs: Record<string, { enum?: unknown[]; properties?: Record<string, unknown> }> };

export function leerEsquema(archivo: string): EsquemaLeido {
  return JSON.parse(readFileSync(join(DIR, archivo), "utf8"));
}
