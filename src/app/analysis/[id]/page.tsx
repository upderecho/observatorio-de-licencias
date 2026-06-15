import Link from "next/link";
import { notFound } from "next/navigation";
import { loadLicenseAnalysis, loadAllLicenseAnalyses } from "@/lib/storage";
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

  const date = (analysis.metadata.retrievedAt ?? analysis.retrievedAt).slice(0, 10);
  const domain = host(analysis.sourceUrl);
  const scenarios = getScenariosForDocument(analysis);
  const priorities = getDocumentReadingPriorities(analysis);
  const topClauses = priorities.slice(0, 5);
  // Cláusulas relevantes = categorías presentes (detectadas o ambiguas); el resto no se prioriza para lectura.
  const relevant = CATEGORIES.filter((cat) => {
    const st = analysis.categories[cat.key]?.status;
    return st === "found" || st === "unclear";
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-4">
      <Link href="/analyses" className="text-sm text-sky-700 hover:underline">← Volver al corpus documental</Link>

      {/* Encabezado documental */}
      <header className="space-y-1 border-b border-slate-200 pb-4">
        <h1 className="font-serif text-3xl font-bold text-slate-900">{analysis.providerName} · {analysis.productName}</h1>
        <p className="text-slate-700">{analysis.documentType} · {MODE_LABELS[analysis.contractingMode]}</p>
        <p className="text-sm text-slate-500">
          Documento fuente obtenido el {date}{domain ? <> desde {domain}</> : null}.
        </p>
      </header>

      <p className="text-sm leading-relaxed text-slate-500">
        Lectura preliminar basada en documentos públicos y evidencia textual. No constituye asesoramiento legal.
      </p>

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
    </div>
  );
}
