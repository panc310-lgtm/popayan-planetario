#!/usr/bin/env node
// Pruebas del validador de la arquitectura.
// Cada caso copia arquitectura/, docs/, tools/, .claude/ y AGENTS.md a una carpeta temporal, introduce un error, y exige que
// validar.mjs falle con el código esperado. Los archivos del repositorio nunca se modifican.
// Uso: node tools/validar-arquitectura/pruebas.mjs

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const VALIDADOR = join(RAIZ, "tools/validar-arquitectura/validar.mjs");
const CARPETAS = ["arquitectura", "docs", "tools", ".claude", "AGENTS.md"];

const RUTAS = {
  kernel: "arquitectura/kernel-durable.json",
  grafo: "arquitectura/grafo-operacional.json",
  modelo: "arquitectura/modelo-de-carga.json",
  indice: "docs/adr/README.md",
  agents: "AGENTS.md",
};

// Mutaciones: cada una recibe la carpeta temporal y modifica un archivo.
const json = (archivo, cambiar) => (dir) => {
  const ruta = join(dir, RUTAS[archivo]);
  const d = JSON.parse(readFileSync(ruta, "utf8"));
  cambiar(d);
  writeFileSync(ruta, JSON.stringify(d, null, 2), "utf8");
};
const texto = (archivo, cambiar) => (dir) => {
  const ruta = join(dir, RUTAS[archivo]);
  writeFileSync(ruta, cambiar(readFileSync(ruta, "utf8")), "utf8");
};
const nodo = (d, id) => d.nodos.find((n) => n.id === id);
const arista = (d, id) => d.aristas.find((a) => a.id === id);

const CASOS = [
  ["copia sin cambios", null, () => {}],
  ["tipo de nodo inválido", "E-ESQUEMA", json("grafo", (d) => { nodo(d, "P2").tipo = "microservicio"; })],
  ["propiedad no declarada", "E-ESQUEMA", json("kernel", (d) => { d.campo_inventado = "x"; })],
  ["nodo repetido", "G1", json("grafo", (d) => { d.nodos.push({ ...nodo(d, "P2") }); })],
  ["gobierno inexistente", "G2", json("grafo", (d) => { nodo(d, "P3").gobernado_por = "G9"; })],
  ["arista hacia un nodo inexistente", "G3", json("grafo", (d) => { arista(d, "E21").destino = "P99"; })],
  ["arista entre marcas sin misma_marca", "G4", json("grafo", (d) => { arista(d, "E57").alcance = "marca"; })],
  ["servicio no declarado", "G5", json("grafo", (d) => { nodo(d, "P2").capacidad.servicio = "pagos"; })],
  ["métrica que nombra una arista inexistente", "G6", json("grafo", (d) => { d.telemetria[0].objeto = "E99"; })],
  ["parámetro sin valor para un escenario", "M1", json("modelo", (d) => { delete d.parametros.duracion_sesion_s.valores.diseno; })],
  ["tipo incoherente en el mapa de capacidad", "M2", json("modelo", (d) => { d.mapa_de_capacidad.find((m) => m.nodo === "A2").tipo = "infraestructura"; })],
  ["arista inexistente en el mapa de aristas", "M3", json("modelo", (d) => { d.mapa_de_aristas[0].arista = "E99"; })],
  ["versión desalineada", "V1", json("grafo", (d) => { d.alineado_con = "arquitectura/kernel-durable.json (0.0.0-DURABLE-KERNEL)"; })],
  ["versión sin changelog", "V2", json("grafo", (d) => { d.version = "9.9"; })],
  ["ruta citada que no existe", "F1", json("kernel", (d) => { d.estado += " Ver docs/inexistente.md."; })],
  ["estado del ADR distinto en el índice", "A1", texto("indice", (t) => t.replace(/(\| \[ADR-0001\]\([^)]+\) \| [^|]+\| )Aprobada/, "$1Propuesta"))],
  ["AGENTS.md cita una ruta que no existe", "F2", texto("agents", (t) => `${t}\nVer docs/agentes/inexistente.md.\n`)],
  ["AGENTS.md cita un ADR que no está en el índice", "F2", texto("agents", (t) => `${t}\nVer ADR-0099.\n`)],
  ["AGENTS.md cita un kernel desalineado", "V3", texto("agents", (t) => t.replaceAll(/\d+\.\d+\.\d+-DURABLE-KERNEL/g, "0.0.0-DURABLE-KERNEL"))],
  ["AGENTS.md cita un grafo desalineado", "V3", texto("agents", (t) => t.replace(/grafo operacional `v\d+\.\d+`/, "grafo operacional `v0.0`"))],
];

let fallas = 0;
for (const [nombre, codigo, mutar] of CASOS) {
  const dir = mkdtempSync(join(tmpdir(), "validar-arquitectura-"));
  try {
    for (const c of CARPETAS) cpSync(join(RAIZ, c), join(dir, c), { recursive: true });
    mutar(dir);
    const r = spawnSync(process.execPath, [VALIDADOR, "--raiz", dir], { encoding: "utf8" });
    const salida = `${r.stdout}${r.stderr}`;
    const ok = codigo === null ? r.status === 0 : r.status === 1 && salida.includes(`${codigo}:`);
    if (!ok) fallas++;
    console.log(`${ok ? "ok   " : "FALLA"} ${(codigo ?? "válido").padEnd(9)} ${nombre}`);
    if (!ok) console.log(`      salida: ${salida.trim().split(/\r?\n/).slice(0, 4).join(" | ")}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
console.log(fallas ? `${fallas} de ${CASOS.length} casos fallaron.` : `${CASOS.length} casos correctos.`);
process.exit(fallas ? 1 : 0);
