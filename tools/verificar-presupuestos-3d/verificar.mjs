#!/usr/bin/env node
// Presupuestos 3D (AGENTS.md §5; kernel L2_product_stages_and_v1_1_rules.spatial_and_visual_budgets y
// L0_mathematical_and_graph_core.dominio.escala_de_diseno). Recorre todos los .glb del repositorio, salvo node_modules
// y las carpetas ocultas, y falla si alguno se sale de su presupuesto:
//   P0  el texto de los presupuestos en el kernel cambió de forma y ya no se puede leer: hay que actualizar esta regla.
//   P1  un planeta pesa más de 1 MB, contando los KTX2 u otras imágenes externas que referencia (S21), o tiene
//       20.000 triángulos o más; el mapa de Popayán (mapa-popayan*.glb, S21) pesa más de 3 MB o pasa de 20.000.
//   P2  el archivo no es un GLB 2.0 legible.
//   P3  el archivo es un puntero de Git LFS sin contenido: el peso se lee del puntero, pero los triángulos no.
// 1 MB = 1.000.000 bytes, la lectura más estricta (S21). Los triángulos se cuentan por primitiva de cada malla con los
// "count" de los accessors, que el GLB declara también con Draco o Meshopt.
// Uso: node tools/verificar-presupuestos-3d/verificar.mjs [--raiz CARPETA]   (--raiz revisa una copia; lo usan las pruebas)

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const argRaiz = process.argv.indexOf("--raiz");
const RAIZ = argRaiz > 0 ? resolve(process.argv[argRaiz + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MB = 1_000_000;
const ES_MAPA = /^mapa-popayan.*\.glb$/i;

const errores = [];
const error = (codigo, mensaje) => errores.push(`${codigo}: ${mensaje}`);
const entero = (texto) => Number(texto.replace(/\./g, ""));

// Presupuestos desde el kernel, su fuente de verdad.
const kernel = JSON.parse(readFileSync(join(RAIZ, "arquitectura/kernel-durable.json"), "utf8"));
const texto3d = kernel.L2_product_stages_and_v1_1_rules?.spatial_and_visual_budgets?.["3d_budgets"] ?? "";
const textoEscala = kernel.L0_mathematical_and_graph_core?.dominio?.escala_de_diseno ?? "";
const m3d = texto3d.match(/Planetas GLB Draco\/Meshopt \+ KTX2 <= (\d+) MB y < ([\d.]+) triángulos; Mapa Popayán GLB <= (\d+) MB/);
const mEscala = textoEscala.match(/triángulos por GLB <= ([\d.]+)/);
if (!m3d || !mEscala) {
  console.error("P0: el kernel ya no expresa los presupuestos 3D con la forma que lee esta verificación (3d_budgets y escala_de_diseno). Actualiza tools/verificar-presupuestos-3d/verificar.mjs junto con el kernel.");
  process.exit(1);
}
const PRESUPUESTO = {
  planeta: { bytes: Number(m3d[1]) * MB, triangulosMenosDe: entero(m3d[2]) },
  mapa: { bytes: Number(m3d[3]) * MB, triangulosHasta: entero(mEscala[1]) },
};

function glbs(dir) {
  const encontrados = [];
  for (const nombre of readdirSync(dir)) {
    if (nombre === "node_modules" || nombre.startsWith(".")) continue;
    const ruta = join(dir, nombre);
    const st = statSync(ruta);
    if (st.isDirectory()) encontrados.push(...glbs(ruta));
    else if (nombre.toLowerCase().endsWith(".glb")) encontrados.push(ruta);
  }
  return encontrados;
}

/** Puntero de Git LFS: devuelve el tamaño real que declara, o null si no es un puntero. */
function punteroLfs(buffer) {
  if (buffer.length > 1024) return null;
  const t = buffer.toString("utf8");
  if (!t.startsWith("version https://git-lfs.github.com/spec/v1")) return null;
  const m = t.match(/^size (\d+)$/m);
  return m ? Number(m[1]) : 0;
}

/** Lee la cabecera y el bloque JSON de un GLB 2.0 (especificación glTF 2.0, contenedor binario). */
function leerGlb(buffer) {
  if (buffer.length < 20 || buffer.readUInt32LE(0) !== 0x46546c67) throw new Error("no empieza con la firma glTF");
  if (buffer.readUInt32LE(4) !== 2) throw new Error(`versión ${buffer.readUInt32LE(4)} del contenedor; se espera 2`);
  if (buffer.readUInt32LE(8) !== buffer.length) throw new Error("la longitud de la cabecera no coincide con el archivo");
  const largo = buffer.readUInt32LE(12);
  if (buffer.readUInt32LE(16) !== 0x4e4f534a || 20 + largo > buffer.length) throw new Error("el primer bloque no es JSON");
  return JSON.parse(buffer.subarray(20, 20 + largo).toString("utf8").replace(/[\u0000 ]+$/, ""));
}

function triangulos(gltf) {
  let total = 0;
  for (const malla of gltf.meshes ?? []) {
    for (const p of malla.primitives ?? []) {
      const modo = p.mode ?? 4;
      const accessor = gltf.accessors?.[p.indices ?? p.attributes?.POSITION];
      const n = accessor?.count ?? 0;
      if (modo === 4) total += Math.floor(n / 3);
      else if (modo === 5 || modo === 6) total += Math.max(0, n - 2);
    }
  }
  return total;
}

const archivos = glbs(RAIZ);
for (const ruta of archivos) {
  const nombre = relative(RAIZ, ruta);
  const esMapa = ES_MAPA.test(basename(ruta));
  const presupuesto = esMapa ? PRESUPUESTO.mapa : PRESUPUESTO.planeta;
  const buffer = readFileSync(ruta);
  const lfs = punteroLfs(buffer);
  if (lfs !== null) {
    if (lfs > presupuesto.bytes) error("P1", `${nombre} pesa ${lfs} bytes según su puntero LFS; el presupuesto es ${presupuesto.bytes}`);
    error("P3", `${nombre} es un puntero de Git LFS sin contenido: corre git lfs pull para medir sus triángulos`);
    continue;
  }
  let gltf;
  try {
    gltf = leerGlb(buffer);
  } catch (e) {
    error("P2", `${nombre} no es un GLB 2.0 legible: ${e.message}`);
    continue;
  }
  let bytes = buffer.length;
  for (const imagen of gltf.images ?? []) {
    if (typeof imagen.uri === "string" && !imagen.uri.startsWith("data:")) {
      const externa = resolve(dirname(ruta), decodeURIComponent(imagen.uri));
      if (existsSync(externa)) bytes += statSync(externa).size;
      else error("P2", `${nombre} referencia ${imagen.uri}, que no existe`);
    }
  }
  if (bytes > presupuesto.bytes) error("P1", `${nombre} pesa ${bytes} bytes con sus texturas externas; el presupuesto es ${presupuesto.bytes}`);
  const t = triangulos(gltf);
  if (esMapa ? t > PRESUPUESTO.mapa.triangulosHasta : t >= PRESUPUESTO.planeta.triangulosMenosDe) {
    error("P1", `${nombre} tiene ${t} triángulos; el presupuesto es ${esMapa ? `a lo sumo ${PRESUPUESTO.mapa.triangulosHasta}` : `menos de ${PRESUPUESTO.planeta.triangulosMenosDe}`}`);
  }
}

if (errores.length) {
  console.error(`${errores.length} activo(s) 3D fuera de presupuesto:`);
  for (const e of errores) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `Presupuestos 3D del kernel (planeta ≤ ${PRESUPUESTO.planeta.bytes / MB} MB y < ${PRESUPUESTO.planeta.triangulosMenosDe} triángulos; mapa ≤ ${PRESUPUESTO.mapa.bytes / MB} MB y ≤ ${PRESUPUESTO.mapa.triangulosHasta}): ` +
    (archivos.length ? `${archivos.length} GLB dentro del presupuesto.` : "el repositorio no tiene activos GLB todavía."),
);
