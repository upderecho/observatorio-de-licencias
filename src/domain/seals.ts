/**
 * Etiquetado frontal del corpus: SELLOS (octógonos de advertencia), LEYENDAS
 * precautorias y TABLA NUTRICIONAL (clausulado), derivados por PRODUCTO ×
 * MODALIDAD.
 *
 * DERIVACIÓN PURA (sin fs, sin red, sin estado). Reglas que NO se negocian:
 *
 *  - SINGLE SOURCE OF TRUTH de severidad: los octógonos son las categorías con
 *    `riskWhenFound:"high"` de `categories.ts` (no se duplica ninguna tabla de
 *    severidad). Las únicas constantes locales son las ETIQUETAS en lenguaje
 *    claro de cada octógono/leyenda, que son presentación, no severidad.
 *  - NO INVENTAR: un sello/celda solo afirma lo que ya está en el JSON. Un sello
 *    nunca se emite sin su `evidence[]`; un `found` sin evidencia (inconsistente)
 *    NO produce sello.
 *  - LAS MODALIDADES NO SE TRASLADAN: la unidad es producto × modalidad. Un
 *    compromiso de un documento enterprise/commercial NO suprime una advertencia
 *    ni puebla una celda positiva de la vista general/free. `octogonosFor`,
 *    `cautelasFor` y `nutritionLabel` filtran ANTES por modalidad aplicable.
 *
 * El parámetro `mode` de estas funciones es la MODALIDAD de contratación (filtro
 * anti-traslado). Cada fila expone el texto claro (`plainConcern`) y el jurídico
 * (`legalConcern`, `legalSummary`); la UI elige cuál mostrar (hoy, lenguaje
 * claro en la tabla, con la evidencia y el resumen jurídico a un clic).
 */

import type { LicenseAnalysis, Evidence, CategoryFinding } from "@/lib/schema";
import type { RiskLevel } from "@/lib/types";
import { CATEGORIES, CATEGORY_BY_KEY, type CategoryConfig } from "@/lib/categories";
import { MODE_LABELS, type ContractingMode } from "@/lib/contractingModes";
import { riskRationale, topRiskCategories, type RiskDriver } from "@/lib/derive";

// --- Catálogo de octógonos (derivado de la severidad del catálogo) ----------

/**
 * EXCEPCIÓN CONSCIENTE a la reducción de chips del proyecto: el resto de la UI
 * reemplazó cápsulas de color por indicadores en texto (ver
 * `src/components/indicators.tsx`). El octógono se mantiene como señal visual
 * fuerte porque está justificado por el DEBER DE INFORMACIÓN: una persona no
 * abogada debe poder detectar de un vistazo las cláusulas más gravosas. El
 * significado, igualmente, vive en el texto, el ícono y el `aria-label`; el
 * color (rojo) solo refuerza.
 *
 * Octógonos = categorías de riesgo alto. Fuente ÚNICA de severidad:
 * `categories.ts` (`riskWhenFound === "high"`); acá no se duplica esa tabla.
 */
export const OCTAGON_CATEGORIES: CategoryConfig[] = CATEGORIES.filter((c) => c.riskWhenFound === "high");

/**
 * Sellos por categoría: `lines` es el texto VISIBLE del octógono (multilínea, en
 * mayúsculas para el grabado); `label` es la etiqueta jurídica usada en
 * `aria-label` y en la expansión. Es presentación (no severidad).
 */
export const OCTAGON_SEALS: Record<string, { lines: string[]; label: string }> = {
  training_use: { lines: ["USA TUS", "DATOS"], label: "Usa tus datos para entrenar" },
  license_grant: { lines: ["LICENCIA", "AMPLIA"], label: "Licencia amplia sobre tu contenido" },
  liability_limitation: { lines: ["NO CUBRE", "DAÑOS"], label: "Limita su responsabilidad" },
  arbitration: { lines: ["ARBITRAJE", "OBLIGATORIO"], label: "Arbitraje / sin acción colectiva" },
  indemnity: { lines: ["TE TRASLADA", "EL RIESGO", "LEGAL"], label: "Te traslada el riesgo legal (indemnidad)" },
  warranties: { lines: ["SIN", "GARANTÍAS"], label: "Sin garantías" },
};

