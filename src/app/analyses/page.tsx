import { loadAllLicenseAnalyses } from "@/lib/storage";
import { computeMetrics } from "@/lib/derive";
import { AnalysisTable } from "@/components/AnalysisTable";

export const metadata = { title: "Tabla de análisis — UP-Law-AILO" };

export default async function AnalysesPage() {
  const analyses = await loadAllLicenseAnalyses();
  const m = computeMetrics(analyses);

  const metrics: { label: string; value: number }[] = [
    { label: "Análisis", value: m.total },
    { label: "Proveedores", value: m.providers },
    { label: "Fuentes verificadas", value: m.verifiedSources },
    { label: "Sin revisión legal", value: m.unreviewed },
    { label: "Modalidades", value: m.modesDetected },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-slate-900">Tabla de análisis</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Registro de due diligence documental. Cada fila es el análisis preliminar de un documento,
            con su modalidad de contratación, perfil de privacidad, riesgo contractual y trazabilidad de fuente.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-5 lg:w-auto">
          {metrics.map((c) => (
            <div key={c.label} className="bg-white px-4 py-2.5">
              <dd className="font-serif text-2xl font-semibold leading-none text-slate-900">{c.value}</dd>
              <dt className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{c.label}</dt>
            </div>
          ))}
        </dl>
      </header>

      <AnalysisTable analyses={analyses} />
    </div>
  );
}
