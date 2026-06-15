/**
 * Guías de lectura jurídica.
 *
 * Nuevo eje del producto: NO comparar herramientas, sino guiar la lectura. Para
 * un escenario jurídico, qué documentos leer, qué cláusulas revisar y con qué
 * prioridad de lectura (qué leer primero, NO un puntaje de riesgo).
 *
 * Reusa el motor `evaluateScenario` (per-documento, anti-fuga) — no hay un
 * priorizador paralelo. Determinístico, sin LLM, export-safe.
 */

import type { LicenseAnalysis } from "@/lib/schema";
import { CATEGORY_BY_KEY, CATEGORIES } from "@/lib/categories";
import { compareProviders } from "@/lib/derive";
import { SCENARIO_BY_ID, EVALUABLE_SCENARIOS, type LegalUseScenario } from "./legalUseScenarios";

export type ReadingPriority = "high" | "medium" | "low" | "insufficient";

export const READING_PRIORITY_LABEL: Record<ReadingPriority, string> = {
  high: "Prioridad alta",
  medium: "Prioridad media",
  low: "Prioridad baja",
  insufficient: "Sin evidencia suficiente",
};

export interface ReadingGuide {
  id: string;
  title: string;
  description: string;
  guidingQuestion: string;
  sensitivity: string;
  warning: string;
  priorityCategories: string[];
  clausesToInspect: { key: string; label: string }[];
  requiredDocumentTypes: string[];
  limitations: string;
}

const LIMITATIONS =
  "Esta guía organiza lectura documental preliminar: ordena qué leer primero. No sustituye análisis jurídico profesional ni asesoramiento legal.";

/** Tipos documentales que conviene leer por escenario (orientativo, no exhaustivo). */
const REQUIRED_DOCS: Record<string, string[]> = {
  public_information: ["Terms of Service", "Usage Policies", "Product Terms"],
  personal_data: ["Privacy Policy", "Data Processing Addendum", "Terms of Service", "Security Terms", "Product Terms"],
  confidential_business_information: ["Terms of Service", "Privacy Policy", "Data Processing Addendum", "Security Terms", "Enterprise/Business Terms"],
  client_confidential_information: ["Privacy Policy", "Data Processing Addendum", "Terms of Service", "Security Terms", "Enterprise/Business Terms"],
  attorney_client_privilege: ["Data Processing Addendum", "Enterprise/Business Terms", "Privacy Policy", "Security Terms", "Terms of Service"],
  academic_research: ["Terms of Service", "Usage Policies", "Privacy Policy", "Product Terms"],
  internal_legal_ops: ["Terms of Service", "Privacy Policy", "Data Processing Addendum", "Security Terms"],
  enterprise_api_use: ["API Terms", "Data Processing Addendum", "Security Terms", "Terms of Service", "Privacy Policy"],
};

/** Construye la guía de lectura de un escenario evaluable. */
export function getReadingGuide(scenarioId: string): ReadingGuide | null {
  const s = SCENARIO_BY_ID[scenarioId];
  if (!s || s.kind !== "evaluable") return null;
  return toGuide(s);
}

export function getAllReadingGuides(): ReadingGuide[] {
  return EVALUABLE_SCENARIOS.map(toGuide);
}

function toGuide(s: LegalUseScenario): ReadingGuide {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    guidingQuestion: `¿Qué documentos y cláusulas debe revisar un abogado para ${s.title.toLowerCase()}?`,
    sensitivity: s.sensitivity,
    warning: s.warning,
    priorityCategories: s.priorityCategories,
    clausesToInspect: s.priorityCategories.map((key) => ({ key, label: CATEGORY_BY_KEY[key]?.label ?? key })),
    requiredDocumentTypes: REQUIRED_DOCS[s.id] ?? ["Terms of Service", "Privacy Policy"],
    limitations: LIMITATIONS,
  };
}

// --- Documentos a leer (priorizados, no comparativos) ---

export interface DocumentToRead {
  analysisId: string;
  providerName: string;
  productName: string;
  documentType: string;
  contractingMode: string;
  comparisonGroup: string;
  sourceStatus: string;
  readingPriority: ReadingPriority;
  /** Cláusulas del escenario presentes en este documento (qué se va a leer). */
  whyRead: string[];
}

/** Prioridad de lectura: cuánto del contenido relevante del escenario hay para leer. */
function readingPriorityFor(a: LicenseAnalysis, priorityCategories: string[]): { priority: ReadingPriority; clauses: string[] } {
  const foundWithEvidence = priorityCategories.filter((k) => a.categories[k]?.status === "found" && a.categories[k].evidence.length > 0);
  const present = priorityCategories.filter((k) => {
    const st = a.categories[k]?.status;
    return st === "found" || st === "unclear";
  });
  const clauses = present.map((k) => CATEGORY_BY_KEY[k]?.label ?? k);
  let priority: ReadingPriority;
  if (foundWithEvidence.length >= 3) priority = "high";
  else if (foundWithEvidence.length >= 1) priority = "medium";
  else if (present.length >= 1) priority = "low";
  else priority = "insufficient";
  return { priority, clauses };
}

