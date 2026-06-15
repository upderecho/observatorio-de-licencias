import { describe, it, expect } from "vitest";
import type { LicenseAnalysis } from "../src/lib/schema";
import {
  buildComparisonUnits,
  buildComparisonPresets,
  compareUnits,
  findDifferentialFindings,
  CATEGORY_AXES,
} from "../src/domain/comparison";

function cat(status: "found" | "unclear" | "not_found", risk = "medium", quotes = 0) {
  return { status, riskLevel: risk, legalSummary: "", evidence: Array.from({ length: quotes }, () => ({ quote: "q", locationHint: "x" })), notes: "", appliesToModes: [], modeSpecificity: "general", modeEvidence: [] };
}

function mk(over: Partial<LicenseAnalysis> & { provider: string; product: string; group?: string; cats?: Record<string, ReturnType<typeof cat>> }): LicenseAnalysis {
  return {
    id: `${over.provider}-${over.product}-doc`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    providerName: over.provider,
    productName: over.product,
    productTier: "All",
    documentType: "Terms",
    softwareCategory: over.group === "traditional_software" ? "email" : "ai_provider",
    comparisonGroup: (over.group ?? "ai") as never,
    comparativeBaseline: false,
    academicPurposeNotes: "",
    contractingMode: "all" as never,
    appliesToModes: [] as never,
    sourceScope: "general" as never,
    modeConfidence: "unknown" as never,
    modeRationale: "",
    sourceUrl: null,
    retrievedAt: "2026-06-15",
    rawTextPath: "x",
    overall: { legalSummary: "", overallRiskLevel: "medium" },
    privacy: { posture: "unknown", rationale: "", signals: [], evidence: [] },
    categories: (over.cats ?? {}) as never,
    metadata: { createdAt: "t", parserVersion: "t", isMock: false, reviewStatus: "unreviewed" },
  } as LicenseAnalysis;
}

const openai = mk({ provider: "OpenAI", product: "ChatGPT", group: "ai", cats: { privacy: cat("found", "high", 2), confidentiality: cat("not_found") } });
const anthropic = mk({ provider: "Anthropic", product: "Claude", group: "ai", cats: { privacy: cat("unclear", "medium", 1), confidentiality: cat("found", "medium", 1) } });
const ms = mk({ provider: "Microsoft", product: "Microsoft 365", group: "traditional_software", cats: { privacy: cat("found") } });

describe("buildComparisonUnits", () => {
  it("agrupa por proveedor·producto", () => {
    const units = buildComparisonUnits([openai, anthropic, ms]);
    expect(units.length).toBe(3);
    expect(units.map((u) => u.label)).toContain("OpenAI · ChatGPT");
    expect(units.find((u) => u.providerName === "Microsoft")!.comparisonGroup).toBe("traditional_software");
  });
});

describe("compareUnits", () => {
  it("devuelve una fila por eje jurídico, con celda por unidad", () => {
    const units = buildComparisonUnits([openai, anthropic]);
    const rows = compareUnits(units);
    expect(rows.length).toBe(CATEGORY_AXES.length);
    const privacyRow = rows.find((r) => r.axis.key === "privacy")!;
    expect(Object.keys(privacyRow.cells).length).toBe(2);
    // OpenAI privacy = found (high), Anthropic = unclear
    const oa = units.find((u) => u.providerName === "OpenAI")!;
    expect(privacyRow.cells[oa.id].status).toBe("found");
    expect(privacyRow.cells[oa.id].risk).toBe("high");
    expect(privacyRow.cells[oa.id].evidenceCount).toBe(2);
  });
});

describe("findDifferentialFindings", () => {
  it("marca ejes donde el estado difiere entre unidades", () => {
    const units = buildComparisonUnits([openai, anthropic]);
    const rows = compareUnits(units);
    const diff = findDifferentialFindings(rows, units.map((u) => u.id));
    const keys = diff.map((a) => a.key);
    // privacidad (found vs unclear) y confidencialidad (not_found vs found) difieren
    expect(keys).toContain("privacy");
    expect(keys).toContain("confidentiality");
  });
});

describe("buildComparisonPresets", () => {
  it("genera presets de escenario y, si hay IA + tradicional, 'IA vs software tradicional'", () => {
    const units = buildComparisonUnits([openai, anthropic, ms]);
    const presets = buildComparisonPresets(units);
    expect(presets.some((p) => p.kind === "scenario")).toBe(true);
    expect(presets.some((p) => p.id === "ai-vs-traditional")).toBe(true);
  });

  it("no genera presets de grupo cuyas unidades no existan", () => {
    // Solo IA: no debe aparecer 'IA vs software tradicional' ni 'Redes sociales'.
    const presets = buildComparisonPresets(buildComparisonUnits([openai, anthropic]));
    expect(presets.some((p) => p.id === "ai-vs-traditional")).toBe(false);
    expect(presets.some((p) => p.id === "social")).toBe(false);
  });
});
