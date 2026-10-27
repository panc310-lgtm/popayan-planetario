#!/usr/bin/env node
// Pruebas del validador de la arquitectura y de la compuerta de capacidad.
// Cada caso copia arquitectura/, docs/, tools/, .claude/, .github/, packages/, test/, AGENTS.md y package.json a una carpeta
// temporal, introduce un error, y exige que
// validar.mjs falle con el código esperado. Los casos de capacidad regeneran el modelo de carga en la copia y exigen que
// calcular.mjs --estricto falle con el mensaje esperado. Los archivos del repositorio nunca se modifican.
// Uso: node tools/validar-arquitectura/pruebas.mjs

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const VALIDADOR = join(RAIZ, "tools/validar-arquitectura/validar.mjs");
const CARPETAS = ["arquitectura", "docs", "tools", ".claude", ".github", "packages", "test", "AGENTS.md", "package.json"];

const RUTAS = {
  kernel: "arquitectura/kernel-durable.json",
  grafo: "arquitectura/grafo-operacional.json",
  modelo: "arquitectura/modelo-de-carga.json",
  indice: "docs/adr/README.md",
  agents: "AGENTS.md",
  plantilla: "docs/agentes/plantillas/doble-salida.md",
  paquete: "package.json",
  workflow: ".github/workflows/verificaciones.yml",
  fg05: "docs/fuentes/gemini/FG-05-texto-original.md",
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
  ["AGENTS.md cita un modelo de carga desalineado", "V3", texto("agents", (t) => t.replace(/modelo de carga `v\d+\.\d+`/, "modelo de carga `v0.0`"))],
  ["plantilla COMPLETADO con una verificación en rojo", "PL1", texto("plantilla", (t) => t.replace('"resultado": "VERDE"', '"resultado": "ROJO"'))],
  ["servicio sin presupuesto de conexiones en modo sesión", "M4", json("modelo", (d) => { delete d.parametros.conexiones_sesion_worker_por_replica; })],
  ["presupuesto de conexiones sin modo del pooler", "M4", json("modelo", (d) => { d.parametros.conexiones_api_por_replica = d.parametros.conexiones_sesion_api_por_replica; })],
  ["texto original alterado", "F3", texto("fg05", (t) => t.replace("Theta_s", "Theta_x"))],
  ["huella CRLF alterada", "F3", texto("fg05", (t) => t.replace(/(\| T2 \|.*`)([0-9a-f])([0-9a-f]{63}`[^|]*CRLF)/, (_, a, b, c) => `${a}${b === "0" ? "1" : "0"}${c}`))],
  ["fase de código sin el script verify:3d-budgets", "DT1", json("paquete", (d) => { delete d.scripts["verify:3d-budgets"]; })],
  ["fase de código sin test:integral en la integración continua", "DT1", texto("workflow", (t) => t.replace("run: npm run test:integral", "run: echo omitido"))],
  ["AGENTS.md cita un archivo de packages/ que no existe", "F2", texto("agents", (t) => `${t}\nVer packages/domain/src/inexistente.ts.\n`)],
  ["huella con salto de línea final alterada", "F3", texto("fg05", (t) => t.replace(/(\| T1 \|.*`)([0-9a-f])([0-9a-f]{63}`[^|]*salto de línea final)/, (_, a, b, c) => `${a}${b === "0" ? "1" : "0"}${c}`))],
];

// Compuerta de capacidad: calcular.mjs --estricto (AGENTS.md §5). Cada caso exige que falle con el texto esperado.
const CASOS_CAPACIDAD = [
  ["copia sin cambios", null, () => {}],
  ["nodo de infraestructura entre ρ 0,7 y 0,9", "Nodo de infraestructura en ρ ≥ 0,7", json("grafo", (d) => { nodo(d, "D1").capacidad.mu_por_s = 1700; })],
  ["conexiones por encima de los 200 clientes del pooler", "Las conexiones a la base no caben", json("modelo", (d) => { d.parametros.conexiones_transaccion_api_por_replica.valores.capacidad = 60; })],
  ["clientes de sesión por encima del pool size de Supavisor", "Las conexiones a la base no caben", json("modelo", (d) => { d.parametros.conexiones_sesion_api_por_replica.valores.capacidad = 2; })],
  ["pico con 60 conexiones directas: el usuario pidió menos de 60", "Las conexiones a la base no caben", json("modelo", (d) => { d.parametros.conexiones_reservadas_supabase.valores.capacidad = 23; })],
  ["MVP por encima de las 60 conexiones directas de Micro", "Las conexiones a la base no caben", json("modelo", (d) => { d.parametros.conexiones_reservadas_supabase.valores.mvp = 50; })],
];

let fallas = 0;
for (const [nombre, codigo, mutar] of CASOS) {
  const dir = mkdtempSync(join(tmpdir(), "validar-arquitectura-"));
  try {
    for (const c of CARPETAS) cpSync(join(RAIZ, c), join(dir, c), { recursive: true, filter: (f) => !f.includes("node_modules") });
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
for (const [nombre, esperado, mutar] of CASOS_CAPACIDAD) {
  const dir = mkdtempSync(join(tmpdir(), "validar-capacidad-"));
  try {
    for (const c of CARPETAS) cpSync(join(RAIZ, c), join(dir, c), { recursive: true, filter: (f) => !f.includes("node_modules") });
    mutar(dir);
    const calcular = join(dir, "tools/modelo-de-carga/calcular.mjs"); // la copia: su raíz es la carpeta temporal
    const regenerado = spawnSync(process.execPath, [calcular], { encoding: "utf8" });
    const r = spawnSync(process.execPath, [calcular, "--estricto"], { encoding: "utf8" });
    const salida = `${regenerado.stderr}${r.stdout}${r.stderr}`;
    const ok = regenerado.status === 0 && (esperado === null ? r.status === 0 : r.status === 1 && salida.includes(esperado));
    if (!ok) fallas++;
    console.log(`${ok ? "ok   " : "FALLA"} ${(esperado === null ? "válido" : "estricto").padEnd(9)} ${nombre}`);
    if (!ok) console.log(`      salida: ${salida.trim().split(/\r?\n/).slice(0, 4).join(" | ")}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const total = CASOS.length + CASOS_CAPACIDAD.length;
console.log(fallas ? `${fallas} de ${total} casos fallaron.` : `${total} casos correctos.`);
process.exit(fallas ? 1 : 0);
