import Link from "next/link";
import { loadAllLicenseAnalyses } from "@/lib/storage";
import { PageContainer } from "@/components/PageContainer";
import { buildStateOfArt } from "@/domain/stateOfArt";
import { StateOfArtReading } from "@/components/StateOfArtReading";
import { EscenariosGate } from "@/components/featureGates";

// El Estado del arte es la pieza central de la home. Estos accesos son soporte
// de lectura, no el eje: escenarios (recorridos), corpus, proveedores, criterio.
const ACCESS_LINKS: { href: string; label: string; desc: string; gated?: boolean }[] = [
  { href: "/escenarios", label: "Escenarios", desc: "Recorridos de lectura por tipo de uso", gated: true },
  { href: "/analyses", label: "Corpus documental", desc: "Todos los documentos analizados" },
  { href: "/providers", label: "Proveedores", desc: "Expedientes por proveedor y modalidad" },
  { href: "/criteria", label: "Criterio de lectura", desc: "Cómo se interpreta cada señal" },
];

export default async function HomePage() {
  const analyses = await loadAllLicenseAnalyses();
  const state = buildStateOfArt(analyses);

  return (
    <PageContainer className="space-y-8">
      {/* 1 · Título del proyecto · 2 · Bajada académica breve */}
      <header className="max-w-3xl space-y-2">
        <h1 className="font-serif text-3xl font-bold text-slate-900">UP-Law-AILO</h1>
        <p className="text-base leading-relaxed text-slate-600">
          Observatorio jurídico-académico que lee y audita, con criterio jurídico y trazabilidad textual, las condiciones
          legales de herramientas de IA y de software cotidiano.
        </p>
      </header>

      {/* 3 · Firma del corpus · 4 · Estado del arte (pieza central del sistema) */}
      <section id="estado-del-arte" className="scroll-mt-24">
        <p className="max-w-3xl text-xs leading-snug text-slate-400">
          Esta lectura se basa en el corpus firmado{" "}
          <code className="text-slate-500">sha256:{state.shortHash}</code>, compuesto por {state.documentCount} documentos
          y {state.providerCount} proveedores. Si el corpus cambia, la lectura debe recalcularse.
        </p>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-slate-900">Estado del arte</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">Lectura jurídica preliminar del corpus.</p>
        <div className="mt-5">
          <StateOfArtReading state={state} />
        </div>
      </section>

      {/* 5 · Accesos secundarios: soporte de lectura */}
      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Soporte de lectura</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ACCESS_LINKS.map((l) => {
            const item = (
              <Link
                href={l.href}
                className="flex h-full items-baseline justify-between gap-3 rounded border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
              >
                <span>
                  <span className="font-medium text-slate-900">{l.label}</span>
                  <span className="block text-sm text-slate-500">{l.desc}</span>
                </span>
                <span className="text-sky-700">→</span>
              </Link>
            );
            return l.gated ? (
              <EscenariosGate key={l.href}>{item}</EscenariosGate>
            ) : (
              <div key={l.href}>{item}</div>
            );
          })}
        </div>
      </section>
    </PageContainer>
  );
}
