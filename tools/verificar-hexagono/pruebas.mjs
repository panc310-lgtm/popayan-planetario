#!/usr/bin/env node
// Pruebas del guardián del hexágono. Cada caso copia packages/ a una carpeta temporal, siembra una violación en un
// archivo nuevo y exige que verificar.mjs falle con el código esperado; los casos válidos exigen que pase.
// Los archivos del repositorio nunca se modifican. Uso: node tools/verificar-hexagono/pruebas.mjs

import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFICADOR = join(RAIZ, "tools/verificar-hexagono/verificar.mjs");

// [nombre, código esperado o null si debe pasar, paquete, contenido del archivo sembrado]
const CASOS = [
  ["copia sin cambios", null, null, null],
  ["domain importa pg", "H1", "domain", 'import pg from "pg";\nexport const x = pg;\n'],
  ["domain importa Fastify", "H1", "domain", 'import Fastify from "fastify";\nexport const x = Fastify;\n'],
  ["ports importa grammY", "H1", "ports", 'import { Bot } from "grammy";\nexport type B = Bot;\n'],
  ["domain importa ioredis solo como tipo", "H1", "domain", 'import type { Redis } from "ioredis";\nexport type R = Redis;\n'],
  ["contracts importa three", "H1", "contracts", 'import * as THREE from "three";\nexport const t = THREE;\n'],
  ["domain importa el SDK de IA", "H1", "domain", 'import Anthropic from "@anthropic-ai/sdk";\nexport const a = Anthropic;\n'],
  ["domain importa node:crypto", "H1", "domain", 'import { randomUUID } from "node:crypto";\nexport const id = randomUUID;\n'],
  ["domain importa los adaptadores", "H1", "domain", 'import { crearVerificadorSimulado } from "@planetario/adapters/pagos/verificador-simulado";\nexport const v = crearVerificadorSimulado;\n'],
  ["ports importa domain (dirección invertida)", "H1", "ports", 'import { thetaS } from "@planetario/domain";\nexport const t = thetaS;\n'],
  ["contracts importa ports", "H1", "contracts", 'import type { ClockPort } from "@planetario/ports";\nexport type C = ClockPort;\n'],
  ["domain sale del paquete por ruta relativa", "H1", "domain", 'import { x } from "../../adapters/src/pagos/verificador-simulado.ts";\nexport const y = x;\n'],
  ["domain reexporta ioredis", "H1", "domain", 'export * from "ioredis";\n'],
  ["domain usa un tipo de three con import()", "H1", "domain", 'export type V = import("three").Vector3;\n'],
  ["domain carga Fastify con import() dinámico", "H3", "domain", 'export const f = () => import("fastify");\n'],
  ["domain usa require", "H3", "domain", 'declare const require: (m: string) => unknown;\nexport const g = require("grammy");\n'],
  ["domain lee Date.now", "H2", "domain", "export const t = () => Date.now();\n"],
  ["domain crea new Date() sin argumentos", "H2", "domain", "export const t = () => new Date();\n"],
  ["domain llama a Date()", "H2", "domain", "export const t = () => Date();\n"],
  ["domain usa Math.random", "H2", "domain", "export const r = () => Math.random();\n"],
  ["domain usa crypto.randomUUID", "H2", "domain", "declare const crypto: { randomUUID(): string };\nexport const id = () => crypto.randomUUID();\n"],
  ["domain lee process.env", "H2", "domain", "declare const process: { env: Record<string, string> };\nexport const e = () => process.env.SECRETO;\n"],
  ["domain usa performance.now", "H2", "domain", "declare const performance: { now(): number };\nexport const t = () => performance.now();\n"],
  ["domain usa globalThis.crypto", "H2", "domain", "export const c = () => (globalThis as any).crypto;\n"],
  ["domain usa globalThis[\"Date\"]", "H2", "domain", 'export const d = () => globalThis["Date"];\n'],
  ["domain usa globalThis.Math.random", "H2", "domain", "export const r = () => globalThis.Math.random();\n"],
  ["domain usa globalThis.Date.now", "H2", "domain", "export const t = () => globalThis.Date.now();\n"],
  ["domain crea new globalThis.Date()", "H2", "domain", "export const t = () => new globalThis.Date();\n"],
  ["domain desestructura random de Math", "H2", "domain", "const { random } = Math;\nexport const r = () => random();\n"],
  ["domain desestructura now de Date con otro nombre", "H2", "domain", "const { now: ahora } = Date;\nexport const t = () => ahora();\n"],
  ["domain desestructura crypto de globalThis", "H2", "domain", "const { crypto: c } = globalThis as any;\nexport const id = () => c;\n"],
  ["domain guarda Math.random en una variable", "H2", "domain", "const azar = Math.random;\nexport const r = () => azar();\n"],
  ["domain formatea una fecha recibida: permitido", null, "domain", "export const iso = (ms: number) => new Date(ms).toISOString();\n"],
  ["domain importa sus propios archivos y los permitidos: permitido", null, "domain", 'import { thetaS } from "./reputation-and-relevance.ts";\nimport type { Pedido } from "@planetario/contracts";\nimport type { ClockPort } from "@planetario/ports";\nexport type P = Pedido;\nexport type C = ClockPort;\nexport const t = thetaS;\n'],
];

let fallas = 0;
for (const [nombre, codigo, capa, contenido] of CASOS) {
  const dir = mkdtempSync(join(tmpdir(), "verificar-hexagono-"));
  try {
    cpSync(join(RAIZ, "packages"), join(dir, "packages"), { recursive: true, filter: (f) => !f.includes("node_modules") });
    if (capa) writeFileSync(join(dir, "packages", capa, "src", "sembrado.ts"), contenido);
    const r = spawnSync(process.execPath, [VERIFICADOR, "--raiz", dir], { encoding: "utf8" });
    const salida = `${r.stdout}${r.stderr}`;
    const ok = codigo === null ? r.status === 0 : r.status === 1 && salida.includes(`${codigo}:`) && salida.includes("sembrado.ts");
    if (!ok) fallas++;
    console.log(`${ok ? "ok   " : "FALLA"} ${(codigo ?? "válido").padEnd(7)} ${nombre}`);
    if (!ok) console.log(`      salida: ${salida.trim().split(/\r?\n/).slice(0, 4).join(" | ")}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
console.log(fallas ? `${fallas} de ${CASOS.length} casos fallaron.` : `${CASOS.length} casos correctos.`);
process.exit(fallas ? 1 : 0);