/** Etiqueta jurídica clara de cada octógono (derivada de `OCTAGON_SEALS`). */
export const OCTAGON_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(OCTAGON_SEALS).map(([k, v]) => [k, v.label]),
);

// --- Catálogo de leyendas precautorias (riesgo medio) -----------------------

export interface CautelaDef {
  key: string;
  /** Texto VISIBLE de la cautela (mayúsculas). */
  text: string;
  /** Categorías cuya evidencia respalda la cautela. */
  triggerKeys: string[];
  /** Predicado sobre las categorías de un documento aplicable. */
  test: (cats: LicenseAnalysis["categories"]) => boolean;
}

const isFound = (c?: CategoryFinding) => c?.status === "found";

/**
 * Cautelas de capa 2 (riesgo medio). Cada una se respalda con la evidencia de
 * las categorías `triggerKeys` que estén `found` en el documento aplicable.
 */
export const CAUTELA_DEFS: CautelaDef[] = [
  {
    key: "unilateral_changes",
    text: "PUEDE CAMBIAR LAS REGLAS",
    triggerKeys: ["unilateral_changes"],
    test: (c) => isFound(c.unilateral_changes),
  },
  {
    key: "foreign_law",
    text: "LEY/JURISDICCIÓN EXTRANJERA",
    triggerKeys: ["governing_law", "jurisdiction"],
    test: (c) => isFound(c.governing_law) || isFound(c.jurisdiction),
  },
  {
    key: "retention_unclear_deletion",
    text: "RETENCIÓN INDEFINIDA",
    triggerKeys: ["data_retention"],
    test: (c) => isFound(c.data_retention) && c.data_deletion?.status !== "found",
  },
  {
    key: "plan_differences",
    text: "REGLAS DISTINTAS POR PLAN",
    triggerKeys: ["plan_differences"],
    test: (c) => isFound(c.plan_differences),
  },
];

// --- Tipos de salida --------------------------------------------------------

/** Procedencia de un sello/celda: documento + modalidad + texto + evidencia. */
export interface SealSource {
  analysisId: string;
  documentType: string;
  contractingMode: ContractingMode;
  legalSummary: string;
  evidence: Evidence[];
}

export interface Octagon {
  categoryKey: string;
  /** Texto visible del octógono (multilínea, mayúsculas). */
  lines: string[];
  /** Etiqueta jurídica para a11y y expansión. */
  label: string;
  riskLevel: RiskLevel;
  sources: SealSource[];
  /** Evidencia agregada de las fuentes aplicables. Nunca vacía. */
  evidence: Evidence[];
}

export interface Cautela {
  key: string;
  /** Texto visible de la cautela (mayúsculas). */
  text: string;
  triggerKeys: string[];
  sources: SealSource[];
  /** Evidencia agregada. Nunca vacía. */
  evidence: Evidence[];
}

export interface NutritionRow {
  categoryKey: string;
  label: string;
  status: CategoryFinding["status"];
  riskLevel: RiskLevel;
  /** Texto en lenguaje claro (catálogo). */
  plainConcern: string;
  /** Texto técnico-jurídico (catálogo). */
  legalConcern: string;
  /** Resumen jurídico del hallazgo (vacío si no hay documento aplicable). */
  legalSummary: string;
  evidence: Evidence[];
  source: SealSource | null;
}

/** Lectura de riesgo preliminar del producto × modalidad (prosa + drivers). */
export interface RiskRead {
  level: RiskLevel;
  rationale: string;
  drivers: RiskDriver[];
}

export interface NutritionLabelData {
  providerName: string;
  productName: string;
  mode: ContractingMode;
  modeLabel: string;
  documents: { analysisId: string; documentType: string }[];
  retrievedAt: string | null;
  contentHashShort: string | null;
  reviewStatus: string;
  sourceVerified: boolean;
  /** Lectura de riesgo del documento aplicable de mayor riesgo (o null si no hay). */
  riskRead: RiskRead | null;
  rows: NutritionRow[];
}

// --- Reglas de modalidad ----------------------------------------------------

/**
 * ¿El documento `a` aplica a la modalidad `mode`?
 * - Un documento general (`all`) aplica a cualquier modalidad específica.
 * - La vista general (`mode === "all"`) solo incluye documentos generales: los
 *   mode-specific NO se trasladan a la lectura general.
 */
