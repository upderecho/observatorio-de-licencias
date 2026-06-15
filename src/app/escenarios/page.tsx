import Link from "next/link";
import {
  EVALUABLE_SCENARIOS,
  ACADEMIC_SCENARIOS,
  LEGAL_USE_SCENARIOS,
  scenarioHref,
  type LegalUseScenario,
} from "@/domain/legalUseScenarios";
import { SCENARIO_ICON, CardIcon } from "@/components/icons";

export const metadata = { title: "Escenarios de uso — UP-Law-AILO" };

const NAV_SCENARIOS = LEGAL_USE_SCENARIOS.filter((s) => s.kind === "navigation");

function Card({ s }: { s: LegalUseScenario }) {
  const action = s.kind === "evaluable" ? "Evaluar escenario" : s.kind === "academic" ? "Abrir comparación" : "Abrir";
  const Icon = SCENARIO_ICON[s.id];
  return (
    <Link
      href={scenarioHref(s)}
      className="group flex gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      {Icon && <CardIcon icon={Icon} />}
      <div>
        <h3 className="font-medium text-slate-900">{s.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.short}</p>
        <span className="mt-3 inline-block text-sm font-medium text-sky-700">
          {action} <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  );
}

export default function ScenariosIndexPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      <header className="space-y-1">
        <Link href="/" className="text-sm text-sky-700 hover:underline">← Inicio</Link>
        <h1 className="font-serif text-2xl font-bold text-slate-900">Escenarios de uso</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Los escenarios de uso jurídico orientan la decisión práctica. Las comparaciones académicas
          permiten estudiar la IA frente al software tradicional.
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Escenarios de uso jurídico</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EVALUABLE_SCENARIOS.map((s) => <Card key={s.id} s={s} />)}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Comparaciones académicas</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACADEMIC_SCENARIOS.map((s) => <Card key={s.id} s={s} />)}
          {NAV_SCENARIOS.map((s) => <Card key={s.id} s={s} />)}
        </div>
      </section>

      <p className="text-sm leading-relaxed text-slate-500">
        UP-Law-AILO ofrece orientación preliminar basada en documentos públicos y evidencia textual. No
        constituye asesoramiento legal.
      </p>
    </div>
  );
}
