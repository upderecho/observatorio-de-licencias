import Link from "next/link";
import type { LicenseAnalysis } from "@/lib/schema";
import type { ContractingMode } from "@/lib/contractingModes";
import { MODE_LABELS, SOURCE_STATUS_LABELS } from "@/lib/analysisMeta";
import { providerKey } from "@/lib/derive";
import { providerRegionLabel } from "@/domain/taxonomies/providerRegions";
import { providerTypeLabel } from "@/domain/taxonomies/providerTypes";
import { productNicheInfo } from "@/domain/taxonomies/productNiches";
import { RiskCompact, PrivacyCompact, SourceCompact, ReviewCompact } from "./indicators";
import { ProductLabelCard } from "./ProductLabelCard";

const SPECIFIC_MODES: ContractingMode[] = ["free", "paid_individual", "team", "business", "enterprise", "api"];

export interface PendingDoc {
  documentType: string;
  sourceStatus: string;
  sourceUrl: string | null;
}

export interface ProviderTaxonomy {
  region: string;
  type: string;
  niches: string[];
}

/** Expediente de un proveedor, organizado por modalidad de contratación. */
export function ProviderDossier({
  analyses,
  pending,
  context,
  taxonomy,
}: {
  analyses: LicenseAnalysis[];
  pending: PendingDoc[];
  context?: string | null;
  taxonomy?: ProviderTaxonomy | null;
}) {
  const provider = analyses[0]?.providerName ?? "—";
  const providerId = analyses[0] ? providerKey(analyses[0]) : "";
  const products = Array.from(new Set(analyses.map((a) => a.productName))).sort();
  const detected = new Set<ContractingMode>();
  for (const a of analyses) {
    detected.add(a.contractingMode);
    for (const m of a.appliesToModes) detected.add(m);
  }
  const general = analyses.filter((a) => a.contractingMode === "all");

  return (
    <div className="space-y-6">
      <header>
        <Link href="/providers" className="text-sm text-sky-700 hover:underline">← Proveedores</Link>
        <h1 className="mt-1 text-xl font-bold text-slate-900">{provider}</h1>
        {taxonomy && (
          <p className="mt-1 text-sm text-slate-600">
            {providerRegionLabel(taxonomy.region)} · {providerTypeLabel(taxonomy.type)}
          </p>
        )}
        {taxonomy && taxonomy.niches.length > 0 && (
          <div className="mt-3 max-w-3xl space-y-2">
            {taxonomy.niches.map((n) => {
              const info = productNicheInfo(n);
              return (
                <div key={n} className="rounded border border-slate-200 bg-white p-3 text-sm">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tipo de herramienta</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">{info.label}</span>
                  </div>
                  <p className="mt-1 text-slate-700">{info.plainDescription}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-600">Para el abogado:</span> {info.legalReadingHint}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-slate-500">Productos:</dt>
            <dd className="text-slate-800">{products.join(", ") || "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500">Modalidades detectadas:</dt>
            <dd className="text-slate-800">
              {Array.from(detected).filter((m) => m !== "all" && m !== "unknown").map((m) => MODE_LABELS[m]).join(", ") || "Sin modalidades específicas"}
            </dd>
          </div>
        </dl>
      </header>

      {/* Contexto editorial: va debajo de "Tipo de herramienta" y por ENCIMA de
          los sellos; antecede al análisis; fundado en los documentos del corpus. */}
      {context && (
        <section className="max-w-3xl rounded border border-l-4 border-slate-200 border-l-gold-500 bg-white p-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Contexto</h2>
          <p className="text-base leading-relaxed text-slate-700">{context}</p>
          <p className="mt-2 text-xs italic text-slate-400">
            Nota editorial sobre los documentos disponibles en el corpus. No es asesoramiento legal ni una conclusión
            jurídica sobre el proveedor.
          </p>
        </section>
      )}

      {/* Etiquetado frontal: resumen visual por producto × modalidad (octógonos,
          cautelas y tabla nutricional). El detalle jurídico/fuentes queda debajo. */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Etiquetado frontal</h2>
          <p className="text-sm text-slate-500">Por producto y modalidad. Deriva del corpus y remite a evidencia textual. No es un ranking.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {products.map((productName) => (
            <ProductLabelCard
              key={productName}
              providerId={providerId}
              productName={productName}
              analyses={analyses.filter((a) => a.productName === productName)}
              showProviderLink={false}
            />
          ))}
        </div>
      </section>

      {/* General */}
      <ModeSection
        label="Aplicación general"
        docs={general}
        note="Documento de aplicación general. La fuente no distingue claramente por modalidad."
        emptyNote="No se cargaron documentos de aplicación general para este proveedor."
      />

      {/* Específicas */}
      {SPECIFIC_MODES.map((mode) => {
        const specific = analyses.filter((a) => a.contractingMode === mode);
        const generalCovers = general.some((a) => a.appliesToModes.includes(mode));
        const note =
          specific.length > 0
            ? `Existe documento específico para la modalidad ${MODE_LABELS[mode].toLowerCase()}.`
            : generalCovers
              ? "No hay documento específico: aplican las condiciones generales. La fuente no distingue claramente esta modalidad."
              : "No se encontró documento específico para esta modalidad. Puede aplicar un documento general o requerir revisión manual.";
        return <ModeSection key={mode} label={MODE_LABELS[mode]} docs={specific} note={note} emptyNote={note} />;
      })}

      {/* Pendientes / no disponibles */}
      {pending.length > 0 && (
        <section className="border-t-2 border-slate-200 pt-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Documentos pendientes / no disponibles</h2>
          <ul className="space-y-1 text-sm">
            {pending.map((p, i) => (
              <li key={i} className="flex flex-wrap gap-x-2 text-slate-700">
                <span className="font-medium text-slate-900">{p.documentType}</span>
                <span className="text-slate-500">— fuente: {SOURCE_STATUS_LABELS[p.sourceStatus] ?? p.sourceStatus}</span>
                {p.sourceUrl && (
                  <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-xs text-sky-700 underline">
                    {p.sourceUrl}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ModeSection({
  label,
  docs,
  note,
  emptyNote,
}: {
  label: string;
  docs: LicenseAnalysis[];
  note: string;
  emptyNote: string;
}) {
  return (
    <section className="border-t-2 border-slate-200 pt-3">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">{label}</h2>
      <p className="mb-2 text-xs italic text-slate-500">{docs.length > 0 ? note : emptyNote}</p>
      {docs.length > 0 && (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 font-medium">Documento</th>
                <th className="px-3 py-2 font-medium">Privacidad</th>
                <th className="px-3 py-2 font-medium">Riesgo contractual</th>
                <th className="px-3 py-2 font-medium">Fuente</th>
                <th className="px-3 py-2 font-medium">Revisión</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-3 py-2 font-medium text-slate-900">{a.documentType}</td>
                  <td className="px-3 py-2"><PrivacyCompact analysis={a} /></td>
                  <td className="px-3 py-2"><RiskCompact analysis={a} /></td>
                  <td className="px-3 py-2"><SourceCompact analysis={a} /></td>
                  <td className="px-3 py-2"><ReviewCompact analysis={a} /></td>
                  <td className="px-3 py-2 whitespace-nowrap"><Link href={`/analysis/${a.id}`} className="text-sky-700 hover:underline">Dossier →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
