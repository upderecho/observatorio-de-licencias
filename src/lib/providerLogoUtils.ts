/**
 * Helpers puros para el logo de proveedor (sin JSX, sin fs): aptos para client,
 * server y tests. El componente `ProviderLogo` y las vistas server los reusan.
 */

import { withBasePath } from "./basePath";

export const LOGO_PALETTE = ["#334155", "#475569", "#1e3a5f", "#3f3f46", "#0f766e", "#7c2d12"];

/** Color determinístico por id (siempre el mismo, dentro de la paleta). */
export function colorFor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return LOGO_PALETTE[h % LOGO_PALETTE.length];
}

/** Iniciales para el monograma (dos primeras palabras, o las 2 primeras letras). */
export function initials(name: string): string {
  const w = name.trim().split(/\s+/);
  return ((w[0]?.[0] ?? "") + (w[1]?.[0] ?? "")).toUpperCase() || name.slice(0, 2).toUpperCase();
}

/**
 * Resuelve el `src` del logo (con basePath) o `undefined` si corresponde el
 * monograma. `logoPath` del registro tiene prioridad; si no, el archivo
 * convencional solo cuando existe en `available`.
 */
export function resolveLogoSrc(providerId: string, available: Set<string>, logoPath?: string): string | undefined {
  if (logoPath) return withBasePath(logoPath);
  if (available.has(providerId)) return withBasePath(`logos/${providerId}.svg`);
  return undefined;
}
