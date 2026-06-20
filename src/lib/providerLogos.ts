/**
 * Resolución de logos de proveedor, static-export safe y sin servicios externos.
 *
 * El logo es local (`public/logos/<providerId>.svg`) o un campo `logoPath` del
 * registro; si no existe ninguno, la tarjeta cae a un monograma (ver
 * `ProviderLogo`). Para no emitir requests 404 cuando todavía no hay un logo, las
 * vistas (server components) consultan `availableProviderLogos()` y solo pasan
 * `src` cuando el archivo existe. Este módulo lee el filesystem: solo server.
 */

import fs from "node:fs/promises";
import path from "node:path";

export { resolveLogoSrc } from "./providerLogoUtils";

const LOGOS_DIR = path.join(process.cwd(), "public", "logos");

/** Conjunto de providerIds que tienen un logo en `public/logos/<id>.svg`. */
export async function availableProviderLogos(): Promise<Set<string>> {
  try {
    const files = await fs.readdir(LOGOS_DIR);
    return new Set(files.filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4)));
  } catch {
    return new Set();
  }
}
