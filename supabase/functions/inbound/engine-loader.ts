// Carga el motor de análisis publicado en la web y comprueba su huella SHA-256.
// Si el archivo de la web cambia, hay que actualizar ENGINE_SHA256 y volver a desplegar (ver MANUAL.md).
export const ENGINE_URL = "https://horahflow.com/server/engine.js";
export const ENGINE_SHA256 = "bf10fb7cea86b577b1959d7b66ec26295b4276c269a3561559da12b3160586c8";
// deno-lint-ignore no-explicit-any
let cached: any = null;
// deno-lint-ignore no-explicit-any
export async function loadEngine(): Promise<any> {
  if (cached) return cached;
  const r = await fetch(ENGINE_URL, { cache: "no-store" });
  if (!r.ok) throw new Error("No se pudo descargar el motor: " + r.status);
  const buf = new Uint8Array(await r.arrayBuffer());
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", buf))].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hash !== ENGINE_SHA256) throw new Error("Huella del motor distinta: " + hash);
  // deno-lint-ignore no-explicit-any
  const scope: any = {};
  new Function("window", new TextDecoder().decode(buf))(scope);
  if (!scope.HFEngine) throw new Error("Motor sin HFEngine");
  cached = scope.HFEngine;
  return cached;
}
