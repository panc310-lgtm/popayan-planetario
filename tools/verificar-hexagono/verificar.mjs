#!/usr/bin/env node
// Guardián del hexágono (INV_06 y S1, AGENTS.md §4.1). Lee el AST de TypeScript de cada archivo de
// packages/contracts/src, packages/ports/src y packages/domain/src, y falla si:
//   H1  una importación o reexportación sale de la dirección permitida: contracts → nada, ports → contracts,
//       domain → ports y contracts. Eso incluye node:*, Fastify, pg, grammY, ioredis, three, el SDK de IA,
//       los adaptadores, apps/* y las rutas relativas que salen del paquete. Las importaciones de tipos cuentan.
//   H2  el núcleo lee una fuente de no determinismo en vez de recibirla por puerto: Date.now, Date(), new Date()
//       sin argumentos, Math.random, crypto, performance o process.
//   H3  carga módulos de forma dinámica (import(), require o import x = require), que esquiva esta revisión.
// Uso: node tools/verificar-hexagono/verificar.mjs [--raiz CARPETA]   (--raiz revisa una copia; lo usan las pruebas)

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const argRaiz = process.argv.indexOf("--raiz");
const RAIZ = argRaiz > 0 ? resolve(process.argv[argRaiz + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Paquetes del núcleo y lo único que cada uno puede importar fuera de sí mismo. */
const CAPAS = {
  contracts: [],
  ports: ["@planetario/contracts"],
  domain: ["@planetario/ports", "@planetario/contracts"],
};

/** Nombrados en INV_06 y S1: el mensaje lo dice explícitamente. */
const PROHIBIDOS_NOMBRADOS = ["fastify", "pg", "grammy", "ioredis", "three", "@anthropic-ai/sdk", "@langchain/langgraph"];
const GLOBALES_NO_DETERMINISTAS = new Set(["crypto", "performance", "process"]);

const violaciones = [];

function archivosTs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true })
    .map((f) => join(dir, String(f)))
    .filter((f) => /\.(m|c)?tsx?$/.test(f) && !f.endsWith(".d.ts"));
}

function paqueteDe(especificador) {
  const partes = especificador.split("/");
  return especificador.startsWith("@") ? partes.slice(0, 2).join("/") : partes[0];
}

function revisarEspecificador(capa, archivo, especificador, nodo, sf) {
  const donde = posicion(sf, nodo);
  if (especificador.startsWith(".")) {
    const destino = resolve(dirname(archivo), especificador);
    const raizPaquete = join(RAIZ, "packages", capa) + sep;
    if (!destino.startsWith(raizPaquete)) {
      violaciones.push({ codigo: "H1", donde, mensaje: `${especificador} sale de packages/${capa}: entre paquetes se importa por nombre y en la dirección permitida (INV_06)` });
    }
    return;
  }
  const paquete = paqueteDe(especificador);
  if (CAPAS[capa].includes(paquete)) return;
  const nombrado = PROHIBIDOS_NOMBRADOS.includes(paquete) || especificador.startsWith("node:");
  const permitidas = CAPAS[capa].length ? CAPAS[capa].join(" y ") : "nada";
  violaciones.push({
    codigo: "H1",
    donde,
    mensaje: `${capa} importa ${especificador}${nombrado ? ", prohibido por INV_06 y S1" : ""}; solo puede importar ${permitidas}`,
  });
}

function posicion(sf, nodo) {
  const { line, character } = sf.getLineAndCharacterOfPosition(nodo.getStart(sf));
  return `${relative(RAIZ, sf.fileName)}:${line + 1}:${character + 1}`;
}

/** Quita paréntesis y aserciones de tipo: (globalThis as any).crypto se revisa igual que globalThis.crypto. */
function sinEnvoltorios(e) {
  while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isTypeAssertionExpression(e) || ts.isNonNullExpression(e) || ts.isSatisfiesExpression(e)) e = e.expression;
  return e;
}

/** Un identificador global usado como valor, no como nombre de propiedad ni como declaración local. */
function esReferenciaGlobal(id) {
  const p = id.parent;
  if (ts.isPropertyAccessExpression(p) && p.name === id) return false;
  if ((ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p)) && p.name === id) return false;
  if ((ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isBindingElement(p)) && p.name === id) return false;
  if (ts.isImportSpecifier(p) || ts.isExportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p)) return false;
  if (ts.isQualifiedName(p) || ts.isTypeReferenceNode(p)) return false;
  return true;
}

