import Link from "next/link";
import { loadAllLicenseAnalyses } from "@/lib/storage";
import { loadRegistry } from "@/lib/sources";
import { PageContainer } from "@/components/PageContainer";
import { buildStateOfArt, type RegistryRegionSummary } from "@/domain/stateOfArt";
import { providerRegionLabel } from "@/domain/taxonomies/providerRegions";
import { isNonCommercialProject } from "@/domain/taxonomies/providerTypes";
import { StateOfArtReading } from "@/components/StateOfArtReading";
import { EscenariosGate } from "@/components/featureGates";
import { providerSummaries } from "@/lib/derive";
import { latestAnalyses } from "@/domain/versions";
import { riskWord } from "@/components/indicators";
import { MODE_LABELS } from "@/lib/contractingModes";
import type { RiskLevel } from "@/lib/types";
import { LegalDisclaimer } from "@/components/Disclaimer";

// Punto de color (refuerzo, no semántica) para el riesgo peor del proveedor.
const RISK_DOT: Record<RiskLevel, string> = {
  low: "text-emerald-600",
  medium: "text-amber-600",
  high: "text-red-600",
  unknown: "text-slate-400",
};

// Accesos secundarios de soporte de lectura: escenarios, corpus, criterio.
const ACCESS_LINKS: { href: string; label: string; desc: string; gated?: boolean }[] = [
  { href: "/escenarios", label: "Escenarios", desc: "Recorridos de lectura por tipo de uso", gated: true },
  { href: "/analyses", label: "Corpus documental", desc: "Todos los documentos analizados" },
  { href: "/providers", label: "Proveedores", desc: "Expedientes por proveedor y modalidad" },
  { href: "/criteria", label: "Criterio de lectura", desc: "Cómo se interpreta cada señal" },
];

export default async function HomePage() {
  // Solo la captura más reciente de cada documento (la app muestra la actual).
  const analyses = latestAnalyses(await loadAllLicenseAnalyses());

  // Resumen regional del registro para la nota del Estado del arte (no depende
  // del parser ni de los análisis; describe la composición del registro).
  let registrySummary: RegistryRegionSummary | undefined;
  try {
    const reg = await loadRegistry();
    const nonUsChina = reg.providers.filter((p) => !["north_america", "asia"].includes(p.providerRegion));
    registrySummary = {
      totalProviders: reg.providers.length,
      nonUsChinaProviders: nonUsChina.length,
      nonCommercialProjects: reg.providers.filter((p) => isNonCommercialProject(p.providerType)).length,
      regionsNonUsChina: Array.from(new Set(nonUsChina.map((p) => providerRegionLabel(p.providerRegion)))).sort(),
    };
  } catch {
    registrySummary = undefined;
  }

  const state = buildStateOfArt(analyses, registrySummary);

  // Índice de proveedores (sección principal): una tarjeta por proveedor que
  // enlaza a su página, donde vive el etiquetado frontal. Orden de proveedores
  // desde la derivación pura (derive.ts).
  const providers = providerSummaries(analyses);

  return (
    <PageContainer className="space-y-10">
      {/* 1 · Título del proyecto · 2 · Bajada académica breve */}
      <header className="max-w-3xl space-y-2">
        <h1 className="font-serif text-3xl font-bold text-slate-900">UP-Law-AILO</h1>
        <p className="text-base leading-relaxed text-slate-600">
          Observatorio jurídico-académico que lee y audita, con criterio jurídico y trazabilidad textual, las condiciones
          legales de herramientas de IA y de software cotidiano.
        </p>
      </header>

      {/* SECCIÓN PRINCIPAL · Índice de proveedores */}
      <section id="proveedores" aria-labelledby="proveedores-title" className="space-y-5 scroll-mt-24">
        <div className="max-w-2xl space-y-1">
          <h2 id="proveedores-title" className="font-serif text-2xl font-semibold text-slate-900">
            Proveedores
          </h2>
          <p className="text-sm text-slate-500">
            Elegí un proveedor para ver su etiquetado frontal: advertencias (octógonos), cautelas y la tabla nutricional
            del clausulado, por producto y modalidad. No es un ranking.
          </p>
        </div>

        <p className="max-w-3xl text-xs leading-snug text-slate-400">
          Corpus firmado <code className="text-slate-500">sha256:{state.shortHash}</code> ({state.documentCount}{" "}
          documentos, {state.providerCount} proveedores). Si el corpus cambia, la lectura se recalcula.
        </p>
        <LegalDisclaimer />

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <li key={p.providerId}>
              <Link
                href={`/providers/${p.providerId}`}
                className="flex h-full flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50"
              >
                <div>
                  <h3 className="font-serif text-lg font-semibold text-slate-900">{p.providerName}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {p.products.length} producto{p.products.length !== 1 ? "s" : ""} · {p.docCount} documento
                    {p.docCount !== 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Modalidades: {p.modes.map((m) => MODE_LABELS[m]).join(", ")}
                  </p>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <span className="text-xs text-slate-600">
                    <span className={RISK_DOT[p.worstRisk as RiskLevel] ?? "text-slate-400"} aria-hidden>●</span> riesgo{" "}
                    {riskWord(p.worstRisk as RiskLevel)}
                    {p.unreviewed > 0 && <span className="text-slate-400"> · {p.unreviewed} sin revisar</span>}
                  </span>
                  <span className="text-sm text-sky-700">ver etiquetado →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* SECUNDARIO · Estado del arte (lectura jurídica preliminar) */}
      <section id="estado-del-arte" className="border-t border-slate-200 pt-8 scroll-mt-24">
        <h2 className="font-serif text-2xl font-semibold text-slate-900">Estado del arte</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">Lectura jurídica preliminar del corpus.</p>
        <div className="mt-5">
          <StateOfArtReading state={state} />
        </div>
      </section>

      {/* SECUNDARIO · Accesos: soporte de lectura */}
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
