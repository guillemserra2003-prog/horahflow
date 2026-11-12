// Texto de una factura en PDF (pdf.js en versión «serverless», sin workers).
// Solo las 3 primeras páginas: el importe de una factura está siempre al principio.
import { getDocumentProxy } from "npm:unpdf@1";

export const MAX_PAGES = 3, MAX_CHARS = 4000;

export async function pdfText(bytes: Uint8Array): Promise<string> {
  const doc = await getDocumentProxy(new Uint8Array(bytes), { isEvalSupported: false, disableFontFace: true, useSystemFonts: false } as any);
  try {
    const out: string[] = [];
    for (let p = 1; p <= Math.min(doc.numPages, MAX_PAGES); p++) {
      const tc = await (await doc.getPage(p)).getTextContent();
      out.push(tc.items.map((i: any) => (i.str ?? "") + (i.hasEOL ? "\n" : " ")).join(""));
    }
    return out.join("\n").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_CHARS);
  } finally { try { await doc.destroy(); } catch { /* nada */ } }
}
