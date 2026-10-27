// Tipos mínimos de Node que usa el simulador de pagos, para que tsc compruebe que cumple VerificadorDePagos sin
// agregar @types/node como dependencia (decisión del usuario del 2026-10-27: solo typescript en la raíz). Si un
// adaptador necesita más de Node, se declara aquí o se propone @types/node.
declare module "node:crypto" {
  interface Hmac {
    update(datos: string, codificacion: "utf8"): Hmac;
    digest(codificacion: "hex"): string;
  }
  export function createHmac(algoritmo: "sha256", clave: string): Hmac;
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
}

declare const Buffer: { from(texto: string, codificacion: "hex"): Uint8Array };
