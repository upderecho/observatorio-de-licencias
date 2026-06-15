import Link from "next/link";
import { notFound } from "next/navigation";
import { loadLicenseAnalysis, loadAnalysisText, loadAllLicenseAnalyses } from "@/lib/storage";
import { PageContainer } from "@/components/PageContainer";

// Pre-genera el visor de texto fuente para cada análisis (export estático).
export async function generateStaticParams() {
  const all = await loadAllLicenseAnalyses();
  return all.map((a) => ({ id: a.id }));
}

/**
 * Visor de texto fuente extraído. Renderiza SIEMPRE como texto plano dentro de
 * <pre>. Nunca inyecta HTML del documento externo en la UI (seguridad).
 */
export default async function SourceTextPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await loadLicenseAnalysis(id);
  if (!analysis) notFound();

  const text = await loadAnalysisText(analysis);

  return (
    <PageContainer className="space-y-4">
      <Link href={`/analysis/${id}`} className="text-sm text-sky-700 hover:underline">
        ← Volver al análisis
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Texto fuente extraído — {analysis.providerName} · {analysis.productName}
        </h1>
        <p className="text-sm text-slate-600">
          {analysis.documentType} · <code className="text-xs">{analysis.rawTextPath}</code>
        </p>
      </div>

      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Texto plano extraído automáticamente. Puede contener ruido de extracción. Se muestra como texto,
        nunca como HTML renderizado.
      </div>

      {text === null ? (
        <p className="text-slate-500">No se encontró el texto fuente en disco.</p>
      ) : (
        <pre className="evidence-quote max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800">
          {text}
        </pre>
      )}
    </PageContainer>
  );
}
