// Carga el motor de análisis publicado en la web y comprueba su huella SHA-256.
// Si el archivo de la web cambia, hay que actualizar ENGINE_SHA256 y volver a desplegar (ver README.md).
export const ENGINE_URL = "https://horahflow.com/server/engine.js";
// Se aceptan la versión nueva y la anterior, para que el cambio de la web no deje la función sin motor ni un minuto
export const ENGINE_SHA256 = ["1eb3bde96a71840181686930b8a5a55525dd71fe3b8a32dc8bff0f33d9f67804", "ba97cecf0dad9d8104138200abeb3210c9f0bc44180588aacb8ad12dc1f1ce54"];
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
