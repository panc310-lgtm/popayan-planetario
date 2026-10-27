#!/usr/bin/env node
// Verificación de los contratos (AGENTS.md §4.5 y §5). Sobre packages/contracts/schemas:
//   C1  cada *.schema.json declara JSON Schema 2020-12 y el $id urn:popayan-planetario:contracts:<nombre>, y compila
//       con Ajv 8 en modo estricto, con todas sus definiciones ($defs).
//   C2  versiones.json lleva, por esquema, el historial de version_contrato con la huella SHA-256 de cada versión:
//       las versiones suben, las huellas no se repiten y la última es la del archivo actual. Un esquema que cambia
//       sin una versión nueva falla aquí.
// Las pruebas de ejemplos válidos e inválidos corren aparte con node --test (packages/contracts/test).
// Uso: node tools/verificar-contratos/verificar.mjs [--raiz CARPETA]   (--raiz revisa una copia; lo usan las pruebas)

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const argRaiz = process.argv.indexOf("--raiz");
const RAIZ = argRaiz > 0 ? resolve(process.argv[argRaiz + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = join(RAIZ, "packages/contracts/schemas");
const MANIFIESTO = join(DIR, "versiones.json");

const errores = [];
const error = (codigo, mensaje) => errores.push(`${codigo}: ${mensaje}`);
const huella = (texto) => createHash("sha256").update(texto.replace(/\r\n/g, "\n"), "utf8").digest("hex");
const semver = (v) => (/^\d+\.\d+\.\d+$/.test(v) ? v.split(".").map(Number) : null);
const mayor = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

if (!existsSync(DIR)) {
  console.error("No existe packages/contracts/schemas.");
  process.exit(1);
}
const archivos = readdirSync(DIR).filter((f) => f.endsWith(".schema.json")).sort();
if (!archivos.length) error("C1", "packages/contracts/schemas no tiene esquemas");

// C1
const ajv = new Ajv2020({ strict: true, allErrors: true });
const esquemas = {};
for (const archivo of archivos) {
  const texto = readFileSync(join(DIR, archivo), "utf8");
  let esquema;
  try {
    esquema = JSON.parse(texto);
  } catch (e) {
    error("C1", `${archivo} no es JSON válido: ${e.message}`);
    continue;
  }
  const nombre = archivo.replace(/\.schema\.json$/, "");
  if (esquema.$schema !== "https://json-schema.org/draft/2020-12/schema") error("C1", `${archivo} debe declarar JSON Schema 2020-12`);
  if (esquema.$id !== `urn:popayan-planetario:contracts:${nombre}`) error("C1", `${archivo} debe tener el $id urn:popayan-planetario:contracts:${nombre}`);
  try {
    ajv.addSchema(esquema);
    esquemas[archivo] = { esquema, texto };
  } catch (e) {
    error("C1", `${archivo} no se puede registrar: ${e.message}`);
  }
}
for (const [archivo, { esquema }] of Object.entries(esquemas)) {
  try {
    ajv.getSchema(esquema.$id);
    for (const def of Object.keys(esquema.$defs ?? {})) ajv.getSchema(`${esquema.$id}#/$defs/${def}`);
  } catch (e) {
    error("C1", `${archivo} no compila en modo estricto: ${e.message}`);
  }
}

// C2
let manifiesto = {};
try {
  manifiesto = JSON.parse(readFileSync(MANIFIESTO, "utf8"));
} catch (e) {
  error("C2", `falta o no es JSON válido packages/contracts/schemas/versiones.json: ${e.message}`);
}
for (const archivo of archivos) {
  const historial = manifiesto[archivo];
  if (!Array.isArray(historial) || !historial.length) {
    error("C2", `${archivo} no tiene historial en versiones.json`);
    continue;
  }
  const versiones = historial.map((h) => semver(h.version_contrato ?? ""));
  if (versiones.some((v) => v === null)) error("C2", `${archivo}: cada version_contrato es MAYOR.MENOR.PARCHE`);
  else for (let i = 1; i < versiones.length; i++) if (mayor(versiones[i], versiones[i - 1]) <= 0) error("C2", `${archivo}: la versión ${historial[i].version_contrato} no es mayor que ${historial[i - 1].version_contrato}`);
  const huellas = historial.map((h) => h.sha256);
  if (new Set(huellas).size !== huellas.length) error("C2", `${archivo}: dos versiones con la misma huella`);
  const ultima = historial.at(-1);
  const actual = esquemas[archivo] ? huella(esquemas[archivo].texto) : null;
  if (actual !== null && ultima.sha256 !== actual) {
    error("C2", `${archivo} cambió sin una version_contrato nueva: agrega a versiones.json una versión mayor que ${ultima.version_contrato} con sha256 ${actual} (cambio incompatible: ADR antes del código, AGENTS.md §4.5)`);
  }
}
for (const archivo of Object.keys(manifiesto)) if (!archivos.includes(archivo)) error("C2", `versiones.json lista ${archivo}, que no existe`);

if (errores.length) {
  console.error(`${errores.length} error(es) en los contratos:`);
  for (const e of errores) console.error(`  - ${e}`);
  process.exit(1);
}
const resumen = archivos.map((a) => `${a.replace(/\.schema\.json$/, "")} ${manifiesto[a].at(-1).version_contrato}`).join(", ");
console.log(`Contratos válidos en modo estricto, con su versión al día: ${resumen}.`);
