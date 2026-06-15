import Link from "next/link";
import { loadAllLicenseAnalyses } from "@/lib/storage";
import { computeMetrics } from "@/lib/derive";
import { HOME_SCENARIO_CARDS } from "@/domain/legalUseScenarios";
import { SCENARIO_ICON, CardIcon } from "@/components/icons";
import { PageContainer } from "@/components/PageContainer";

const SECONDARY_LINKS: { href: string; label: string }[] = [
  { href: "/analyses", label: "Corpus documental" },
  { href: "/providers", label: "Proveedores" },
  { href: "/criteria", label: "Criterio de lectura" },
  { href: "/acerca", label: "Acerca del proyecto" },
];

export default async function HomePage() {
  const analyses = await loadAllLicenseAnalyses();
  const m = computeMetrics(analyses);

  return (
    <PageContainer className="space-y-10">
      {/* Hero */}
      <header className="space-y-3">
        <h1 className="font-serif text-3xl font-bold text-slate-900">UP-Law-AILO</h1>
        <p className="text-base leading-relaxed text-slate-600">
          Observatorio jurídico-académico para leer y auditar condiciones legales de herramientas de IA y
          software cotidiano.
        </p>
        <h2 className="pt-2 font-serif text-xl font-semibold text-slate-900">¿Qué necesitás leer?</h2>
      </header>

      {/* Escenarios → guías de lectura */}
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
                  Abrir guía de lectura <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-3">
          <Link href="/escenarios" className="text-sm text-sky-700 hover:underline">Ver otros escenarios →</Link>
        </div>
      </section>

      {/* Corpus documental (acceso secundario) */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Ir al corpus documental</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Explorá los documentos fuente organizados por grupo, proveedor, producto y modalidad. Incluye IA y
          software cotidiano usado por abogados como corpus de referencia.
        </p>
        <Link href="/analyses" className="mt-2 inline-block text-sm font-medium text-sky-700 hover:underline">
          Abrir corpus documental →
        </Link>
      </section>

      {/* Propósito académico */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Propósito académico</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          UP-Law-AILO busca fortalecer el vínculo entre derecho y software. Organiza documentos públicos
          —términos de uso, políticas de privacidad, políticas de producto y condiciones contractuales— para
          facilitar lectura jurídica, trazabilidad y discusión académica. No constituye asesoramiento legal.
          {" "}
          <Link href="/acerca" className="text-sky-700 hover:underline">Acerca del proyecto →</Link>
        </p>
      </section>

      {/* Accesos secundarios */}
      <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
        {SECONDARY_LINKS.map((l, i) => (
          <span key={l.href} className="flex items-center gap-4">
            {i > 0 && <span className="text-slate-300">·</span>}
            <Link href={l.href} className="hover:text-slate-800 hover:underline">{l.label}</Link>
          </span>
        ))}
      </nav>

      {/* Cobertura (una línea, secundaria) */}
      <p className="border-t border-slate-200 pt-4 text-sm text-slate-500">
        Corpus actual: {m.providers} proveedores · {m.total} documentos · IA y software cotidiano · fuentes públicas
      </p>
    </PageContainer>
  );
}
