import { loadAllLicenseAnalyses } from "@/lib/storage";
import { buildComparisonUnits, buildComparisonPresets, getScenarioComparison } from "@/domain/comparison";
import { ComparisonExplorer } from "@/components/ComparisonExplorer";

export const metadata = { title: "Comparar — UP-Law-AILO" };

export default async function ComparePage() {
  const analyses = await loadAllLicenseAnalyses();
  const units = buildComparisonUnits(analyses);
  const presets = buildComparisonPresets(units).map((p) =>
    // Para presets de escenario, resolvemos la selección sugerida con el motor existente.
    p.kind === "scenario" && p.scenarioId
      ? { ...p, unitIds: getScenarioComparison(p.scenarioId, units, analyses) }
      : p,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-4">
      <header>
        <h1 className="font-serif text-2xl font-bold text-slate-900">Comparar</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          ¿Qué cambia entre estas herramientas o modalidades? Elegí una comparación y leé sus condiciones por
          eje jurídico, con la evidencia documental a un clic.
        </p>
      </header>

      <ComparisonExplorer units={units} presets={presets} />
    </div>
  );
}
