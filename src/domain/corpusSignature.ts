/**
 * Firma determinística del corpus.
 *
 * Un hash sha256 sobre el estado actual de los documentos (id + hash de contenido
 * + fecha de obtención). Cambia cuando se actualiza una licencia y se reingiere,
 * de modo que el ensayo de la home queda "firmado" contra el corpus vigente y se
 * reconstruye al actualizarse las fuentes. Sin LLM; corre en build (export-safe).
 */

import { createHash } from "node:crypto";
import type { LicenseAnalysis } from "@/lib/schema";

export interface CorpusSignature {
  hash: string;
  shortHash: string;
  documentCount: number;
  providerCount: number;
  lastUpdated: string;
}

export function computeCorpusSignature(analyses: LicenseAnalysis[]): CorpusSignature {
  const rows = analyses
    .map((a) => `${a.id}|${a.metadata.contentHash ?? ""}|${a.metadata.retrievedAt ?? a.retrievedAt}`)
    .sort();
  const hash = createHash("sha256").update(rows.join("\n")).digest("hex");
  const providers = new Set(analyses.map((a) => a.providerName));
  const lastUpdated =
    analyses
      .map((a) => (a.metadata.retrievedAt ?? a.retrievedAt).slice(0, 10))
      .sort()
      .at(-1) ?? "";
  return {
    hash,
    shortHash: hash.slice(0, 12),
    documentCount: analyses.length,
    providerCount: providers.size,
    lastUpdated,
  };
}
