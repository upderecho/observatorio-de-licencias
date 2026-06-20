/**
 * DRY RUN de deriva de licencias: compara, para cada documento `verified` del
 * registro, el texto vivo en internet contra el análisis guardado, usando el
 * MISMO pipeline (fetchUrl → extractText → sha256) para que el hash sea
 * comparable con `metadata.contentHash`. NO escribe nada.
 *
 * Uso:
 *   npx tsx scripts/check-drift.ts [--limit N] [--provider <id|nombre>]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { loadRegistry, flattenDocuments } from "../src/lib/sources";
import { fetchUrl } from "../src/lib/fetcher";
import { detectFormat, extractText } from "../src/lib/extract";
import { sha256 } from "../src/lib/hash";

/** Subconjunto del análisis que el dry-run necesita (lectura directa de disco). */
interface StoredAnalysis {
  providerName: string;
  productName: string;
  documentType: string;
  retrievedAt?: string;
  metadata: { contentHash?: string; retrievedAt?: string };
}

/** Clave única y presente en ambos lados (registro y análisis). documentId no
 * sirve: no es único entre proveedores y falta en análisis viejos. */
function docKey(providerName: string, productName: string, documentType: string): string {
  const n = (s: string) => s.trim().toLowerCase();
  return `${n(providerName)}||${n(productName)}||${n(documentType)}`;
}

async function loadStoredAnalyses(): Promise<StoredAnalysis[]> {
  const dir = path.join(process.cwd(), "data", "licenses");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
  const out: StoredAnalysis[] = [];
  for (const f of files) {
    out.push(JSON.parse(await fs.readFile(path.join(dir, f), "utf8")) as StoredAnalysis);
  }
  return out;
}

type Status = "SIN_CAMBIOS" | "CAMBIO" | "BLOQUEADO" | "INVALIDO" | "SIN_ANALISIS";

interface Row {
  provider: string;
  documentType: string;
  url: string;
  status: Status;
  detail: string;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function main() {
  const limit = arg("--limit") ? Number(arg("--limit")) : Infinity;
  const providerFilter = arg("--provider")?.toLowerCase();

  const registry = await loadRegistry();
  const analyses = await loadStoredAnalyses();

  // clave (proveedor||producto||tipo) -> análisis más reciente; y todos los hashes guardados.
  const latestByDoc = new Map<string, StoredAnalysis>();
  const hashesByDoc = new Map<string, Set<string>>();
  for (const a of analyses) {
    const key = docKey(a.providerName, a.productName, a.documentType);
    const cur = latestByDoc.get(key);
    if (!cur || (a.metadata.retrievedAt ?? a.retrievedAt ?? "") > (cur.metadata.retrievedAt ?? cur.retrievedAt ?? "")) {
      latestByDoc.set(key, a);
    }
    if (a.metadata.contentHash) {
      (hashesByDoc.get(key) ?? hashesByDoc.set(key, new Set()).get(key)!).add(a.metadata.contentHash);
    }
  }

  let docs = flattenDocuments(registry)
    .filter((d) => d.document.sourceStatus === "verified" && d.document.sourceUrl)
    .filter((d) => !providerFilter || d.provider.providerId.toLowerCase().includes(providerFilter) || d.provider.providerName.toLowerCase().includes(providerFilter));
  if (Number.isFinite(limit)) docs = docs.slice(0, limit);

  console.log(`Comparando ${docs.length} documentos verified (dry run, no escribe)...\n`);

  const rows = await mapLimit(docs, 5, async (d): Promise<Row> => {
    const url = d.document.sourceUrl!;
    const base = { provider: `${d.provider.providerName} · ${d.document.documentType}`, documentType: d.document.documentType, url };
    const key = docKey(d.provider.providerName, d.product.productName, d.document.documentType);
    const stored = latestByDoc.get(key);
    const storedHashes = hashesByDoc.get(key);
    if (!stored || !storedHashes || storedHashes.size === 0) {
      return { ...base, status: "SIN_ANALISIS", detail: "no hay análisis guardado para este documento" };
    }
    const res = await fetchUrl(url);
    if (res.error || res.status === 0) return { ...base, status: "BLOQUEADO", detail: `red: ${res.error ?? "sin respuesta"}` };
    if (res.status !== 200) return { ...base, status: "BLOQUEADO", detail: `HTTP ${res.status} (posible Cloudflare/SPA: requiere stealth)` };

    const format = detectFormat((res as { contentType?: string | null }).contentType ?? null, res.body);
    const extraction = extractText(format, res.body);
    if (!extraction.validity.ok) {
      return { ...base, status: "INVALIDO", detail: extraction.validity.reason ?? "contenido no válido" };
    }
    const liveHash = sha256(extraction.text);
    const storedLatest = stored.metadata.contentHash ?? "";
    if (liveHash === storedLatest) {
      return { ...base, status: "SIN_CAMBIOS", detail: `hash ${short(liveHash)} · ${extraction.validity.chars} chars` };
    }
    const matchedOlder = storedHashes.has(liveHash);
    return {
      ...base,
      status: "CAMBIO",
      detail: `guardado ${short(storedLatest)} → vivo ${short(liveHash)}${matchedOlder ? " (coincide con una versión previa)" : ""} · ${extraction.validity.chars} chars`,
    };
  });

  const ICON: Record<Status, string> = {
    SIN_CAMBIOS: "=", CAMBIO: "≠", BLOQUEADO: "·", INVALIDO: "!", SIN_ANALISIS: "?",
  };
  for (const r of rows) {
    console.log(`${ICON[r.status]} [${r.status.padEnd(11)}] ${r.provider}`);
    console.log(`    ${r.detail}`);
  }

  const count = (s: Status) => rows.filter((r) => r.status === s).length;
  console.log(`\nResumen: ${count("CAMBIO")} cambiaron · ${count("SIN_CAMBIOS")} sin cambios · ${count("BLOQUEADO")} bloqueados/inalcanzables · ${count("INVALIDO")} contenido inválido · ${count("SIN_ANALISIS")} sin análisis previo`);
}

function short(h: string): string {
  return h.replace(/^sha256:/, "").slice(0, 10);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
