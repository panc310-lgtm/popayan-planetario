#!/usr/bin/env node
// Pruebas de los presupuestos 3D. Cada caso arma una copia mínima del repositorio (el kernel) en una carpeta temporal,
// escribe GLB sintéticos y exige que verificar.mjs falle con el código esperado o pase. Demuestran que la verificación
// detecta lo que dice aunque hoy el repositorio no tenga activos. Uso: node tools/verificar-presupuestos-3d/pruebas.mjs

import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFICADOR = join(RAIZ, "tools/verificar-presupuestos-3d/verificar.mjs");
const MB = 1_000_000;

/** GLB 2.0 mínimo: una malla de `triangulos` triángulos con índices, imágenes externas opcionales y relleno binario. */
function glb({ triangulos = 1000, relleno = 0, imagenes = [], modo = 4 } = {}) {
  const gltf = {
    asset: { version: "2.0" },
    accessors: [
      { componentType: 5125, count: modo === 4 ? triangulos * 3 : triangulos + 2, type: "SCALAR" },
      { componentType: 5126, count: 3, type: "VEC3" },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 1 }, indices: 0, mode: modo }] }],
    images: imagenes.map((uri) => ({ uri })),
  };
  let json = Buffer.from(JSON.stringify(gltf), "utf8");
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const bin = Buffer.alloc(relleno + ((4 - (relleno % 4)) % 4));
  const bloques = [cabeceraBloque(json.length, 0x4e4f534a), json];
  if (bin.length) bloques.push(cabeceraBloque(bin.length, 0x004e4942), bin);
  const cuerpo = Buffer.concat(bloques);
  const cabecera = Buffer.alloc(12);
  cabecera.writeUInt32LE(0x46546c67, 0);
  cabecera.writeUInt32LE(2, 4);
  cabecera.writeUInt32LE(12 + cuerpo.length, 8);
  return Buffer.concat([cabecera, cuerpo]);
}
function cabeceraBloque(largo, tipo) {
  const b = Buffer.alloc(8);
  b.writeUInt32LE(largo, 0);
  b.writeUInt32LE(tipo, 4);
  return b;
}
const archivo = (ruta, contenido) => (dir) => {
  mkdirSync(dirname(join(dir, ruta)), { recursive: true });
  writeFileSync(join(dir, ruta), contenido);
};
const varios = (...fs) => (dir) => fs.forEach((f) => f(dir));

const CASOS = [
  ["sin activos", null, () => {}],
  ["planeta dentro del presupuesto", null, archivo("activos/planetas/marca-a.glb", glb({ triangulos: 19_999 }))],
  ["planeta con 20.000 triángulos (el presupuesto es menos de 20.000)", "P1", archivo("activos/planetas/marca-a.glb", glb({ triangulos: 20_000 }))],
  ["planeta en tira de triángulos por encima del presupuesto", "P1", archivo("activos/planetas/marca-a.glb", glb({ triangulos: 25_000, modo: 5 }))],
  ["planeta de más de 1 MB", "P1", archivo("activos/planetas/marca-a.glb", glb({ relleno: MB }))],
  ["planeta que pasa de 1 MB con su KTX2 externo (S21)", "P1", varios(archivo("activos/planetas/marca-a.glb", glb({ relleno: 600_000, imagenes: ["marca-a.ktx2"] })), archivo("activos/planetas/marca-a.ktx2", Buffer.alloc(500_000)))],
  ["planeta que cita un KTX2 inexistente", "P2", archivo("activos/planetas/marca-a.glb", glb({ imagenes: ["no-existe.ktx2"] }))],
  ["mapa de 2,5 MB y 20.000 triángulos", null, archivo("activos/mapa-popayan.glb", glb({ relleno: 2_500_000, triangulos: 20_000 }))],
  ["mapa de más de 3 MB", "P1", archivo("activos/mapa-popayan.glb", glb({ relleno: 3 * MB }))],
  ["mapa con 20.001 triángulos", "P1", archivo("activos/mapa-popayan-v2.glb", glb({ triangulos: 20_001 }))],
  ["archivo .glb que no es GLB", "P2", archivo("activos/roto.glb", Buffer.from("no soy un glb"))],
  ["puntero de Git LFS sin contenido", "P3", archivo("activos/planetas/marca-a.glb", "version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 500000\n")],
  ["GLB enorme dentro de node_modules: se ignora", null, archivo("node_modules/x/enorme.glb", glb({ relleno: 4 * MB }))],
  ["el kernel cambia la forma de sus presupuestos", "P0", (dir) => {
    const ruta = join(dir, "arquitectura/kernel-durable.json");
    const k = JSON.parse(readFileSync(ruta, "utf8"));
    k.L2_product_stages_and_v1_1_rules.spatial_and_visual_budgets["3d_budgets"] = "Planetas livianos.";
    writeFileSync(ruta, JSON.stringify(k));
  }],
];

let fallas = 0;
for (const [nombre, codigo, preparar] of CASOS) {
  const dir = mkdtempSync(join(tmpdir(), "verificar-3d-"));
  try {
    mkdirSync(join(dir, "arquitectura"));
    cpSync(join(RAIZ, "arquitectura/kernel-durable.json"), join(dir, "arquitectura/kernel-durable.json"));
    preparar(dir);
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
