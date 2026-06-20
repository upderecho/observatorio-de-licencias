import { loadAllLicenseAnalyses } from "@/lib/storage";
import { latestAnalyses } from "@/domain/versions";
import { providerSummaries, providerKey } from "@/lib/derive";
import { loadRegistry } from "@/lib/sources";
import { loadAllLegalBundles } from "@/lib/coverage";
import { COMPARISON_GROUP_LABEL, SOFTWARE_CATEGORY_LABEL } from "@/lib/analysisMeta";
import { ProviderOverview } from "@/components/ProviderOverview";
import { RegionalProviders, type RegionalRow } from "@/components/RegionalProviders";
import { PageContainer } from "@/components/PageContainer";
import { LegalBundlePanel } from "@/components/LegalBundlePanel";

export const metadata = { title: "Proveedores — UP-Law-AILO" };

interface RefProduct {
  provider: string;
  product: string;
  category: string;
  docCount: number;
  ingested: boolean;
}

export default async function ProvidersPage() {
  const analyses = latestAnalyses(await loadAllLicenseAnalyses());
  const summaries = providerSummaries(analyses);

  // Mapa providerName -> route id del expediente (solo proveedores con análisis).
  const routeByName = new Map<string, string>();
  for (const a of analyses) routeByName.set(a.providerName, providerKey(a));

  // Software de referencia (no IA) desde el registro, agrupado por grupo comparativo.
  const ingestedIds = new Set(analyses.map((a) => a.metadata.productId).filter(Boolean));
  const refByGroup = new Map<string, RefProduct[]>();
  let regionalRows: RegionalRow[] = [];
  try {
    const reg = await loadRegistry();
    for (const prov of reg.providers) {
      for (const prod of prov.products) {
        if (prod.comparisonGroup === "ai") continue;
        const list = refByGroup.get(prod.comparisonGroup) ?? [];
        list.push({
          provider: prov.providerName,
          product: prod.productName,
          category: prod.softwareCategory,
          docCount: prod.documents.length,
          ingested: ingestedIds.has(prod.productId),
        });
        refByGroup.set(prod.comparisonGroup, list);
      }
    }
    // Directorio por región: una fila por proveedor/proyecto del registro.
    regionalRows = reg.providers.map((prov): RegionalRow => {
      const firstSourceUrl = prov.products
        .flatMap((p) => p.documents)
        .map((d) => d.sourceUrl)
        .find((u): u is string => !!u);
      return {
        providerId: prov.providerId,
        providerName: prov.providerName,
        region: prov.providerRegion,
        type: prov.providerType,
        products: prov.products.map((p) => ({ productName: p.productName, niche: p.productNiche })),
        dossierId: routeByName.get(prov.providerName) ?? null,
        officialUrl: firstSourceUrl ?? (prov.officialDomains[0] ? `https://${prov.officialDomains[0]}` : null),
        needsReview: prov.metadata.needsManualSourceReview === true,
      };
    });
  } catch {
    /* sin registro */
  }
  const refGroups = [...refByGroup.entries()];
  const bundles = await loadAllLegalBundles();

  return (
    <PageContainer className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Proveedores</h1>
        <p className="text-sm text-slate-600">
          Proveedores de IA con análisis cargados, y software tradicional incorporado como punto de
          comparación académico. Entrá a cada proveedor de IA para ver su expediente por modalidad.
        </p>
      </header>

      {regionalRows.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proveedores y proyectos por región</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            Para cada herramienta: qué tipo es, qué hace en lenguaje claro y qué debería mirar un abogado. Se indica
            además la región y si es un proveedor comercial o un proyecto académico/soberano —no todos se ofrecen bajo
            la misma lógica contractual, y algunos pueden no tener ToS o Privacy equivalentes—.
          </p>
          <RegionalProviders rows={regionalRows} />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proveedores de IA (con análisis)</h2>
        {summaries.length === 0 ? (
          <p className="text-sm text-slate-500">No hay proveedores cargados.</p>
        ) : (
          <ProviderOverview summaries={summaries} />
        )}
      </section>

      {refGroups.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Software de referencia (comparación académica)
          </h2>
          {refGroups.map(([groupKey, items]) => (
            <div key={groupKey}>
              <h3 className="mb-1 text-sm font-medium text-slate-800">{COMPARISON_GROUP_LABEL[groupKey] ?? groupKey}</h3>
              <div className="overflow-hidden rounded border border-slate-200 bg-white">
                {items.map((it) => (
                  <div key={`${it.provider}-${it.product}`} className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-2 text-sm last:border-0">
                    <div>
                      <span className="font-medium text-slate-900">{it.provider}</span>
                      <span className="text-slate-500"> · {it.product}</span>
                      <span className="ml-2 text-xs text-slate-400">{SOFTWARE_CATEGORY_LABEL[it.category] ?? it.category}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {it.ingested ? `${it.docCount} doc.` : `${it.docCount} doc. · pendiente de ingesta`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs leading-relaxed text-slate-500">
            El software tradicional se registra con sus fuentes oficiales y queda pendiente de verificación e
            ingesta (no se infiere su contenido). Sirve para distinguir qué riesgos son propios de la IA.
          </p>
        </section>
      )}

      {bundles.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Paquetes jurídicos</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            Algunos productos no se rigen por un único documento. Gmail, por ejemplo, no se presenta como un
            ToS independiente: su paquete jurídico combina documentos base de Google (referenciados),
            políticas específicas de Gmail y posibles términos de Workspace según modalidad. Las condiciones de
            una modalidad no se trasladan a otra.
          </p>
          <div className="space-y-3">
            {bundles.map((b) => (
              <LegalBundlePanel key={b.bundleId} bundle={b} />
            ))}
          </div>
        </section>
      )}
    </PageContainer>
  );
}