export function docAppliesToMode(a: LicenseAnalysis, mode: ContractingMode): boolean {
  const modes = new Set<ContractingMode>([a.contractingMode, ...a.appliesToModes]);
  if (modes.has(mode)) return true;
  if (modes.has("all")) return true;
  return false;
}

function applicableDocs(analyses: LicenseAnalysis[], mode: ContractingMode): LicenseAnalysis[] {
  return analyses.filter((a) => docAppliesToMode(a, mode));
}

function toSource(a: LicenseAnalysis, finding: CategoryFinding): SealSource {
  return {
    analysisId: a.id,
    documentType: a.documentType,
    contractingMode: a.contractingMode,
    legalSummary: finding.legalSummary,
    evidence: finding.evidence,
  };
}

// --- Capa 1: octógonos ------------------------------------------------------

export function octogonosFor(analyses: LicenseAnalysis[], mode: ContractingMode): Octagon[] {
  const docs = applicableDocs(analyses, mode);
  const out: Octagon[] = [];
  for (const cat of OCTAGON_CATEGORIES) {
    const sources: SealSource[] = [];
    for (const a of docs) {
      const finding = a.categories[cat.key];
      // Solo enciende con evidencia real: un 'found' sin evidencia es
      // inconsistente y NO produce sello (no se inventa una advertencia).
      if (finding && finding.status === "found" && finding.evidence.length > 0) {
        sources.push(toSource(a, finding));
      }
    }
    if (sources.length === 0) continue;
    const seal = OCTAGON_SEALS[cat.key];
    out.push({
      categoryKey: cat.key,
      lines: seal?.lines ?? [cat.label.toUpperCase()],
      label: seal?.label ?? cat.label,
      riskLevel: cat.riskWhenFound,
      sources,
      evidence: sources.flatMap((s) => s.evidence),
    });
  }
  return out;
}

// --- Capa 2: cautelas precautorias ------------------------------------------

export function cautelasFor(analyses: LicenseAnalysis[], mode: ContractingMode): Cautela[] {
  const docs = applicableDocs(analyses, mode);
  const out: Cautela[] = [];
  for (const def of CAUTELA_DEFS) {
    const sources: SealSource[] = [];
    for (const a of docs) {
      if (!def.test(a.categories)) continue;
      // Evidencia de las categorías disparadoras que estén 'found' con evidencia.
      const evidence = def.triggerKeys
        .map((k) => a.categories[k])
        .filter((c): c is CategoryFinding => !!c && c.status === "found" && c.evidence.length > 0)
        .flatMap((c) => c.evidence);
      if (evidence.length === 0) continue; // nunca una cautela sin evidencia
      const primary = def.triggerKeys.map((k) => a.categories[k]).find((c) => c && c.status === "found");
      sources.push({
        analysisId: a.id,
        documentType: a.documentType,
        contractingMode: a.contractingMode,
        legalSummary: primary?.legalSummary ?? "",
        evidence,
      });
    }
    if (sources.length === 0) continue;
    out.push({
      key: def.key,
      text: def.text,
      triggerKeys: def.triggerKeys,
      sources,
      evidence: sources.flatMap((s) => s.evidence),
    });
  }
  return out;
}

// --- Capa 3: tabla nutricional ----------------------------------------------

const STATUS_RANK: Record<CategoryFinding["status"], number> = { found: 2, unclear: 1, not_found: 0 };

/** Elige, entre los documentos aplicables, el hallazgo más informativo de una categoría. */
function bestFinding(
  docs: LicenseAnalysis[],
  key: string,
): { finding: CategoryFinding; doc: LicenseAnalysis } | null {
  let best: { finding: CategoryFinding; doc: LicenseAnalysis } | null = null;
  for (const doc of docs) {
    const finding = doc.categories[key];
    if (!finding) continue;
    if (!best || STATUS_RANK[finding.status] > STATUS_RANK[best.finding.status]) {
      best = { finding, doc };
    }
  }
  return best;
}

const REVIEW_RANK: Record<string, number> = {
  rejected: 3,
  needs_legal_review: 2,
  unreviewed: 1,
  reviewed: 0,
};

const RISK_RANK: Record<string, number> = { unknown: 0, low: 1, medium: 2, high: 3, critical: 4 };

