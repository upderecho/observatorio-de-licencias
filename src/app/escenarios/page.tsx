import Link from "next/link";
import { EVALUABLE_SCENARIOS } from "@/domain/legalUseScenarios";
import { SCENARIO_ICON, CardIcon } from "@/components/icons";
import { PageContainer } from "@/components/PageContainer";
import { EscenariosGate, EscenariosUnavailable } from "@/components/featureGates";

export const metadata = { title: "Escenarios — UP-Law-AILO" };

export default function ScenariosIndexPage() {
  return (
    <EscenariosGate fallback={<EscenariosUnavailable />}>
    <PageContainer className="space-y-6">
      <header className="max-w-3xl space-y-1">
        <Link href="/" className="text-sm text-sky-700 hover:underline">← Inicio</Link>
        <h1 className="font-serif text-3xl font-bold text-slate-900">Escenarios jurídicos</h1>
        <p className="text-base leading-relaxed text-slate-600">
          Cada escenario es una <strong>guía de lectura</strong>: qué documentos leer, qué cláusulas revisar y
          con qué prioridad, según el tipo de información o trabajo profesional.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EVALUABLE_SCENARIOS.map((s) => (
          <Link
            key={s.id}
            href={`/escenarios/${s.id}`}
            className="group flex gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            {SCENARIO_ICON[s.id] && <CardIcon icon={SCENARIO_ICON[s.id]} />}
            <div>
              <h2 className="font-medium text-slate-900">{s.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.short}</p>
              <span className="mt-3 inline-block text-sm font-medium text-sky-700">
                Abrir guía de lectura <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Las guías organizan lectura documental preliminar. No constituyen asesoramiento legal.
      </p>
    </PageContainer>
    </EscenariosGate>
  );
}
