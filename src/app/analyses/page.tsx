import Link from "next/link";
import { loadAllLicenseAnalyses } from "@/lib/storage";
import { latestAnalyses } from "@/domain/versions";
import type { LicenseAnalysis } from "@/lib/schema";
import { compareProviders } from "@/lib/derive";
import { MODE_LABELS } from "@/lib/contractingModes";
import { COMPARISON_GROUP_LABEL } from "@/lib/analysisMeta";
import { PageContainer } from "@/components/PageContainer";

export const metadata = { title: "Corpus documental — UP-Law-AILO" };

const GROUP_ORDER = ["ai", "traditional_software", "social_platform", "mobile_ecosystem"];

interface ProductNode {
  productName: string;
  documents: LicenseAnalysis[];
}
interface ProviderNode {
  providerName: string;
  products: ProductNode[];
}

function buildHierarchy(analyses: LicenseAnalysis[]) {
  const groups = new Map<string, Map<string, Map<string, LicenseAnalysis[]>>>();
  for (const a of analyses) {
    const g = groups.get(a.comparisonGroup) ?? new Map();
    groups.set(a.comparisonGroup, g);
    const p = g.get(a.providerName) ?? new Map();
    g.set(a.providerName, p);
    const docs = p.get(a.productName) ?? [];
    p.set(a.productName, docs);
    docs.push(a);
  }
  return [...groups.entries()]
    .sort((a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]))
    .map(([group, provs]) => ({
      group,
      providers: [...provs.entries()]
        .sort((a, b) => compareProviders(a[0], b[0]))
        .map<ProviderNode>(([providerName, prods]) => ({
          providerName,
          products: [...prods.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map<ProductNode>(([productName, documents]) => ({ productName, documents })),
        })),
    }));
}

export default async function CorpusPage() {
  const analyses = latestAnalyses(await loadAllLicenseAnalyses());
  const hierarchy = buildHierarchy(analyses);

  return (
    <PageContainer className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl font-bold text-slate-900">Corpus documental</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Documentos públicos utilizados para la lectura jurídica del observatorio, organizados por grupo,
          proveedor, producto y documento. Abrí cada nivel para navegar; cada documento enlaza a su dossier.
        </p>
      </header>

      <div className="space-y-3">
        {hierarchy.map((g) => (
          <details key={g.group} open className="rounded-md border border-slate-200 bg-white">
            <summary className="cursor-pointer px-4 py-2.5 font-serif text-base font-semibold text-slate-900">
              {COMPARISON_GROUP_LABEL[g.group] ?? g.group}
            </summary>
            <div className="border-t border-slate-100 px-2 pb-2">
              {g.providers.map((prov) => (
                <details key={prov.providerName} className="border-b border-slate-100 last:border-0">
                  <summary className="cursor-pointer px-2 py-2 text-sm font-medium text-slate-800">
                    {prov.providerName}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {prov.products.reduce((n, p) => n + p.documents.length, 0)} doc.
                    </span>
                  </summary>
                  <div className="pl-3">
                    {prov.products.map((prod) => (
                      <div key={prod.productName} className="py-1">
                        <div className="px-2 text-xs uppercase tracking-wide text-slate-400">{prod.productName}</div>
                        <ul>
                          {prod.documents
                            .slice()
                            .sort((a, b) => a.documentType.localeCompare(b.documentType))
                            .map((d) => (
                              <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2 px-2 py-1.5 text-sm">
                                <span className="text-slate-700">
                                  {d.documentType}
                                  <span className="ml-2 text-xs text-slate-400">
                                    {MODE_LABELS[d.contractingMode]} · {(d.metadata.retrievedAt ?? d.retrievedAt).slice(0, 10)}
                                  </span>
                                </span>
                                <Link href={`/analysis/${d.id}`} className="whitespace-nowrap text-xs text-sky-700 hover:underline">
                                  Abrir dossier →
                                </Link>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        El corpus incluye IA y software cotidiano usado por abogados (correo, productividad, redes sociales y
        ecosistemas móviles) como corpus de referencia. Documentos públicos; no constituye asesoramiento legal.
      </p>
    </PageContainer>
  );
}
