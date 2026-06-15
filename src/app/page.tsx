import Link from "next/link";
import { loadAllLicenseAnalyses } from "@/lib/storage";
import { computeMetrics } from "@/lib/derive";
import { HOME_SCENARIO_CARDS } from "@/domain/legalUseScenarios";
import { SCENARIO_ICON, ACADEMIC_ICON, CardIcon } from "@/components/icons";

const SECONDARY_LINKS: { href: string; label: string }[] = [
  { href: "/analyses", label: "Evidencia documental" },
  { href: "/providers", label: "Proveedores" },
  { href: "/compare", label: "Matriz comparativa" },
  { href: "/differences", label: "Diferencias por modalidad" },
  { href: "/criteria", label: "Criterio" },
];

// Capa 2: comparaciones académicas (software tradicional como punto de comparación).
const ACADEMIC_CARDS: { href: string; title: string }[] = [
  { href: "/compare", title: "IA vs software tradicional" },
  { href: "/providers", title: "Software cotidiano del abogado" },
  { href: "/providers", title: "Correo, productividad y redes sociales" },
  { href: "/providers", title: "Ecosistemas móviles: Android y Apple" },
];

export default async function HomePage() {
  const analyses = await loadAllLicenseAnalyses();
  const m = computeMetrics(analyses);

  return (
    <div className="mx-auto max-w-4xl space-y-10 py-4">
      {/* A. Hero */}
      <header className="space-y-3">
        <h1 className="font-serif text-3xl font-bold text-slate-900">UP-Law-AILO</h1>
        <p className="text-base leading-relaxed text-slate-600">
          Observatorio jurídico-académico para comparar condiciones de uso, privacidad y riesgos
          contractuales de herramientas de IA y software cotidiano.
        </p>
        <h2 className="pt-2 font-serif text-xl font-semibold text-slate-900">¿Qué uso querés evaluar?</h2>
      </header>

      {/* B. Escenarios de uso jurídico (capa principal) */}
      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {HOME_SCENARIO_CARDS.map((s) => (
            <Link
              key={s.id}
              href={`/escenarios/${s.id}`}
              className="group flex gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {SCENARIO_ICON[s.id] && <CardIcon icon={SCENARIO_ICON[s.id]} />}
              <div>
                <h3 className="font-medium text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.short}</p>
                <span className="mt-3 inline-block text-sm font-medium text-sky-700">
                  Evaluar escenario <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-3">
          <Link href="/escenarios" className="text-sm text-sky-700 hover:underline">Ver otros escenarios →</Link>
        </div>
      </section>

      {/* C. Comparaciones académicas (capa secundaria, visualmente subordinada) */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Comparaciones académicas</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Además de proveedores de IA, el observatorio incorpora software tradicional usado por abogados
          —correo, productividad, redes sociales y ecosistemas móviles— como punto de comparación. Permite
          distinguir qué riesgos son propios de la IA y cuáles ya existen en el software cotidiano.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ACADEMIC_CARDS.map((c) => {
            const Icon = ACADEMIC_ICON[c.title];
            return (
              <Link
                key={c.title}
                href={c.href}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                {Icon && <Icon className="h-4 w-4 text-slate-400" strokeWidth={1.75} aria-hidden="true" />}
                {c.title}
              </Link>
            );
          })}
        </div>
      </section>

      {/* D. Propósito académico (breve) */}
      <p className="text-sm leading-relaxed text-slate-600">
        Proyecto académico para fortalecer el vínculo entre derecho y software, orientado a abogados y
        estudiantes de derecho en América Latina. <Link href="/acerca" className="text-sky-700 hover:underline">Acerca del proyecto →</Link>
      </p>

      {/* E. Advertencia breve (el disclaimer único vive en el footer del layout) */}

      {/* F. Cobertura actual (una línea) */}
      <p className="border-t border-slate-200 pt-4 text-sm text-slate-500">
        Cobertura actual: {m.providers} proveedores · {m.total} documentos · IA y software tradicional · fuentes públicas
      </p>
    </div>
  );
}
