import Link from "next/link";
import { loadAllLicenseAnalyses } from "@/lib/storage";
import { computeMetrics } from "@/lib/derive";
import { HOME_SCENARIO_CARDS } from "@/domain/legalUseScenarios";
import { SCENARIO_ICON, CardIcon } from "@/components/icons";
import { PageContainer } from "@/components/PageContainer";
import { computeCorpusSignature } from "@/domain/corpusSignature";
import { buildStateOfArtOpinion } from "@/domain/stateOfArt";
import { StateOfArtReading } from "@/components/StateOfArtReading";
import { EscenariosGate } from "@/components/featureGates";

const SECONDARY_LINKS: { href: string; label: string }[] = [
  { href: "/analyses", label: "Corpus documental" },
  { href: "/providers", label: "Proveedores" },
  { href: "/criteria", label: "Criterio de lectura" },
  { href: "/acerca", label: "Acerca del proyecto" },
];

export default async function HomePage() {
  const analyses = await loadAllLicenseAnalyses();
  const m = computeMetrics(analyses);
  const sig = computeCorpusSignature(analyses);
  const opinion = buildStateOfArtOpinion(analyses);

  return (
    <PageContainer className="space-y-10">
      {/* Hero */}
      <header className="space-y-3">
        <h1 className="font-serif text-3xl font-bold text-slate-900">UP-Law-AILO</h1>
        <p className="text-base leading-relaxed text-slate-600">
          Observatorio jurídico-académico para leer y auditar condiciones legales de herramientas de IA y
          software cotidiano.
        </p>
      </header>

      {/* Estado del arte: ensayo de cierre, firmado contra el corpus vigente (primer bloque) */}
      <section id="estado-del-arte" className="scroll-mt-24">
        <p className="text-xs leading-snug text-slate-400">
          Firma del corpus: <code className="text-slate-500">sha256:{sig.shortHash}</code> · {sig.documentCount} documentos ·{" "}
          {sig.providerCount} proveedores · actualizado {sig.lastUpdated}. Esta opinión es válida en tanto no exista una
          firma más reciente del corpus; se recalcula con cada actualización de licencias.
        </p>
        <h2 className="mt-1 font-serif text-2xl font-semibold text-slate-900">
          Estado del arte: leer software con criterio jurídico
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
          Lectura objetiva del corpus, derivada de los documentos analizados. No es asesoramiento legal ni una
          conclusión jurídica: identifica, con evidencia y enlaces a los dossiers, qué dice el corpus en su firma actual.
        </p>
        <div className="mt-6">
          <StateOfArtReading opinion={opinion} />
        </div>
      </section>

      {/* Corpus documental */}
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-serif text-xl font-semibold text-slate-900">Corpus documental</h2>
        <p className="mt-1 text-base leading-relaxed text-slate-600">
          Explorá los documentos fuente —términos de uso, políticas de privacidad y de producto— organizados
          por grupo, proveedor, producto y modalidad. Incluye IA y software cotidiano usado por abogados como
          corpus de referencia.
        </p>
        <Link href="/analyses" className="mt-3 inline-block text-sm font-medium text-sky-700 hover:underline">
          Abrir corpus documental →
        </Link>
      </section>

      {/* Escenarios → guías de lectura (detrás de feature flag ?flag=true) */}
      <EscenariosGate>
      <section>
        <h2 className="font-serif text-xl font-semibold text-slate-900">¿Qué necesitás leer?</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      </EscenariosGate>

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