function revisarArchivo(capa, archivo) {
  const sf = ts.createSourceFile(archivo, readFileSync(archivo, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visitar = (n) => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      revisarEspecificador(capa, archivo, n.moduleSpecifier.text, n, sf);
    } else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) {
      revisarEspecificador(capa, archivo, n.argument.literal.text, n, sf);
    } else if (ts.isImportEqualsDeclaration(n)) {
      violaciones.push({ codigo: "H3", donde: posicion(sf, n), mensaje: "import x = require(...) carga un módulo sin pasar por la revisión de importaciones" });
    } else if (ts.isCallExpression(n)) {
      if (n.expression.kind === ts.SyntaxKind.ImportKeyword) {
        violaciones.push({ codigo: "H3", donde: posicion(sf, n), mensaje: "import() dinámico: el núcleo solo usa importaciones estáticas" });
      } else if (ts.isIdentifier(n.expression) && n.expression.text === "require") {
        violaciones.push({ codigo: "H3", donde: posicion(sf, n), mensaje: "require(): el núcleo solo usa importaciones estáticas" });
      } else if (ts.isIdentifier(n.expression) && n.expression.text === "Date") {
        violaciones.push({ codigo: "H2", donde: posicion(sf, n), mensaje: "Date() lee el reloj: usa ClockPort (S1)" });
      }
    } else if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "Date" && (n.arguments?.length ?? 0) === 0) {
      violaciones.push({ codigo: "H2", donde: posicion(sf, n), mensaje: "new Date() lee el reloj: usa ClockPort (S1)" });
    } else if ((ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) && ts.isIdentifier(sinEnvoltorios(n.expression))) {
      const objeto = sinEnvoltorios(n.expression).text;
      const clave = ts.isPropertyAccessExpression(n) ? n.name : n.argumentExpression;
      const propiedad = ts.isIdentifier(clave) || ts.isPrivateIdentifier(clave) || ts.isStringLiteralLike(clave) ? clave.text : "";
      if (objeto === "Date" && propiedad === "now") violaciones.push({ codigo: "H2", donde: posicion(sf, n), mensaje: "Date.now lee el reloj: usa ClockPort (S1)" });
      if (objeto === "Math" && propiedad === "random") violaciones.push({ codigo: "H2", donde: posicion(sf, n), mensaje: "Math.random no es determinista: el azar llega por puerto (S1)" });
      if (objeto === "globalThis" && (GLOBALES_NO_DETERMINISTAS.has(propiedad) || propiedad === "Date")) {
        violaciones.push({ codigo: "H2", donde: posicion(sf, n), mensaje: `globalThis.${propiedad}: el núcleo no lee globales del entorno (S1)` });
      }
    } else if (ts.isIdentifier(n) && GLOBALES_NO_DETERMINISTAS.has(n.text) && esReferenciaGlobal(n)) {
      violaciones.push({ codigo: "H2", donde: posicion(sf, n), mensaje: `${n.text} es del entorno: el reloj, el azar y los identificadores llegan por puerto (S1)` });
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
}

let revisados = 0;
const faltan = [];
for (const capa of Object.keys(CAPAS)) {
  const dir = join(RAIZ, "packages", capa, "src");
  if (!existsSync(dir)) {
    faltan.push(`packages/${capa}/src`);
    continue;
  }
  for (const archivo of archivosTs(dir)) {
    revisarArchivo(capa, archivo);
    revisados++;
  }
}

if (faltan.length) {
  console.error(`No existe ${faltan.join(", ")}: la fase de código necesita los tres paquetes del núcleo (AGENTS.md §5).`);
  process.exit(1);
}
if (violaciones.length) {
  console.error(`${violaciones.length} violación(es) del hexágono (INV_06, S1):`);
  for (const v of violaciones) console.error(`  - ${v.codigo}: ${v.donde} ${v.mensaje}`);
  process.exit(1);
}
console.log(`Hexágono puro: ${revisados} archivos de packages/contracts, packages/ports y packages/domain, sin importaciones fuera de la dirección permitida ni fuentes de no determinismo.`);
