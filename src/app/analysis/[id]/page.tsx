import Link from "next/link";
import { notFound } from "next/navigation";
import { loadLicenseAnalysis, loadAllLicenseAnalyses } from "@/lib/storage";
import { versionsOf } from "@/domain/versions";
import { loadRegistry } from "@/lib/sources";
import { productNicheInfo } from "@/domain/taxonomies/productNiches";
import { CATEGORIES } from "@/lib/categories";
import { MODE_LABELS } from "@/lib/contractingModes";
import { ModeIndicator, PrivacyIndicator, RiskIndicator, SourceIndicator } from "@/components/indicators";
import { LegalCategorySection } from "@/components/LegalCategorySection";
import {
  getScenariosForDocument,
  getDocumentReadingPriorities,
  READING_PRIORITY_LABEL,
  type ReadingPriority,
} from "@/domain/readingGuides";
import { PageContainer } from "@/components/PageContainer";

export async function generateStaticParams() {
  const all = await loadAllLicenseAnalyses();
  return all.map((a) => ({ id: a.id }));
}

const PRIORITY_TONE: Record<ReadingPriority, string> = {
  high: "text-slate-900 font-medium",
  medium: "text-slate-600",
  low: "text-slate-500",
  insufficient: "text-slate-400",
};

function host(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await loadLicenseAnalysis(id);
  if (!analysis) notFound();

  const all = await loadAllLicenseAnalyses();
  const date = (analysis.metadata.retrievedAt ?? analysis.retrievedAt).slice(0, 10);
  const domain = host(analysis.sourceUrl);

  // Nicho funcional del producto (desde el registro), para explicar qué hace.
  let niche: string | null = null;
  try {
    const reg = await loadRegistry();
    const prov = reg.providers.find((p) => p.providerName === analysis.providerName);
    niche = prov?.products.find((pr) => pr.productName === analysis.productName)?.productNiche ?? null;
  } catch {
    niche = null;
  }
  const nicheInfo = niche ? productNicheInfo(niche) : null;
  const scenarios = getScenariosForDocument(analysis);
  const priorities = getDocumentReadingPriorities(analysis);
  const topClauses = priorities.slice(0, 5);
  // Versiones del documento (misma clave proveedor+producto+tipo). La vigente es
  // la más reciente; las demás quedan accesibles por su propia página.
  const versions = versionsOf(all, analysis);
  const otherVersions = versions.filter((v) => v.id !== analysis.id);

  // Cláusulas relevantes = categorías presentes (detectadas o ambiguas); el resto no se prioriza para lectura.
  const relevant = CATEGORIES.filter((cat) => {
    const st = analysis.categories[cat.key]?.status;
    return st === "found" || st === "unclear";
  });

  return (
    <PageContainer className="space-y-6">
      <Link href="/analyses" className="text-sm text-sky-700 hover:underline">← Volver al corpus documental</Link>

      {/* Encabezado documental */}
      <header className="space-y-1 border-b border-slate-200 pb-4">
        <h1 className="font-serif text-3xl font-bold text-slate-900">{analysis.providerName} · {analysis.productName}</h1>
        <p className="text-slate-700">{analysis.documentType} · {MODE_LABELS[analysis.contractingMode]}</p>
        <p className="text-sm text-slate-500">
          Documento fuente obtenido el {date}{domain ? <> desde {domain}</> : null}.
        </p>
      </header>

      {nicheInfo && (
        <section className="rounded border border-slate-200 bg-white p-3 text-sm">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tipo de herramienta</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">{nicheInfo.label}</span>
          </div>
          <p className="mt-1 text-slate-700">{nicheInfo.plainDescription}</p>
          <p className="mt-1 text-xs text-slate-500">
            <span className="font-medium text-slate-600">Para el abogado:</span> {nicheInfo.legalReadingHint}
          </p>
        </section>
      )}

      <p className="text-sm leading-relaxed text-slate-500">
        Lectura preliminar basada en documentos públicos y evidencia textual. No constituye asesoramiento legal.
      </p>

      {/* Acceso discreto al histórico: solo aparece si hay más de una captura. */}
      {otherVersions.length > 0 && (
        <section className="rounded border border-slate-200 bg-white p-3 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Otras versiones de este documento</h2>
          <ul className="mt-2 space-y-1">
            {otherVersions.map((v) => {
              const vDate = (v.metadata.retrievedAt ?? v.retrievedAt).slice(0, 10);
              const isCurrent = v.id === versions[0].id;
              return (
                <li key={v.id} className="text-slate-700">
                  <Link href={`/analysis/${v.id}`} className="text-sky-700 hover:underline">{vDate}</Link>
                  {isCurrent && <span className="ml-2 text-xs text-emerald-700">(vigente)</span>}
                  {v.metadata.contentHash && (
                    <span className="ml-2 text-xs text-slate-400">sha256:{v.metadata.contentHash.replace(/^sha256:/, "").slice(0, 10)}…</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Qué leer en este documento (protagonista) */}
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-serif text-xl font-semibold text-slate-900">Qué leer en este documento</h2>
        <p className="mt-1 text-base leading-relaxed text-slate-600">
          {relevant.length > 0
            ? <>Este documento aporta evidencia sobre {relevant.slice(0, 6).map((c) => c.label.toLowerCase()).join(", ")}.</>
            : "No se detectaron cláusulas con evidencia suficiente en este documento."}
        </p>
        {topClauses.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prioridad de lectura</div>
            <ol className="mt-1 space-y-1 text-sm">
              {topClauses.map((c, i) => (
                <li key={c.key} className="text-slate-700">
                  {i + 1}. <Link href={`#cat-${c.key}`} className="hover:underline">{c.label}</Link>
                  <span className={`ml-2 text-xs ${PRIORITY_TONE[c.priority]}`}>· {READING_PRIORITY_LABEL[c.priority]}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-[2fr_1fr]">
        {/* Columna principal: lectura jurídica (≈70%) */}
        <div className="space-y-6">
          {scenarios.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Escenarios relacionados</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {scenarios.map((s) => (
                  <Link key={s.id} href={`/escenarios/${s.id}`} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                    {s.title}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cláusulas relevantes ({relevant.length})</h2>
            <div className="mt-2 rounded border border-slate-200 bg-white px-4">
              {relevant.length === 0 ? (
                <p className="py-4 text-sm text-slate-500">No se detectaron cláusulas relevantes con evidencia en este documento.</p>
              ) : (
                relevant.map((cat) => (
                  <div key={cat.key} id={`cat-${cat.key}`} className="scroll-mt-24">
                    <LegalCategorySection label={cat.label} finding={analysis.categories[cat.key]} />
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Aside: contexto documental (≈30%) */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <ModeIndicator analysis={analysis} />
          <PrivacyIndicator analysis={analysis} />
          <RiskIndicator analysis={analysis} />
          <section className="border-t-2 border-slate-200 pt-3">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Fuente documental</h2>
            <p className="text-sm text-slate-700">{domain ?? "—"} · {date}</p>
            <Link href={`/analysis/${analysis.id}/source`} className="mt-2 inline-block text-sm text-sky-700 hover:underline">
              Ver texto fuente extraído →
            </Link>
          </section>
        </aside>
      </div>

      {/* Trazabilidad técnica (colapsable, al final) */}
      <details className="rounded-md border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-slate-700">Trazabilidad técnica</summary>
        <div className="border-t border-slate-100 px-4 py-2">
          <SourceIndicator analysis={analysis} />
        </div>
      </details>
    </PageContainer>
  );
}
