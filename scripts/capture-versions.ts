/**
 * Captura SEGURA de versiones nuevas: re-descarga los documentos `verified` y, si
 * el contenido cambió, escribe una NUEVA captura fechada (vía ingestDocument, que
 * es registry-puro). A diferencia de `scripts/ingest.ts`, NUNCA escribe el
 * registro (`providers.json`) — así no degrada `verified`.
 *
 * Además:
 *  - dedup por hash dentro de la corrida (evita versiones duplicadas, p. ej.
 *    productos del registro que apuntan a la misma URL);
 *  - imprime un diff línea-a-línea contra la versión anterior, para distinguir
 *    cambio SUSTANTIVO de ruido cosmético (timestamps, banners dinámicos) antes
 *    de enshrinar una "versión".
 *
 * Uso: npx tsx scripts/capture-versions.ts [--provider <id>] [--limit N] [--stealth]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { loadRegistry, flattenDocuments } from "../src/lib/sources";
import { ingestDocument, ensureDataDirs } from "../src/lib/ingest";
import { documentKey } from "../src/domain/versions";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(name);

const LICENSES = path.join(process.cwd(), "data", "licenses");
const EXTRACTED = path.join(process.cwd(), "data", "extracted");

async function readJSON(id: string): Promise<{ providerName: string; productName: string; documentType: string; retrievedAt?: string; metadata: { contentHash?: string; retrievedAt?: string; extractedTextPath?: string | null } } | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(LICENSES, `${id}.json`), "utf8"));
  } catch {
    return null;
  }
}

/** Diff línea-a-línea simple (LCS-free): líneas presentes solo en uno u otro. */
function lineDiff(oldText: string, newText: string): { added: number; removed: number; sample: string[] } {
  const o = new Set(oldText.split("\n").map((l) => l.trim()).filter(Boolean));
  const n = new Set(newText.split("\n").map((l) => l.trim()).filter(Boolean));
  const added = [...n].filter((l) => !o.has(l));
  const removed = [...o].filter((l) => !n.has(l));
  const sample = [
    ...removed.slice(0, 4).map((l) => `- ${l.slice(0, 120)}`),
    ...added.slice(0, 4).map((l) => `+ ${l.slice(0, 120)}`),
  ];
  return { added: added.length, removed: removed.length, sample };
}

async function main() {
  const providerFilter = arg("--provider")?.toLowerCase();
  const limit = arg("--limit") ? Number(arg("--limit")) : Infinity;
  const stealth = has("--stealth");

  await ensureDataDirs();
  const registry = await loadRegistry();

  // Mapa clave-de-documento -> última captura previa (para el diff).
  const files = (await fs.readdir(LICENSES)).filter((f) => f.endsWith(".json"));
  const prevByKey = new Map<string, { id: string; extractedPath: string | null; capturedAt: string }>();
  const existingHashes = new Set<string>();
  for (const f of files) {
    const id = f.slice(0, -5);
    const a = await readJSON(id);
    if (!a) continue;
    if (a.metadata.contentHash) existingHashes.add(a.metadata.contentHash);
    const key = documentKey(a as never);
    const at = a.metadata.retrievedAt ?? a.retrievedAt ?? "";
    const cur = prevByKey.get(key);
    if (!cur || at > cur.capturedAt) prevByKey.set(key, { id, extractedPath: a.metadata.extractedTextPath ?? path.join("data/extracted", `${id}.txt`), capturedAt: at });
  }

  let docs = flattenDocuments(registry).filter((d) => d.document.sourceStatus === "verified" && d.document.sourceUrl);
  if (providerFilter) docs = docs.filter((d) => d.provider.providerId.toLowerCase().includes(providerFilter) || d.provider.providerName.toLowerCase().includes(providerFilter));
  if (Number.isFinite(limit)) docs = docs.slice(0, limit);

  console.log(`Captura segura de ${docs.length} documentos${stealth ? " (stealth)" : ""}. NO toca el registro.\n`);

  const seenThisRun = new Set<string>();
  let wrote = 0, dup = 0, unchanged = 0, blocked = 0, invalid = 0;

  for (const flat of docs) {
    const label = `${flat.provider.providerName} · ${flat.document.documentType}`;
    const res = await ingestDocument(flat, stealth ? { stealth: true } : {});

    if (!res.wrote) {
      // needs_manual_review aquí casi siempre = "contenido idéntico a versión previa" (sin cambios).
      if (res.status === "needs_manual_review") { unchanged++; console.log(`= ${label}: sin cambios`); }
      else if (res.status === "unsupported_format") { invalid++; console.log(`! ${label}: contenido inválido (no-documento)`); }
      else { blocked++; console.log(`· ${label}: ${res.status} ${res.reason ? `(${res.reason})` : ""}`); }
      continue;
    }

    // Dedup por hash (misma corrida o ya existente bajo otro id): no enshrinar duplicados.
    if (res.contentHash && (seenThisRun.has(res.contentHash) || existingHashes.has(res.contentHash))) {
      await fs.rm(path.join(LICENSES, `${res.id}.json`)).catch(() => {});
      await fs.rm(path.join(EXTRACTED, `${res.id}.txt`)).catch(() => {});
      dup++;
      console.log(`× ${label}: contenido duplicado de otra captura — descartado (${res.id})`);
      continue;
    }
    if (res.contentHash) seenThisRun.add(res.contentHash);
    wrote++;

    // Diff contra la versión anterior del mismo documento, para juzgar sustancia.
    const prev = prevByKey.get(documentKey({ providerName: flat.provider.providerName, productName: flat.product.productName, documentType: flat.document.documentType } as never));
    let diffNote = "(sin versión previa para comparar)";
    if (prev?.extractedPath) {
      try {
        const oldText = await fs.readFile(path.join(process.cwd(), prev.extractedPath), "utf8");
        const newText = await fs.readFile(path.join(EXTRACTED, `${res.id}.txt`), "utf8");
        const d = lineDiff(oldText, newText);
        diffNote = `${d.removed} líneas -, ${d.added} líneas +`;
        console.log(`≠ ${label}: NUEVA VERSIÓN ${res.id}\n    diff vs ${prev.id}: ${diffNote}`);
        for (const s of d.sample) console.log(`      ${s}`);
        continue;
      } catch { /* cae al log simple */ }
    }
    console.log(`≠ ${label}: NUEVA VERSIÓN ${res.id} — ${diffNote}`);
  }

  console.log(`\nResumen: ${wrote} versiones nuevas · ${unchanged} sin cambios · ${dup} duplicados descartados · ${blocked} bloqueados · ${invalid} inválidos`);
  console.log("Recordá: revisá el diff para descartar cambios cosméticos antes de commitear.");
}

main().catch((e) => { console.error(e); process.exit(1); });
