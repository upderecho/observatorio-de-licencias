import Link from "next/link";
import { notFound } from "next/navigation";
import { loadAllLicenseAnalyses } from "@/lib/storage";
import { MODE_LABELS } from "@/lib/contractingModes";
import { SENSITIVITY_LABEL } from "@/domain/legalUseScenarios";
import {
  getReadingGuide,
  getAllReadingGuides,
  getDocumentsForReadingGuide,
  getClausesForReadingGuide,
  READING_PRIORITY_LABEL,
  type ReadingPriority,
  type DocumentToRead,
} from "@/domain/readingGuides";
import { PageContainer } from "@/components/PageContainer";
import { EscenariosGate, EscenariosUnavailable } from "@/components/featureGates";

export async function generateStaticParams() {
  return getAllReadingGuides().map((g) => ({ scenarioId: g.id }));
}

// Prioridad de lectura = qué leer primero (no es riesgo): tonos neutros.
const PRIORITY_LABEL_TONE: Record<ReadingPriority, string> = {
  high: "bg-slate-900 text-white",
  medium: "bg-slate-200 text-slate-700",
  low: "bg-slate-100 text-slate-600",
  insufficient: "bg-slate-100 text-slate-400",
};

const PRIORITY_ORDER: ReadingPriority[] = ["high", "medium", "low"];

export default async function ScenarioReadingGuidePage({ params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params;
  const guide = getReadingGuide(scenarioId);
  if (!guide) notFound();

  const analyses = await loadAllLicenseAnalyses();
  const documents = getDocumentsForReadingGuide(guide, analyses);
  const clauses = getClausesForReadingGuide(guide, analyses);
  const byPriority = PRIORITY_ORDER.map((p) => ({ priority: p, docs: documents.filter((d) => d.readingPriority === p) })).filter((g) => g.docs.length > 0);

  return (
    <EscenariosGate fallback={<EscenariosUnavailable />}>
    <PageContainer className="space-y-8">
      <Link href="/escenarios" className="text-sm text-sky-700 hover:underline">← Escenarios</Link>

      <header className="max-w-3xl space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Guía de lectura · {SENSITIVITY_LABEL[guide.sensitivity as keyof typeof SENSITIVITY_LABEL] ?? guide.sensitivity}
        </div>
        <h1 className="font-serif text-3xl font-bold text-slate-900">{guide.title}</h1>
        <p className="text-base leading-relaxed text-slate-600">{guide.description}</p>
        <p className="pt-1 font-serif text-xl text-slate-800">{guide.guidingQuestion}</p>
      </header>

      {/* Lectura prioritaria + layout de lectura (docs principal · cláusulas aside) */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
        {/* Columna principal: documentos a leer */}
        <div className="lg:col-span-2">
          <section>
            <h2 className="font-serif text-xl font-semibold text-slate-900">Lectura prioritaria</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {documents.length > 0
                ? <>{documents.length} documento{documents.length === 1 ? "" : "s"} contiene{documents.length === 1 ? "" : "n"} cláusulas relevantes para este escenario, ordenados por qué leer primero (no es una conclusión jurídica).</>
                : "No se encontró evidencia suficiente en el corpus para este escenario."}
            </p>

            <div className="mt-5 space-y-6">
              {byPriority.map((grp) => (
                <div key={grp.priority}>
                  <h3 className="text-sm font-semibold text-slate-700">{READING_PRIORITY_LABEL[grp.priority]}</h3>
                  <div className="mt-2 space-y-3">
                    {grp.docs.map((d) => <DocCard key={d.analysisId} d={d} />)}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-5 text-xs leading-relaxed text-slate-400">
              Conviene leer también, cuando existan: {guide.requiredDocumentTypes.join(" · ")}.
            </p>
          </section>
        </div>

        {/* Aside: cláusulas a revisar (checklist de lectura) */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cláusulas a revisar</h2>
            <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200 bg-white">
              {clauses.map((c) => (
                <li key={c.key} className="px-3 py-2.5">
                  <div className="text-sm font-medium text-slate-800">{c.label}</div>
                  {c.documentsWithEvidence.length > 0 ? (
                    <Link href={`/analysis/${c.documentsWithEvidence[0].analysisId}`} className="text-xs text-sky-700 hover:underline">
                      {c.documentsWithEvidence.length} documento{c.documentsWithEvidence.length === 1 ? "" : "s"} con evidencia →
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">Sin evidencia detectada</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <p className="max-w-3xl rounded-md border border-l-4 border-slate-200 border-l-gold-500 bg-white p-4 text-sm leading-relaxed text-slate-700">
        {guide.limitations}
      </p>
    </PageContainer>
    </EscenariosGate>
  );
}

function DocCard({ d }: { d: DocumentToRead }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-base font-semibold leading-snug text-slate-900">
          {d.providerName} · {d.productName}
          <span className="font-normal text-slate-500"> — {d.documentType}</span>
        </h4>
        <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${PRIORITY_LABEL_TONE[d.readingPriority]}`}>
          {READING_PRIORITY_LABEL[d.readingPriority]}
        </span>
      </div>
      <div className="mt-1 text-[13px] text-slate-500">Modalidad: {MODE_LABELS[d.contractingMode as keyof typeof MODE_LABELS] ?? d.contractingMode}</div>
      {d.whyRead.length > 0 && (
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          <span className="font-medium text-slate-500">Contiene:</span> {d.whyRead.join(", ")}.
        </p>
      )}
      <div className="mt-3">
        <Link href={`/analysis/${d.analysisId}`} className="text-sm font-medium text-sky-700 hover:underline">
          Abrir dossier →
        </Link>
      </div>
    </article>
  );
}
