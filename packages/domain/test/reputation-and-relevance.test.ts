import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { C_INICIAL, CAPACIDAD_POR_DEFECTO, PESOS_DEL_INDICE, calificacionAjustada, cargaOperativa, indiceDeRelevancia, thetaS } from "@planetario/domain";

const cerca = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

describe("calificación bayesiana (ADR-0004)", () => {
  it("una marca sin notas arranca en la media del nicho", () => {
    assert.equal(calificacionAjustada({ mediaDelNicho: 4.2, sumaDeNotas: 0, numeroDeNotas: 0 }), 4.2);
  });

  it("aplica (C·m + suma) / (C + n) con C = 10", () => {
    assert.equal(C_INICIAL, 10);
    cerca(calificacionAjustada({ mediaDelNicho: 4, sumaDeNotas: 50, numeroDeNotas: 10 }), 4.5);
    cerca(calificacionAjustada({ mediaDelNicho: 4, sumaDeNotas: 5, numeroDeNotas: 1 }), 45 / 11);
  });

  it("pocas notas extremas mueven poco la calificación", () => {
    // Dos notas de 1 en un nicho con media 4: el promedio simple sería 1; el ajustado queda en 42 / 12 = 3,5.
    cerca(calificacionAjustada({ mediaDelNicho: 4, sumaDeNotas: 2, numeroDeNotas: 2 }), 3.5);
  });

  it("rechaza entradas imposibles", () => {
    assert.throws(() => calificacionAjustada({ mediaDelNicho: 6, sumaDeNotas: 0, numeroDeNotas: 0 }), RangeError);
    assert.throws(() => calificacionAjustada({ mediaDelNicho: 4, sumaDeNotas: 30, numeroDeNotas: 5 }), RangeError);
    assert.throws(() => calificacionAjustada({ mediaDelNicho: 4, sumaDeNotas: 3, numeroDeNotas: 1.5 }), RangeError);
  });
});

describe("Índice de Relevancia (kernel: 40 / 30 / 20 / 10)", () => {
  it("pondera los cuatro componentes normalizados", () => {
    assert.deepEqual(PESOS_DEL_INDICE, { calificacion: 0.4, compras: 0.3, flujo: 0.2, sedes: 0.1 });
    cerca(indiceDeRelevancia({ calificacion: 1, compras: 1, flujo: 1, sedes: 1 }), 100);
    cerca(indiceDeRelevancia({ calificacion: 1, compras: 0, flujo: 0, sedes: 1 }), 50);
    cerca(indiceDeRelevancia({ calificacion: 0.9, compras: 0.5, flujo: 0.25, sedes: 0 }), 36 + 15 + 5);
  });

  it("no normaliza: rechaza componentes fuera de [0, 1] (PEN-18)", () => {
    assert.throws(() => indiceDeRelevancia({ calificacion: 4.5, compras: 0, flujo: 0, sedes: 0 }), /PEN-18/);
    assert.throws(() => indiceDeRelevancia({ calificacion: 0.5, compras: -0.1, flujo: 0, sedes: 0 }), RangeError);
    assert.throws(() => indiceDeRelevancia({ calificacion: Number.NaN, compras: 0, flujo: 0, sedes: 0 }), RangeError);
  });
});

describe("rule_02: carga y Θ_s", () => {
  it("L_m = pendientes / 15", () => {
    assert.equal(CAPACIDAD_POR_DEFECTO, 15);
    assert.equal(cargaOperativa(15), 1);
    cerca(cargaOperativa(6), 0.4);
    assert.throws(() => cargaOperativa(-1), RangeError);
  });

  it("Θ_s vale 1 hasta 0,90, baja lineal y llega a 0 en 1", () => {
    assert.equal(thetaS(0), 1);
    assert.equal(thetaS(0.9), 1);
    cerca(thetaS(0.95), 0.5);
    assert.equal(thetaS(1), 0);
    assert.equal(thetaS(1.4), 0);
    assert.throws(() => thetaS(-0.1), RangeError);
  });
});
