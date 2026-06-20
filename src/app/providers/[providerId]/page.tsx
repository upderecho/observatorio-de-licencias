import { notFound } from "next/navigation";
import { loadAllLicenseAnalyses } from "@/lib/storage";
import { loadRegistry, flattenDocuments } from "@/lib/sources";
import { providerKey } from "@/lib/derive";
import { latestAnalyses } from "@/domain/versions";
import { availableProviderLogos, resolveLogoSrc } from "@/lib/providerLogos";
import { getProviderContext } from "@/domain/providerContext";
import { PageContainer } from "@/components/PageContainer";
import { ProviderDossier, type PendingDoc, type ProviderTaxonomy } from "@/components/ProviderDossier";

// Pre-genera una página por cada proveedor con análisis (export estático).
export async function generateStaticParams() {
  const all = await loadAllLicenseAnalyses();
  const ids = Array.from(new Set(all.map((a) => providerKey(a))));
  return ids.map((providerId) => ({ providerId }));
}

export default async function ProviderPage({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  const all = await loadAllLicenseAnalyses();
  // Mostrar solo la captura más reciente de cada documento del proveedor.
  const analyses = latestAnalyses(all).filter((a) => providerKey(a) === providerId);
  if (analyses.length === 0) notFound();

  // Documentos pendientes / no disponibles + taxonomía (región/tipo/nicho) del registro.
  let pending: PendingDoc[] = [];
  let taxonomy: ProviderTaxonomy | null = null;
  let registryLogoPath: string | undefined;
  try {
    const reg = await loadRegistry();
    pending = flattenDocuments(reg, providerId)
      .filter((d) => d.document.sourceStatus !== "verified")
      .map((d) => ({
        documentType: d.document.documentType,
        sourceStatus: d.document.sourceStatus,
        sourceUrl: d.document.sourceUrl,
      }));
    const regProv = reg.providers.find((p) => p.providerName === analyses[0].providerName);
    if (regProv) {
      registryLogoPath = regProv.logoPath;
      taxonomy = {
        region: regProv.providerRegion,
        type: regProv.providerType,
        niches: Array.from(new Set(regProv.products.map((p) => p.productNiche))),
      };
    }
  } catch {
    pending = [];
  }

  const logoSrc = resolveLogoSrc(providerId, await availableProviderLogos(), registryLogoPath);

  return (
    <PageContainer>
      <ProviderDossier
        analyses={analyses}
        pending={pending}
        context={getProviderContext(providerId)}
        taxonomy={taxonomy}
        logoSrc={logoSrc}
      />
    </PageContainer>
  );
}
