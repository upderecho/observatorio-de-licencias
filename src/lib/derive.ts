/**
 * Derivaciones puras para la UI (sin tocar parser ni ingesta).
 *
 * Expone mejor datos YA existentes: métricas del panel, fundamento de riesgo
 * (a partir de las categorías realmente detectadas), filtros de tabla y
 * agrupación por proveedor. Sin fs, sin estado: testeable directamente.
 */

import type { LicenseAnalysis } from "./schema";
import type { ContractingMode } from "./contractingModes";

// --- Métricas del dashboard ---------------------------------------------

export interface DashboardMetrics {
  total: number;
  providers: number;
  realDocs: number;
  mockDocs: number;
  verifiedSources: number;
  pendingSources: number;
  unreviewed: number;
  modesDetected: number;
}

export function computeMetrics(
  analyses: LicenseAnalysis[],
  registrySourceStatuses: string[] = [],
): DashboardMetrics {
  const mock = analyses.filter((a) => a.metadata.isMock).length;
  return {
    total: analyses.length,
    providers: new Set(analyses.map((a) => a.providerName)).size,
    realDocs: analyses.length - mock,
    mockDocs: mock,
    verifiedSources: analyses.filter((a) => a.metadata.sourceVerified).length,
    pendingSources: registrySourceStatuses.filter((s) => s !== "verified").length,
    unreviewed: analyses.filter((a) => a.metadata.reviewStatus === "unreviewed").length,
    modesDetected: new Set(analyses.map((a) => a.contractingMode)).size,
  };
}

// --- Fundamento de riesgo (derivado de categorías reales) ---------------

export interface RiskDriver {
  key: string;
  label: string;
}

/**
 * Categorías que efectivamente elevan el riesgo de ESTE documento: las
 * `found` de riesgo alto; si no hay, las de riesgo medio. Nunca inventa: el
 * resultado es siempre un subconjunto de las categorías detectadas.
 */
export function topRiskCategories(a: LicenseAnalysis, labelOf: (key: string) => string): RiskDriver[] {
  const found = Object.entries(a.categories).filter(([, c]) => c.status === "found");
  const highs = found.filter(([, c]) => c.riskLevel === "high");
  const meds = found.filter(([, c]) => c.riskLevel === "medium");
  const chosen = highs.length > 0 ? highs : meds;
  return chosen.map(([key]) => ({ key, label: labelOf(key) }));
}

/** Frase de fundamento del riesgo, atada a las categorías realmente detectadas. */
export function riskRationale(a: LicenseAnalysis, labelOf: (key: string) => string): string {
  const level = a.overall.overallRiskLevel;
  if (level === "unknown") {
    return "El parser no encontró evidencia suficiente o la redacción detectada es ambigua. Requiere revisión manual del documento fuente.";
  }
  const drivers = topRiskCategories(a, labelOf);
  if (drivers.length === 0) {
    return "Se detectaron cláusulas de baja criticidad o principalmente informativas. No se identificaron señales fuertes de transferencia de derechos, limitación severa de remedios o restricciones procesales relevantes.";
  }
  const labels = drivers.map((d) => d.label.toLowerCase());
  return `Se detectaron cláusulas vinculadas a ${labels.join(", ")}. La calificación es preliminar y se apoya en evidencia textual, no en interpretación jurídica.`;
}

// --- Filtros de tabla (predicado puro) ----------------------------------

export interface AnalysisFilterState {
  search: string;
  provider: string;
  modality: string;
  documentType: string;
  risk: string;
  privacy: string;
  source: string; // "" | "verified" | "unverified"
  review: string;
  kind: string; // "" | "real" | "mock"
  comparisonGroup: string; // "" | "ai" | "traditional_software" | "social_platform" | "mobile_ecosystem"
}

export const EMPTY_FILTERS: AnalysisFilterState = {
  search: "",
  provider: "",
  modality: "",
  documentType: "",
  risk: "",
  privacy: "",
  source: "",
  review: "",
  kind: "",
  comparisonGroup: "",
};