const PRIORITY_RANK: Record<ReadingPriority, number> = { high: 0, medium: 1, low: 2, insufficient: 3 };

/** Documentos relevantes para la guía, con prioridad de lectura. NO compara: prioriza qué leer. */
export function getDocumentsForReadingGuide(guide: ReadingGuide, analyses: LicenseAnalysis[]): DocumentToRead[] {
  return analyses
    .map((a) => {
      const { priority, clauses } = readingPriorityFor(a, guide.priorityCategories);
      return {
        analysisId: a.id,
        providerName: a.providerName,
        productName: a.productName,
        documentType: a.documentType,
        contractingMode: a.contractingMode,
        comparisonGroup: a.comparisonGroup,
        sourceStatus: a.metadata.sourceStatus ?? (a.metadata.sourceVerified ? "verified" : "needs_manual_review"),
        readingPriority: priority,
        whyRead: clauses,
      };
    })
    .filter((d) => d.readingPriority !== "insufficient")
    .sort(
      (x, y) =>
        PRIORITY_RANK[x.readingPriority] - PRIORITY_RANK[y.readingPriority] ||
        compareProviders(x.providerName, y.providerName) ||
        x.documentType.localeCompare(y.documentType),
    );
}

export function prioritizeDocumentsForReading(guide: ReadingGuide, analyses: LicenseAnalysis[]): DocumentToRead[] {
  return getDocumentsForReadingGuide(guide, analyses);
}

// --- Cláusulas a revisar (por eje), con evidencia ---

export interface ClauseToInspect {
  key: string;
  label: string;
  concern: string;
  documentsWithEvidence: { analysisId: string; providerName: string; documentType: string; quotes: string[] }[];
}

export function getClausesForReadingGuide(guide: ReadingGuide, analyses: LicenseAnalysis[]): ClauseToInspect[] {
  return guide.priorityCategories.map((key) => {
    const cat = CATEGORY_BY_KEY[key];
    const docs: ClauseToInspect["documentsWithEvidence"] = [];
    for (const a of analyses) {
      const c = a.categories[key];
      if (c && c.status === "found" && c.evidence.length > 0) {
        docs.push({
          analysisId: a.id,
          providerName: a.providerName,
          documentType: a.documentType,
          quotes: c.evidence.slice(0, 1).map((e) => e.quote),
        });
      }
    }
    return { key, label: cat?.label ?? key, concern: cat?.legalConcern ?? "", documentsWithEvidence: docs };
  });
}

// --- Dossier: lectura de un documento ---

/** Escenarios para los que este documento es relevante (tiene cláusulas presentes). */
export function getScenariosForDocument(a: LicenseAnalysis): { id: string; title: string }[] {
  return EVALUABLE_SCENARIOS.filter((s) =>
    s.priorityCategories.some((k) => {
      const st = a.categories[k]?.status;
      return st === "found" || st === "unclear";
    }),
  ).map((s) => ({ id: s.id, title: s.title }));
}

export interface ClauseReadingPriority {
  key: string;
  label: string;
  priority: ReadingPriority;
}

/**
 * Prioridad de LECTURA de las cláusulas presentes en el documento (qué leer
 * primero), en orden del catálogo. No es riesgo: ordena la lectura.
 */
export function getDocumentReadingPriorities(a: LicenseAnalysis): ClauseReadingPriority[] {
  const out: ClauseReadingPriority[] = [];
  for (const cat of CATEGORIES) {
    const c = a.categories[cat.key];
    if (!c) continue;
    let priority: ReadingPriority;
    if (c.status === "found" && c.evidence.length > 0) priority = "high";
    else if (c.status === "found" || c.status === "unclear") priority = "medium";
    else continue; // not_found: no se prioriza para lectura
    out.push({ key: cat.key, label: cat.label, priority });
  }
  const rank: Record<ReadingPriority, number> = { high: 0, medium: 1, low: 2, insufficient: 3 };
  return out.sort((x, y) => rank[x.priority] - rank[y.priority]);
}

/** Evidencia textual para una categoría del escenario. */
export function getEvidenceForGuideCategory(categoryKey: string, analyses: LicenseAnalysis[]) {
  const out: { analysisId: string; providerName: string; documentType: string; quotes: string[] }[] = [];
  for (const a of analyses) {
    const c = a.categories[categoryKey];
    if (c && c.evidence.length > 0) {
      out.push({ analysisId: a.id, providerName: a.providerName, documentType: a.documentType, quotes: c.evidence.slice(0, 2).map((e) => e.quote) });
    }
  }
  return out;
}
