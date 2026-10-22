#!/usr/bin/env node
// Vista interactiva del grafo operacional.
// Lee el grafo, el kernel y los resultados del modelo de carga, comprueba que disposicion.mjs esté al
// día con el grafo y escribe docs/grafo-operacional.html: una página que se abre en cualquier navegador.
// Uso:
//   node tools/vista-del-grafo/generar.mjs                    escribe la página
//   node tools/vista-del-grafo/generar.mjs --check            no escribe; falla si la página no coincide con el grafo
//   node tools/vista-del-grafo/generar.mjs --fragmento RUTA   escribe además la página sin <html> ni <head>, para publicarla como artefacto

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as disposicion from "./disposicion.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "../..");
const RUTA_PAGINA = resolve(RAIZ, "docs/grafo-operacional.html");
const N = 84; // lado de la caja de un nodo, igual que en la plantilla

const leerJson = (ruta) => JSON.parse(readFileSync(resolve(RAIZ, ruta), "utf8"));
const grafo = leerJson("arquitectura/grafo-operacional.json");
const kernel = leerJson("arquitectura/kernel-durable.json");
const modelo = leerJson("arquitectura/modelo-de-carga.json");
const resultados = leerJson("arquitectura/modelo-de-carga.resultados.json");

// 1. La disposición solo cita nodos, aristas y restricciones que existen, y cubre todo el grafo
const errores = [];
const avisos = [];
const nodos = new Set(grafo.nodos.map((n) => n.id));
const aristas = new Map(grafo.aristas.map((a) => [a.id, a]));
const restricciones = new Set(grafo.restricciones_aislamiento.map((r) => r.id));
const { posiciones, carriles, verticales, inicio, notas, iconos, vistas, pasos } = disposicion;

const exigir = (lista, existe, que, donde) => {
  for (const id of lista) if (!existe(id)) errores.push(`${donde} cita ${que} ${id}, que no existe en el grafo`);
};
for (const id of nodos) {
  if (!posiciones[id]) errores.push(`${id} no tiene posición en disposicion.mjs (posiciones)`);
  if (!iconos[id]) errores.push(`${id} no tiene icono en disposicion.mjs (iconos)`);
}
exigir(Object.keys(posiciones), (id) => nodos.has(id), "el nodo", "posiciones");
exigir(Object.keys(iconos), (id) => nodos.has(id), "el nodo", "iconos");
exigir(Object.keys(carriles), (id) => aristas.has(id), "la arista", "carriles");
exigir(verticales.origenes, (id) => nodos.has(id), "el nodo", "verticales");
exigir(verticales.aristas, (id) => aristas.has(id), "la arista", "verticales");
exigir(inicio, (id) => nodos.has(id), "el nodo", "inicio");
for (const nota of notas) exigir(nota.nodos, (id) => nodos.has(id), "el nodo", `la nota "${nota.titulo}"`);
for (const v of vistas) {
  if (v.aristas) exigir(v.aristas, (id) => aristas.has(id), "la arista", `la vista ${v.id}`);
  else if (!["todo", "ruta_pedido", "vertical"].includes(v.criterio)) errores.push(`la vista ${v.id} no tiene aristas ni un criterio conocido`);
}
exigir(Object.keys(disposicion.restricciones), (id) => restricciones.has(id), "la restricción", "restricciones");
for (const [r, ids] of Object.entries(disposicion.restricciones)) exigir(ids, (id) => nodos.has(id) || aristas.has(id), "el nodo o la arista", r);

// El recorrido cubre exactamente la ruta del pedido, sin repetir pasos
const enPasos = pasos.map(([id]) => id);
const ruta = grafo.aristas.filter((a) => a.ruta_pedido).map((a) => a.id);
for (const id of ruta) if (!enPasos.includes(id)) errores.push(`${id} es ruta del pedido y falta en pasos`);
for (const id of enPasos) if (!ruta.includes(id)) errores.push(`pasos incluye ${id}, que no es ruta del pedido`);
for (const id of new Set(enPasos.filter((x, i) => enPasos.indexOf(x) !== i))) errores.push(`pasos repite ${id}`);

// Una arista que va hacia atrás sin carril se dibuja como un lazo que cruza otros nodos
const esVertical = (a) => verticales.origenes.includes(a.origen) || verticales.aristas.includes(a.id);
for (const a of grafo.aristas) {
  const s = posiciones[a.origen], t = posiciones[a.destino];
  if (s && t && !esVertical(a) && !carriles[a.id] && s[0] + N >= t[0]) avisos.push(`${a.id} va hacia atrás (${a.origen} → ${a.destino}); conviene darle un carril`);
}

if (errores.length) {
  console.error(`${errores.length} error(es) en tools/vista-del-grafo/disposicion.mjs:`);
  for (const e of errores) console.error(`  - ${e}`);
  process.exit(1);
}
for (const a of avisos) console.warn(`Aviso: ${a}`);

// 2. Datos que lee la página
const carga = (escenario) =>
  Object.fromEntries(resultados.escenarios[escenario].utilizacion.map((u) => [u.nodo, { lambda: u.lambda_evento, mu: u.mu_por_s, rho: u.rho_evento }]));
const tasas = (escenario) => Object.fromEntries(resultados.escenarios[escenario].aristas.map((a) => [a.arista, a.tasa_evento_s]));
const { fuente, ...servicios } = grafo.servicios_de_despliegue;
const datos = {
  version: grafo.version,
  fecha: grafo.fecha,
  kernel: kernel.schema_version,
  modelo: modelo.version,
  servicios,
  nodos: grafo.nodos,
  aristas: grafo.aristas,
  restricciones: grafo.restricciones_aislamiento,
  telemetria: grafo.telemetria,
  carga: { mvp: carga("mvp"), capacidad: carga("capacidad") },
  tasas: { mvp: tasas("mvp"), capacidad: tasas("capacidad") },
};
const config = { posiciones, carriles, verticales, inicio, notas, iconos, vistas, pasos, restricciones: disposicion.restricciones };

// 3. Página
const comoJs = (v) => JSON.stringify(v).replace(/</g, "\\u003c"); // un "</script>" en un texto no cierra el script
const plantilla = readFileSync(resolve(AQUI, "plantilla.html"), "utf8").replace(/\r\n/g, "\n");
const fragmento = plantilla.replace("/*__DATOS__*/null", () => comoJs(datos)).replace("/*__DISPOSICION__*/null", () => comoJs(config));
const pagina = `<!doctype html>
<!-- Generado por tools/vista-del-grafo/generar.mjs desde arquitectura/grafo-operacional.json (v${grafo.version}). No se edita a mano. -->
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>
</head>
<body>
${fragmento}
</body>
</html>
`;

if (process.argv.includes("--check")) {
  let actual = "";
  try { actual = readFileSync(RUTA_PAGINA, "utf8").replace(/\r\n/g, "\n"); } catch {}
  if (actual !== pagina) {
    console.error(`Desactualizado: ${RUTA_PAGINA}. Ejecute node tools/vista-del-grafo/generar.mjs`);
    process.exit(1);
  }
  process.exit(0);
}

writeFileSync(RUTA_PAGINA, pagina, "utf8");
console.log(`Escrito: ${RUTA_PAGINA} (grafo v${grafo.version}: ${grafo.nodos.length} nodos, ${grafo.aristas.length} aristas)`);
const argFragmento = process.argv.indexOf("--fragmento");
if (argFragmento > 0) {
  const ruta = resolve(process.argv[argFragmento + 1]);
  writeFileSync(ruta, fragmento, "utf8");
  console.log(`Escrito: ${ruta} (fragmento para publicar como artefacto)`);
}