export function filterAnalyses(analyses: LicenseAnalysis[], f: AnalysisFilterState): LicenseAnalysis[] {
  const q = f.search.trim().toLowerCase();
  return analyses.filter((a) => {
    if (q) {
      const hay = `${a.providerName} ${a.productName} ${a.documentType}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.provider && a.providerName !== f.provider) return false;
    if (f.modality && a.contractingMode !== f.modality) return false;
    if (f.documentType && a.documentType !== f.documentType) return false;
    if (f.risk && a.overall.overallRiskLevel !== f.risk) return false;
    if (f.privacy && a.privacy.posture !== f.privacy) return false;
    if (f.source === "verified" && !a.metadata.sourceVerified) return false;
    if (f.source === "unverified" && a.metadata.sourceVerified) return false;
    if (f.review && a.metadata.reviewStatus !== f.review) return false;
    if (f.kind === "real" && a.metadata.isMock) return false;
    if (f.kind === "mock" && !a.metadata.isMock) return false;
    if (f.comparisonGroup && a.comparisonGroup !== f.comparisonGroup) return false;
    return true;
  });
}

export function foundCount(a: LicenseAnalysis): number {
  return Object.values(a.categories).filter((c) => c.status === "found").length;
}

// --- Agrupación por proveedor -------------------------------------------

const RISK_RANK: Record<string, number> = { unknown: 0, low: 1, medium: 2, high: 3, critical: 4 };
const POSTURE_RANK: Record<string, number> = { strong: 3, moderate: 2, weak: 1, unknown: 0 };

export interface ProviderSummary {
  providerId: string;
  providerName: string;
  products: string[];
  docCount: number;
  modes: ContractingMode[];
  unreviewed: number;
  worstRisk: string;
  weakestPrivacy: string;
  analyses: LicenseAnalysis[];
}

/**
 * Orden de proveedores: Anthropic, OpenAI y xAI (Grok) siempre primero; el resto
 * alfabético. Comparador reutilizable para listados de proveedores.
 */
const PINNED_PROVIDERS = ["Anthropic", "OpenAI", "xAI"];
export function compareProviders(a: string, b: string): number {
  const ia = PINNED_PROVIDERS.indexOf(a);
  const ib = PINNED_PROVIDERS.indexOf(b);
  const ra = ia === -1 ? PINNED_PROVIDERS.length : ia;
  const rb = ib === -1 ? PINNED_PROVIDERS.length : ib;
  return ra !== rb ? ra - rb : a.localeCompare(b);
}

export function providerKey(a: LicenseAnalysis): string {
  return a.metadata.providerId ?? a.providerName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function providerSummaries(analyses: LicenseAnalysis[]): ProviderSummary[] {
  const groups = new Map<string, LicenseAnalysis[]>();
  for (const a of analyses) {
    const k = providerKey(a);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(a);
  }
  const out: ProviderSummary[] = [];
  for (const [providerId, docs] of groups) {
    const modes = new Set<ContractingMode>();
    for (const d of docs) {
      modes.add(d.contractingMode);
      for (const m of d.appliesToModes) modes.add(m);
    }
    let worstRisk = "unknown";
    let weakestPrivacy = "unknown";
    for (const d of docs) {
      if ((RISK_RANK[d.overall.overallRiskLevel] ?? 0) > (RISK_RANK[worstRisk] ?? 0)) worstRisk = d.overall.overallRiskLevel;
      if ((POSTURE_RANK[d.privacy.posture] ?? 0) > (POSTURE_RANK[weakestPrivacy] ?? -1)) {
        // "más débil" = menor rank; arrancamos buscando el de menor protección
      }
    }
    // privacidad más débil = menor rank entre las posturas presentes
    weakestPrivacy = docs
      .map((d) => d.privacy.posture)
      .reduce((acc, p) => ((POSTURE_RANK[p] ?? 0) < (POSTURE_RANK[acc] ?? 0) ? p : acc), docs[0].privacy.posture);

    out.push({
      providerId,
      providerName: docs[0].providerName,
      products: Array.from(new Set(docs.map((d) => d.productName))).sort(),
      docCount: docs.length,
      modes: Array.from(modes),
      unreviewed: docs.filter((d) => d.metadata.reviewStatus === "unreviewed").length,
      worstRisk,
      weakestPrivacy,
      analyses: docs.sort((a, b) => a.documentType.localeCompare(b.documentType)),
    });
  }
  return out.sort((a, b) => compareProviders(a.providerName, b.providerName));
}
