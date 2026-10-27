#!/usr/bin/env node
// Pruebas de la verificación de contratos. Cada caso copia packages/contracts a una carpeta temporal, introduce un
// error y exige que verificar.mjs falle con el código esperado. Los archivos del repositorio nunca se modifican.
// Uso: node tools/verificar-contratos/pruebas.mjs

import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFICADOR = join(RAIZ, "tools/verificar-contratos/verificar.mjs");
const PEDIDO = "packages/contracts/schemas/order-state-machine.schema.json";
const VERSIONES = "packages/contracts/schemas/versiones.json";

const editarJson = (ruta, cambiar) => (dir) => {
  const p = join(dir, ruta);
  const d = JSON.parse(readFileSync(p, "utf8"));
  cambiar(d);
  writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
};
const editarTexto = (ruta, cambiar) => (dir) => {
  const p = join(dir, ruta);
  writeFileSync(p, cambiar(readFileSync(p, "utf8")));
};
const amplia = (t) => t.replace('"maximum": 99', '"maximum": 199');

const CASOS = [
  ["copia sin cambios", null, () => {}],
  ["palabra clave desconocida: falla en modo estricto", "C1", editarJson(PEDIDO, (d) => { d.$defs.item.properties.cantidad.formato_libre = true; })],
  ["$id que no corresponde al archivo", "C1", editarJson(PEDIDO, (d) => { d.$id = "urn:popayan-planetario:contracts:otro"; })],
  ["borrador de JSON Schema distinto de 2020-12", "C1", editarJson(PEDIDO, (d) => { d.$schema = "http://json-schema.org/draft-07/schema#"; })],
  ["esquema que cambia sin version_contrato nueva", "C2", editarTexto(PEDIDO, amplia)],
  ["versión nueva que no sube", "C2", (dir) => {
    editarTexto(PEDIDO, amplia)(dir);
    const texto = readFileSync(join(dir, PEDIDO), "utf8");
    editarJson(VERSIONES, (d) => {
      const historial = d["order-state-machine.schema.json"];
      historial.push({ version_contrato: historial.at(-1).version_contrato, sha256: createHash("sha256").update(texto).digest("hex") });
    })(dir);
  }],
  ["esquema sin historial", "C2", editarJson(VERSIONES, (d) => { delete d["canonical-event.schema.json"]; })],
  ["historial de un esquema que no existe", "C2", editarJson(VERSIONES, (d) => { d["inexistente.schema.json"] = d["canonical-event.schema.json"]; })],
  ["versión nueva bien registrada: pasa", null, (dir) => {
    editarTexto(PEDIDO, amplia)(dir);
    const texto = readFileSync(join(dir, PEDIDO), "utf8");
    editarJson(VERSIONES, (d) => {
      const historial = d["order-state-machine.schema.json"];
      const [mayor, menor] = historial.at(-1).version_contrato.split(".").map(Number);
      historial.push({ version_contrato: `${mayor}.${menor + 1}.0`, sha256: createHash("sha256").update(texto).digest("hex") });
    })(dir);
  }],
];

let fallas = 0;
for (const [nombre, codigo, mutar] of CASOS) {
  const dir = mkdtempSync(join(tmpdir(), "verificar-contratos-"));
  try {
    cpSync(join(RAIZ, "packages/contracts"), join(dir, "packages/contracts"), { recursive: true });
    mutar(dir);
    const r = spawnSync(process.execPath, [VERIFICADOR, "--raiz", dir], { encoding: "utf8" });
    const salida = `${r.stdout}${r.stderr}`;
    const ok = codigo === null ? r.status === 0 : r.status === 1 && salida.includes(`${codigo}:`);
    if (!ok) fallas++;
    console.log(`${ok ? "ok   " : "FALLA"} ${(codigo ?? "válido").padEnd(7)} ${nombre}`);
    if (!ok) console.log(`      salida: ${salida.trim().split(/\r?\n/).slice(0, 4).join(" | ")}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
console.log(fallas ? `${fallas} de ${CASOS.length} casos fallaron.` : `${CASOS.length} casos correctos.`);
process.exit(fallas ? 1 : 0);
