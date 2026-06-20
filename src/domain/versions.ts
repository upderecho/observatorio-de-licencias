/**
 * Versionado de documentos sobre Git (derivación pura, sin DB ni schema nuevo).
 *
 * Un "documento lógico" es el conjunto de capturas (análisis) que comparten
 * proveedor + producto + tipo de documento. Cada captura es un JSON fechado en
 * `data/licenses` (el pipeline ya crea archivos con fecha / `-vN` al cambiar el
 * texto). La app muestra SIEMPRE la captura más reciente; las anteriores quedan
 * accesibles por su propia página `/analysis/[id]`.
 *
 * La clave NO usa `documentId` del registro: no es único entre proveedores y
 * falta en análisis viejos. Proveedor+producto+tipo está siempre presente.
 */

import type { LicenseAnalysis } from "@/lib/schema";

/** Clave estable del documento lógico (no de la captura). */
export function documentKey(a: LicenseAnalysis): string {
  const n = (s: string) => s.trim().toLowerCase();
  return `${n(a.providerName)}||${n(a.productName)}||${n(a.documentType)}`;
}

/** Marca temporal de la captura (preferimos la de ingesta). */
function capturedAt(a: LicenseAnalysis): string {
  return a.metadata.retrievedAt ?? a.retrievedAt ?? "";
}

/** Orden de recencia: más reciente primero; desempate estable por id. */
function byRecencyDesc(a: LicenseAnalysis, b: LicenseAnalysis): number {
  const ca = capturedAt(a);
  const cb = capturedAt(b);
  if (ca !== cb) return ca < cb ? 1 : -1;
  return b.id.localeCompare(a.id);
}

/** Una sola captura por documento: la más reciente. */
export function latestAnalyses(all: LicenseAnalysis[]): LicenseAnalysis[] {
  const latest = new Map<string, LicenseAnalysis>();
  for (const a of all) {
    const k = documentKey(a);
    const cur = latest.get(k);
    if (!cur || byRecencyDesc(a, cur) < 0) latest.set(k, a);
  }
  return Array.from(latest.values());
}

/** Todas las capturas del documento al que pertenece `analysis`, recientes primero. */
export function versionsOf(all: LicenseAnalysis[], analysis: LicenseAnalysis): LicenseAnalysis[] {
  const k = documentKey(analysis);
  return all.filter((a) => documentKey(a) === k).sort(byRecencyDesc);
}
