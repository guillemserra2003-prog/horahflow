// Carga el motor de análisis publicado en la web y comprueba su huella SHA-256.
// Si el archivo de la web cambia, hay que actualizar ENGINE_SHA256 y volver a desplegar (ver README.md).
export const ENGINE_URL = "https://horahflow.com/server/engine.js";
// Se aceptan la versión nueva y la anterior, para que el cambio de la web no deje la función sin motor ni un minuto
export const ENGINE_SHA256 = ["05e5e6e9d48feea3cf8cb364f9e9059490e379702edefe7f4a371b28e156a454", "0f855bf87fcd3c5a2a32ed320decc89034effd949977d0acdb0a858aa4320159"];
// deno-lint-ignore no-explicit-any
let cached: any = null;
// deno-lint-ignore no-explicit-any
export async function loadEngine(): Promise<any> {
  if (cached) return cached;
  const r = await fetch(ENGINE_URL, { cache: "no-store" });
  if (!r.ok) throw new Error("No se pudo descargar el motor: " + r.status);
  const buf = new Uint8Array(await r.arrayBuffer());
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", buf))].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (!ENGINE_SHA256.includes(hash)) throw new Error("Huella del motor distinta: " + hash);
  // deno-lint-ignore no-explicit-any
  const scope: any = {};
  new Function("window", new TextDecoder().decode(buf))(scope);
  if (!scope.HFEngine) throw new Error("Motor sin HFEngine");
  cached = scope.HFEngine;
  return cached;
}
