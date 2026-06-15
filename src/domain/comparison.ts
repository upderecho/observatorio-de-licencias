/**
 * Modelo comparativo de UP-Law-AILO.
 *
 * La comparación es el principio organizador: no se filtran documentos, se eligen
 * unidades comparativas (proveedor·producto) a partir de un preset o escenario y
 * se las contrasta por ejes jurídicos. Determinístico, sin LLM, sin red; funciona
 * sobre los JSON públicos (export-safe).
 */

import type { LicenseAnalysis } from "@/lib/schema";
import { providerKey } from "@/lib/derive";
import { evaluateScenario } from "./evaluateScenario";

// --- Unidad comparativa: un proveedor·producto y sus documentos ---

export interface ComparisonUnit {
  id: string;
  providerName: string;
  productName: string;
  comparisonGroup: string;
  softwareCategory: string;
  label: string;
  analyses: LicenseAnalysis[];
}

export function buildComparisonUnits(analyses: LicenseAnalysis[]): ComparisonUnit[] {
  const map = new Map<string, ComparisonUnit>();
  for (const a of analyses) {
    const id = `${providerKey(a)}__${a.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    let u = map.get(id);
    if (!u) {
      u = {
        id,
        providerName: a.providerName,
        productName: a.productName,
        comparisonGroup: a.comparisonGroup,
        softwareCategory: a.softwareCategory,
        label: `${a.providerName} · ${a.productName}`,
        analyses: [],
      };
      map.set(id, u);
    }
    u.analyses.push(a);
  }
  return [...map.values()].sort((x, y) => x.label.localeCompare(y.label));
}

// --- Ejes jurídicos agrupados (categorías canónicas) ---

export interface CategoryAxis {
  key: string;
  label: string;
  categories: string[];
}

export const CATEGORY_AXES: CategoryAxis[] = [
  { key: "privacy", label: "Datos y privacidad", categories: ["privacy", "data_retention", "data_deletion"] },
  { key: "training", label: "Entrenamiento / mejora del servicio", categories: ["training_use"] },
  { key: "confidentiality", label: "Confidencialidad y seguridad", categories: ["confidentiality", "security"] },
  { key: "ip", label: "Propiedad intelectual", categories: ["input_ip", "output_ip", "license_grant"] },
  { key: "liability", label: "Responsabilidad y remedios", categories: ["liability_limitation", "indemnity", "warranties", "arbitration"] },
  { key: "jurisdiction", label: "Jurisdicción y cambios contractuales", categories: ["governing_law", "jurisdiction", "unilateral_changes"] },
];

type CellStatus = "found" | "unclear" | "not_found" | "no_data";
type CellRisk = "low" | "medium" | "high" | "unknown";

export interface ComparisonCell {
  status: CellStatus;
  risk: CellRisk;
  evidenceCount: number;
  categoryKeys: string[];
}

export interface ComparisonRow {
  axis: CategoryAxis;
  cells: Record<string, ComparisonCell>; // por unitId
}

const STATUS_RANK: Record<string, number> = { not_found: 0, no_data: 0, unclear: 1, found: 2 };
const RISK_RANK: Record<string, number> = { unknown: 0, low: 1, medium: 2, high: 3 };

/** Contrasta unidades por eje jurídico. Celdas breves (estado/cautela/evidencia). */
export function compareUnits(units: ComparisonUnit[]): ComparisonRow[] {
  return CATEGORY_AXES.map((axis) => {
    const cells: Record<string, ComparisonCell> = {};
    for (const u of units) {
      let status: CellStatus = "no_data";
      let risk: CellRisk = "unknown";
      let evidenceCount = 0;
      for (const a of u.analyses) {
        for (const key of axis.categories) {
          const c = a.categories[key];
          if (!c) continue;
          if (STATUS_RANK[c.status] > STATUS_RANK[status]) status = c.status as CellStatus;
          if (RISK_RANK[c.riskLevel] > RISK_RANK[risk]) risk = c.riskLevel as CellRisk;
          evidenceCount += c.evidence.length;
        }
      }
      cells[u.id] = { status, risk, evidenceCount, categoryKeys: axis.categories };
    }
    return { axis, cells };
  });
}

/** Evidencia bajo demanda: documentos y citas de una unidad para un eje. */
export function getEvidenceForComparison(unit: ComparisonUnit, axis: CategoryAxis) {
  const out: { analysisId: string; documentType: string; categoryLabel: string; quotes: string[] }[] = [];
  for (const a of unit.analyses) {
    for (const key of axis.categories) {
      const c = a.categories[key];
      if (c && c.evidence.length > 0) {
        out.push({
          analysisId: a.id,
          documentType: a.documentType,
          categoryLabel: key,
          quotes: c.evidence.slice(0, 2).map((e) => e.quote),
        });
      }
    }
  }
  return out;
}

/** Diferencias relevantes: ejes donde las unidades NO coinciden en estado. */
export function findDifferentialFindings(rows: ComparisonRow[], unitIds: string[]): CategoryAxis[] {
  return rows
    .filter((r) => {
      const statuses = unitIds.map((id) => r.cells[id]?.status ?? "no_data");
      return new Set(statuses).size > 1;
    })
    .map((r) => r.axis);
}

// --- Presets comparativos (generados de datos reales) ---

export interface ComparisonPreset {
  id: string;
  label: string;
  description: string;
  kind: "scenario" | "group" | "pair";
  scenarioId?: string;
  /** Selección por defecto (ids de unidad que existen en los datos). */
  unitIds: string[];
}

const has = (units: ComparisonUnit[], id: string) => units.some((u) => u.id === id);
const byGroup = (units: ComparisonUnit[], g: string) => units.filter((u) => u.comparisonGroup === g);

/** Genera SOLO presets cuyas unidades existen realmente (≥2). */
export function buildComparisonPresets(units: ComparisonUnit[]): ComparisonPreset[] {
  const presets: ComparisonPreset[] = [];
  const ai = byGroup(units, "ai");
  const traditional = byGroup(units, "traditional_software");
  const social = byGroup(units, "social_platform");

  // Escenarios jurídicos (la selección se resuelve con evaluateScenario más abajo).
  const scenarioPresets: { id: string; label: string }[] = [
    { id: "public_information", label: "IA para información pública" },
    { id: "personal_data", label: "IA para datos personales" },
    { id: "confidential_business_information", label: "IA para información confidencial" },
    { id: "client_confidential_information", label: "IA para trabajo jurídico de clientes" },
  ];
  for (const s of scenarioPresets) {
    presets.push({
      id: `scenario-${s.id}`,
      label: s.label,
      description: "Unidades sugeridas según el escenario, con sus condiciones por eje jurídico.",
      kind: "scenario",
      scenarioId: s.id,
      unitIds: ai.slice(0, 3).map((u) => u.id),
    });
  }

  // IA vs software tradicional (si hay ambos).
  if (ai.length >= 1 && traditional.length >= 1) {
    presets.push({
      id: "ai-vs-traditional",
      label: "IA vs software tradicional",
      description: "Contrasta herramientas de IA con software cotidiano del abogado.",
      kind: "group",
      unitIds: [...ai.slice(0, 2), ...traditional.slice(0, 2)].map((u) => u.id),
    });
  }
  // Redes sociales (si hay ≥2).
  if (social.length >= 2) {
    presets.push({
      id: "social",
      label: "Redes sociales",
      description: "Condiciones de las redes sociales usadas profesionalmente.",
      kind: "group",
      unitIds: social.slice(0, 4).map((u) => u.id),
    });
  }
  // Microsoft 365 vs IA (si existe MS365 y al menos una IA).
  const ms = units.find((u) => /microsoft 365/i.test(u.productName));
  if (ms && ai.length >= 1) {
    presets.push({
      id: "ms365-vs-ai",
      label: "Microsoft 365 vs IA",
      description: "Productividad tradicional frente a herramientas de IA.",
      kind: "pair",
      unitIds: [ms.id, ...ai.slice(0, 2).map((u) => u.id)],
    });
  }

  // Solo presets con ≥2 unidades válidas presentes.
  return presets
    .map((p) => ({ ...p, unitIds: p.unitIds.filter((id) => has(units, id)) }))
    .filter((p) => p.kind === "scenario" || p.unitIds.length >= 2);
}

/** Unidades sugeridas para un escenario (vía el motor existente, sin lógica paralela). */
export function getScenarioComparison(scenarioId: string, units: ComparisonUnit[], analyses: LicenseAnalysis[]): string[] {
  const results = evaluateScenario(scenarioId, analyses);
  const order = ["preferred_with_conditions", "usable_with_caution", "requires_contract_review"];
  const ranked = [...results].sort((a, b) => order.indexOf(a.recommendation) - order.indexOf(b.recommendation));
  const unitIds: string[] = [];
  for (const r of ranked) {
    const u = units.find((x) => x.analyses.some((a) => a.id === r.analysisId));
    if (u && !unitIds.includes(u.id)) unitIds.push(u.id);
    if (unitIds.length >= 4) break;
  }
  return unitIds;
}
