import { describe, it, expect } from "vitest";
import type { LicenseAnalysis } from "../src/lib/schema";
import { computeCorpusSignature } from "../src/domain/corpusSignature";

function mk(id: string, contentHash: string, retrievedAt: string, provider = "Prov"): LicenseAnalysis {
  return {
    id,
    providerName: provider,
    productName: "P",
    productTier: "All",
    documentType: "Terms",
    softwareCategory: "ai_provider",
    comparisonGroup: "ai",
    comparativeBaseline: false,
    academicPurposeNotes: "",
    contractingMode: "all" as never,
    appliesToModes: [] as never,
    sourceScope: "general" as never,
    modeConfidence: "unknown" as never,
    modeRationale: "",
    sourceUrl: null,
    retrievedAt,
    rawTextPath: "x",
    overall: { legalSummary: "", overallRiskLevel: "medium" },
    privacy: { posture: "unknown", rationale: "", signals: [], evidence: [] },
    categories: {} as never,
    metadata: { createdAt: "t", parserVersion: "t", isMock: false, reviewStatus: "unreviewed", contentHash, retrievedAt },
  } as LicenseAnalysis;
}

describe("computeCorpusSignature", () => {
  const a = mk("a", "h1", "2026-06-10");
  const b = mk("b", "h2", "2026-06-14", "Otra");

  it("es determinística e independiente del orden de entrada", () => {
    expect(computeCorpusSignature([a, b]).hash).toBe(computeCorpusSignature([b, a]).hash);
  });

  it("cambia cuando cambia el hash de contenido de un documento (actualización de licencia)", () => {
    const updated = mk("a", "h1-NEW", "2026-06-15");
    expect(computeCorpusSignature([a, b]).hash).not.toBe(computeCorpusSignature([updated, b]).hash);
  });

  it("reporta conteos y la última fecha del corpus", () => {
    const sig = computeCorpusSignature([a, b]);
    expect(sig.documentCount).toBe(2);
    expect(sig.providerCount).toBe(2);
    expect(sig.lastUpdated).toBe("2026-06-14");
    expect(sig.shortHash).toHaveLength(12);
  });
});
