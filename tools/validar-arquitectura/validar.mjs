#!/usr/bin/env node
// Validador de la arquitectura (PEN-07).
//   1. Valida el kernel, el grafo y el modelo de carga contra sus JSON Schema (Ajv 8, borrador 2020-12).
//   2. Verifica las reglas estructurales y de referencias que un esquema no puede expresar.
// Uso: node tools/validar-arquitectura/validar.mjs [--raiz CARPETA]   (termina con error si encuentra alguno)
//   --raiz valida una copia del repositorio en otra carpeta; lo usan las pruebas (pruebas.mjs).

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const argRaiz = process.argv.indexOf("--raiz");
const RAIZ = argRaiz > 0 ? resolve(process.argv[argRaiz + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ARCHIVOS = {
  kernel: { datos: "arquitectura/kernel-durable.json", esquema: "arquitectura/schemas/kernel.schema.json" },
  grafo: { datos: "arquitectura/grafo-operacional.json", esquema: "arquitectura/schemas/grafo-operacional.schema.json" },
  modelo: { datos: "arquitectura/modelo-de-carga.json", esquema: "arquitectura/schemas/modelo-de-carga.schema.json" },
};
const INDICE_ADR = "docs/adr/README.md";
const AGENTS = "AGENTS.md";

const errores = [];
const error = (codigo, mensaje) => errores.push(`${codigo}: ${mensaje}`);
const leer = (ruta) => readFileSync(resolve(RAIZ, ruta), "utf8");
const repetidos = (lista) => [...new Set(lista.filter((x, i) => lista.indexOf(x) !== i))];

function terminar() {
  if (errores.length) {
    console.error(`${errores.length} error(es) en la arquitectura:`);
    for (const e of errores) console.error(`  - ${e}`);
    process.exit(1);
  }
}

// 1. Esquemas
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
const datos = {};
for (const [nombre, { datos: ruta, esquema }] of Object.entries(ARCHIVOS)) {
  try {
    datos[nombre] = JSON.parse(leer(ruta));
  } catch (e) {
    error("E-JSON", `${ruta} no es JSON válido: ${e.message}`);
    continue;
  }
  const validar = ajv.compile(JSON.parse(leer(esquema)));
  if (!validar(datos[nombre])) {
    for (const e of validar.errors) {
      const detalle = e.params?.additionalProperty ?? e.params?.allowedValues?.join(", ") ?? "";
      error("E-ESQUEMA", `${ruta} ${e.instancePath || "/"}: ${e.message}${detalle ? ` (${detalle})` : ""}`);
    }
  }
  const esperado = "./" + esquema.replace(/^arquitectura\//, "");
  if (datos[nombre].$schema !== esperado) error("E-ESQUEMA", `${ruta} debe declarar "$schema": "${esperado}"`);
}
terminar(); // sin esquemas válidos, las reglas siguientes no tienen sentido

const { kernel, grafo, modelo } = datos;
const nodos = new Map(grafo.nodos.map((n) => [n.id, n]));
const aristas = new Map(grafo.aristas.map((a) => [a.id, a]));

// G1 Identificadores únicos
for (const [nombre, lista] of [
  ["nodos", grafo.nodos],
  ["aristas", grafo.aristas],
  ["restricciones", grafo.restricciones_aislamiento],
  ["telemetría", grafo.telemetria],
  ["pendientes del kernel", kernel.pendientes],
]) {
  for (const id of repetidos(lista.map((x) => x.id))) error("G1", `identificador repetido en ${nombre}: ${id}`);
}

// G2 Todo nodo cuelga del núcleo N0 por su cadena de gobierno, sin ciclos
const raices = grafo.nodos.filter((n) => n.gobernado_por === null).map((n) => n.id);
if (raices.length !== 1 || raices[0] !== "N0") error("G2", `el único nodo sin gobierno debe ser N0; hay: ${raices.join(", ") || "ninguno"}`);
for (const n of grafo.nodos) {
  const vistos = new Set();
  for (let actual = n; actual.gobernado_por !== null; ) {
    if (vistos.has(actual.id)) {
      error("G2", `ciclo de gobierno que pasa por ${actual.id}`);
      break;
    }
    vistos.add(actual.id);
    const siguiente = nodos.get(actual.gobernado_por);
    if (!siguiente) {
      error("G2", `${actual.id} está gobernado por ${actual.gobernado_por}, que no existe`);
      break;
    }
    actual = siguiente;
  }
}

// G3 Las aristas unen nodos que existen
for (const a of grafo.aristas) {
  for (const extremo of ["origen", "destino"]) {
    if (!nodos.has(a[extremo])) error("G3", `${a.id}: el ${extremo} ${a[extremo]} no existe`);
  }
}

// G4 Aislamiento entre marcas (R02): entre marcas o sedes solo hay aristas de la misma marca
for (const a of grafo.aristas) {
  const entreMarcas = nodos.get(a.origen)?.tipo === "tenant" && nodos.get(a.destino)?.tipo === "tenant";
  if (entreMarcas && a.alcance !== "misma_marca") error("G4", `${a.id}: une ${a.origen} y ${a.destino} (marcas o sedes) sin alcance misma_marca (R02)`);
  if (!entreMarcas && a.alcance === "misma_marca") error("G4", `${a.id}: alcance misma_marca en una arista que no une marcas o sedes`);
}

// G5 Servicios de despliegue: cada nodo apunta a un servicio declarado y cada servicio tiene nodos
const servicios = Object.keys(grafo.servicios_de_despliegue).filter((s) => s !== "fuente");
const serviciosUsados = new Set();
for (const n of grafo.nodos) {
  const servicio = n.capacidad?.servicio;
  if (!servicio) continue;
  serviciosUsados.add(servicio);
  if (!servicios.includes(servicio)) error("G5", `${n.id} usa el servicio ${servicio}, que no está en servicios_de_despliegue`);
}
for (const s of servicios) if (!serviciosUsados.has(s)) error("G5", `el servicio ${s} no tiene nodos`);

// G6 La telemetría solo nombra nodos o aristas que existen
for (const t of grafo.telemetria) {
  for (const id of t.objeto.match(/\b[NGAPDXE]\d{1,2}\b/g) ?? []) {
    if (!nodos.has(id) && !aristas.has(id)) error("G6", `${t.id} menciona ${id}, que no existe en el grafo`);
  }
}

// M1 Cada parámetro tiene un valor por escenario, y solo por escenarios declarados
const escenarios = Object.keys(modelo.escenarios);
for (const [nombre, p] of Object.entries(modelo.parametros)) {
  const claves = Object.keys(p.valores);
  const faltan = escenarios.filter((e) => !claves.includes(e));
  const sobran = claves.filter((c) => !escenarios.includes(c));
  if (faltan.length) error("M1", `${nombre}: faltan valores para ${faltan.join(", ")}`);
  if (sobran.length) error("M1", `${nombre}: valores para escenarios desconocidos: ${sobran.join(", ")}`);
  if (typeof p.estado === "object") {
    for (const e of Object.keys(p.estado)) if (!escenarios.includes(e)) error("M1", `${nombre}: estado para el escenario desconocido ${e}`);
  }
}

// M2 El mapa de capacidad del modelo usa nodos del grafo, con tipo coherente y capacidad declarada
const tiposCompatibles = { humano: ["tenant"], externo: ["externo"], infraestructura: ["servicio", "datos"] };
for (const m of modelo.mapa_de_capacidad) {
  const n = nodos.get(m.nodo);
  if (!n) {
    error("M2", `mapa_de_capacidad usa ${m.nodo}, que no existe en el grafo`);
    continue;
  }
  if (!tiposCompatibles[m.tipo].includes(n.tipo)) error("M2", `${m.nodo} es de tipo ${n.tipo} en el grafo y ${m.tipo} en el modelo`);
  if (!n.capacidad) error("M2", `${m.nodo} está en el mapa de capacidad pero no tiene capacidad en el grafo`);
}

// M3 El mapa de aristas del modelo usa aristas del grafo, sin repetir
for (const id of repetidos(modelo.mapa_de_aristas.map((a) => a.arista))) error("M3", `arista repetida en mapa_de_aristas: ${id}`);
for (const a of modelo.mapa_de_aristas) if (!aristas.has(a.arista)) error("M3", `mapa_de_aristas usa ${a.arista}, que no existe en el grafo`);

// M4 Cada servicio de despliegue tiene su presupuesto de conexiones a la base en los dos modos del pooler (PEN-14 (4),
// PEN-17): conexiones_sesion_<servicio>_por_replica y conexiones_transaccion_<servicio>_por_replica, y solo esos servicios.
for (const modo of ["sesion", "transaccion"]) {
  const conPresupuesto = Object.keys(modelo.parametros).map((n) => n.match(new RegExp(`^conexiones_${modo}_(.+)_por_replica$`))?.[1]).filter(Boolean);
  for (const s of servicios) if (!conPresupuesto.includes(s)) error("M4", `el servicio ${s} no tiene el parámetro conexiones_${modo}_${s}_por_replica`);
  for (const s of conPresupuesto) if (!servicios.includes(s)) error("M4", `conexiones_${modo}_${s}_por_replica no corresponde a ningún servicio de servicios_de_despliegue`);
}
const sinModo = Object.keys(modelo.parametros).filter((n) => /^conexiones_(?!sesion_|transaccion_).+_por_replica$/.test(n));
for (const n of sinModo) error("M4", `${n} no dice su modo del pooler: usa conexiones_sesion_<servicio>_por_replica o conexiones_transaccion_<servicio>_por_replica`);

// V1 Versiones alineadas entre los tres archivos
const citaKernel = `arquitectura/kernel-durable.json (${kernel.schema_version})`;
const citaGrafo = `arquitectura/grafo-operacional.json (${grafo.version})`;
if (grafo.alineado_con !== citaKernel) error("V1", `el grafo cita "${grafo.alineado_con}" y el kernel es ${kernel.schema_version}`);
if (modelo.alineado_con[0] !== citaKernel) error("V1", `el modelo cita "${modelo.alineado_con[0]}" y el kernel es ${kernel.schema_version}`);
if (modelo.alineado_con[1] !== citaGrafo) error("V1", `el modelo cita "${modelo.alineado_con[1]}" y el grafo es v${grafo.version}`);
const L0 = kernel.L0_mathematical_and_graph_core;
if (!L0.detalle_operacional.includes(`grafo-operacional.json (v${grafo.version})`)) error("V1", `el kernel no cita el grafo v${grafo.version} en detalle_operacional`);
if (!L0.modelo_de_carga.includes(`modelo-de-carga.json (v${modelo.version})`)) error("V1", `el kernel no cita el modelo de carga v${modelo.version}`);

// V2 Cada versión vigente explica sus cambios
const changelog = `changelog_${kernel.schema_version.split("-")[0].replaceAll(".", "_")}`;
if (!kernel[changelog]) error("V2", `el kernel ${kernel.schema_version} no tiene ${changelog}`);
for (const [nombre, d] of [["grafo", grafo], ["modelo de carga", modelo]]) {
  const cambios = `cambios_${d.version.replace(".", "_")}`;
  if (!d[cambios]) error("V2", `el ${nombre} v${d.version} no tiene ${cambios}`);
}

// F1 Las rutas de archivos citadas en los tres archivos existen
const rutas = new Set();
const recorrer = (v) => {
  if (typeof v === "string") for (const r of v.match(/\b(?:docs|arquitectura|tools)\/[A-Za-z0-9_./-]+\.(?:md|json|mjs)\b/g) ?? []) rutas.add(r);
  else if (Array.isArray(v)) v.forEach(recorrer);
  else if (v && typeof v === "object") Object.values(v).forEach(recorrer);
};
[kernel, grafo, modelo].forEach(recorrer);
for (const r of rutas) if (!existsSync(resolve(RAIZ, r))) error("F1", `se cita ${r}, que no existe`);

// A1 El estado de cada ADR coincide en el kernel, en el índice y en el propio ADR
const indice = leer(INDICE_ADR).split(/\r?\n/);
for (const [seccion, s] of Object.entries(kernel)) {
  if (!seccion.startsWith("L1_") || !s.adr) continue;
  const aprobadaEnKernel = /^Aprobada/.test(s.estado);
  const archivo = s.adr.split("/").pop();
  const fila = indice.find((l) => l.includes(`(${archivo})`));
  if (!fila) {
    error("A1", `${s.adr} no está en ${INDICE_ADR}`);
  } else if ((fila.split("|")[3]?.trim() === "Aprobada") !== aprobadaEnKernel) {
    error("A1", `${seccion} y ${INDICE_ADR} no coinciden en el estado de ${archivo}`);
  }
  if (existsSync(resolve(RAIZ, s.adr))) {
    const lineaEstado = leer(s.adr).split(/\r?\n/).find((l) => l.startsWith("| Estado |")) ?? "";
    if (lineaEstado.includes("Aprobada") !== aprobadaEnKernel) error("A1", `${seccion} y ${s.adr} no coinciden en el estado`);
  }
}

// F2 AGENTS.md solo cita rutas y ADR que existen
// V3 AGENTS.md cita las versiones vigentes del kernel, del grafo y del modelo de carga
if (!existsSync(resolve(RAIZ, AGENTS))) {
  error("F2", `falta ${AGENTS} en la raíz del repositorio`);
} else {
  const agents = leer(AGENTS);
  const citadas = agents.match(/(?:\b(?:docs|arquitectura|tools|packages|test)|\.claude)\/[A-Za-z0-9_./-]+\.(?:md|json|mjs|ts)\b/g) ?? [];
  for (const r of new Set(citadas)) if (!existsSync(resolve(RAIZ, r))) error("F2", `${AGENTS} cita ${r}, que no existe`);
  for (const adr of new Set(agents.match(/\bADR-\d{4}\b/g) ?? [])) {
    if (!indice.some((l) => l.includes(`[${adr}]`))) error("F2", `${AGENTS} cita ${adr}, que no está en ${INDICE_ADR}`);
  }
  if (!agents.includes(kernel.schema_version)) error("V3", `${AGENTS} no cita el kernel vigente ${kernel.schema_version}`);
  if (!agents.includes(`grafo operacional \`v${grafo.version}\``)) error("V3", `${AGENTS} no cita el grafo operacional vigente v${grafo.version}`);
  if (!agents.includes(`modelo de carga \`v${modelo.version}\``)) error("V3", `${AGENTS} no cita el modelo de carga vigente v${modelo.version}`);
}

// F3 Las huellas SHA-256 de los textos originales de las fuentes coinciden con el texto guardado.
// Cada archivo docs/fuentes/*/*-texto-original.md tiene una tabla con una fila por bloque (| T1 | … | `huella` | … |)
// antes del primer bloque, y una sección "## T1" con el texto entre una línea ~~~~markdown y una línea ~~~~. La huella se calcula sobre ese
// texto sin el salto de línea que precede al cierre. Si la fila trae una segunda huella y dice CRLF, esa huella es la
// del original recibido con finales de línea CRLF y se comprueba reconstruyéndolo. Si dice "salto de línea final", es la
// del mismo texto con un salto de línea al final y se comprueba igual.
const DIR_FUENTES = resolve(RAIZ, "docs/fuentes");
const textosOriginales = existsSync(DIR_FUENTES)
  ? readdirSync(DIR_FUENTES, { recursive: true }).filter((f) => /-texto-original\.md$/.test(f)).map((f) => `docs/fuentes/${f.replaceAll("\\", "/")}`)
  : [];
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
for (const ruta of textosOriginales) {
  const contenido = leer(ruta).replace(/\r\n/g, "\n");
  const encabezado = contenido.slice(0, Math.max(0, contenido.search(/^## /m))); // la tabla va antes del primer bloque
  const filas = [...encabezado.matchAll(/^\| ([A-Z]\d+) \|.*$/gm)];
  if (!filas.length) error("F3", `${ruta} no tiene filas de huellas`);
  for (const [fila, id] of filas) {
    const huellas = [...fila.matchAll(/`([0-9a-f]{64})`/g)].map((m) => m[1]);
    const bloque = contenido.match(new RegExp(`^## ${id}\\n[\\s\\S]*?^~~~~markdown\\n([\\s\\S]*?)\\n~~~~$`, "m"));
    if (!huellas.length) error("F3", `${ruta}: la fila ${id} no tiene huella`);
    else if (!bloque) error("F3", `${ruta}: no hay bloque de texto para ${id}`);
    else {
      if (sha256(bloque[1]) !== huellas[0]) error("F3", `${ruta}: la huella de ${id} no coincide con su texto`);
      if (huellas[1] && /CRLF/.test(fila) && sha256(bloque[1].replace(/\n/g, "\r\n")) !== huellas[1]) error("F3", `${ruta}: la huella CRLF de ${id} no coincide con su texto`);
      if (huellas[1] && /salto de línea final/.test(fila) && sha256(`${bloque[1]}\n`) !== huellas[1]) error("F3", `${ruta}: la huella con salto de línea final de ${id} no coincide con su texto`);
    }
  }
}

// PL1 El ejemplo de la plantilla de doble salida cumple el esquema de telemetría (AGENTS.md §6)
const PLANTILLA = { texto: "docs/agentes/plantillas/doble-salida.md", esquema: "docs/agentes/plantillas/telemetria-entrega.schema.json" };
if (existsSync(resolve(RAIZ, PLANTILLA.texto)) && existsSync(resolve(RAIZ, PLANTILLA.esquema))) {
  const bloque = leer(PLANTILLA.texto).match(/```json\r?\n([\s\S]*?)\r?\n```/);
  let ejemplo = null;
  try {
    ejemplo = bloque ? JSON.parse(bloque[1]) : null;
  } catch (e) {
    error("PL1", `el ejemplo de ${PLANTILLA.texto} no es JSON válido: ${e.message}`);
  }
  if (!bloque) error("PL1", `${PLANTILLA.texto} no tiene un ejemplo en un bloque json`);
  if (ejemplo) {
    const validarTelemetria = ajv.compile(JSON.parse(leer(PLANTILLA.esquema)));
    if (!validarTelemetria(ejemplo)) {
      for (const e of validarTelemetria.errors) error("PL1", `el ejemplo de ${PLANTILLA.texto} no cumple el esquema en ${e.instancePath || "/"}: ${e.message}`);
    }
  }
} else {
  error("PL1", `faltan ${PLANTILLA.texto} o ${PLANTILLA.esquema}`);
}

// DT1 Fase de código: con packages/ en el repositorio, package.json declara las cuatro verificaciones de AGENTS.md §5,
// verificar:todo las corre y la integración continua también. Sin packages/, no se exige nada (fase documental).
const VERIFICACIONES_DE_CODIGO = ["verify:hexagon", "verify:contracts", "verify:3d-budgets", "test:integral"];
const WORKFLOW = ".github/workflows/verificaciones.yml";
if (existsSync(resolve(RAIZ, "packages"))) {
  let scripts = {};
  try {
    scripts = JSON.parse(leer("package.json")).scripts ?? {};
  } catch (e) {
    error("DT1", `package.json no se puede leer: ${e.message}`);
  }
  const workflow = existsSync(resolve(RAIZ, WORKFLOW)) ? leer(WORKFLOW) : "";
  for (const v of VERIFICACIONES_DE_CODIGO) {
    if (typeof scripts[v] !== "string" || !scripts[v].trim()) error("DT1", `package.json no declara el script ${v} (AGENTS.md §5, fase de código)`);
    if (!(scripts["verificar:todo"] ?? "").includes(`npm run ${v}`)) error("DT1", `verificar:todo no corre npm run ${v}`);
    if (!workflow.includes(`run: npm run ${v}`)) error("DT1", `${WORKFLOW} no corre npm run ${v}`);
  }
}

terminar();
console.log(
  `Arquitectura válida: kernel ${kernel.schema_version}, grafo v${grafo.version} ` +
    `(${grafo.nodos.length} nodos, ${grafo.aristas.length} aristas), modelo de carga v${modelo.version}.`,
);