export function nutritionLabel(analyses: LicenseAnalysis[], mode: ContractingMode): NutritionLabelData {
  const docs = applicableDocs(analyses, mode);
  const first = docs[0] ?? analyses[0];

  const rows: NutritionRow[] = CATEGORIES.map((cat) => {
    const best = bestFinding(docs, cat.key);
    const finding = best?.finding;
    // Solo se afirma 'found' con evidencia; sin evidencia → no se da por hallado.
    const hasEvidence = !!finding && finding.evidence.length > 0;
    const status = finding && (finding.status !== "found" || hasEvidence) ? finding.status : "not_found";
    return {
      categoryKey: cat.key,
      label: cat.label,
      status,
      riskLevel: (finding?.riskLevel ?? "unknown") as RiskLevel,
      plainConcern: cat.concern,
      legalConcern: cat.legalConcern,
      legalSummary: status === "found" && best ? best.finding.legalSummary : "",
      evidence: status === "found" && best ? best.finding.evidence : [],
      source: status === "found" && best ? toSource(best.doc, best.finding) : null,
    };
  });

  // Procedencia ("porción"): peor estado de revisión y verificación conjunta.
  const reviewStatus = docs.reduce<string>((acc, d) => {
    const r = d.metadata.reviewStatus;
    return (REVIEW_RANK[r] ?? 0) > (REVIEW_RANK[acc] ?? 0) ? r : acc;
  }, docs[0]?.metadata.reviewStatus ?? "unreviewed");
  const hash = first?.metadata.contentHash ?? null;

  // Lectura de riesgo: reusa las derivaciones puras existentes (riskRationale /
  // topRiskCategories) sobre el documento APLICABLE de mayor riesgo. No es un
  // ranking ni una nota: es prosa preliminar atada a categorías detectadas. La
  // modalidad no se traslada (sólo se consideran documentos aplicables a `mode`).
  const labelOf = (k: string) => CATEGORY_BY_KEY[k]?.label ?? k;
  const worst = docs.reduce<LicenseAnalysis | null>((acc, d) => {
    if (!acc) return d;
    return (RISK_RANK[d.overall.overallRiskLevel] ?? 0) > (RISK_RANK[acc.overall.overallRiskLevel] ?? 0) ? d : acc;
  }, null);
  const riskRead: RiskRead | null = worst
    ? {
        level: worst.overall.overallRiskLevel,
        rationale: riskRationale(worst, labelOf),
        drivers: topRiskCategories(worst, labelOf),
      }
    : null;

  return {
    providerName: first?.providerName ?? "",
    productName: first?.productName ?? "",
    mode,
    modeLabel: MODE_LABELS[mode],
    documents: docs.map((d) => ({ analysisId: d.id, documentType: d.documentType })),
    retrievedAt: (first?.metadata.retrievedAt ?? first?.retrievedAt ?? null)?.slice(0, 10) ?? null,
    contentHashShort: hash ? hash.replace(/^sha256:/, "").slice(0, 12) : null,
    reviewStatus,
    sourceVerified: docs.length > 0 && docs.every((d) => !!d.metadata.sourceVerified),
    riskRead,
    rows,
  };
}

// --- Selector de modalidad por producto -------------------------------------

/** Modalidades presentes en los documentos de un producto (para el selector). */
export function availableModesFor(analyses: LicenseAnalysis[]): ContractingMode[] {
  const set = new Set<ContractingMode>();
  for (const a of analyses) {
    set.add(a.contractingMode);
    for (const m of a.appliesToModes) set.add(m);
  }
  return Array.from(set);
}

/** Orden de preferencia del default: lo más general/consumer primero. */
const MODE_DEFAULT_ORDER: ContractingMode[] = [
  "free",
  "all",
  "paid_individual",
  "team",
  "business",
  "enterprise",
  "api",
  "education",
  "open_source",
  "unknown",
];

/** Modalidad por defecto de la tarjeta: la más general/consumer disponible. */
export function defaultModeFor(analyses: LicenseAnalysis[]): ContractingMode {
  const available = new Set(availableModesFor(analyses));
  for (const m of MODE_DEFAULT_ORDER) {
    if (available.has(m)) return m;
  }
  return analyses[0]?.contractingMode ?? "unknown";
}

/** Búsqueda rápida de la config de categoría (re-export de conveniencia). */
export { CATEGORY_BY_KEY };
