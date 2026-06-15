import { describe, it, expect } from "vitest";
import { loadAllLicenseAnalyses } from "../src/lib/storage";
import { buildStateOfArt, topSignals } from "../src/domain/stateOfArt";

describe("buildStateOfArt (corpus real)", () => {
  it("expone la firma, conteos y composición del corpus", async () => {
    const analyses = await loadAllLicenseAnalyses();
    const s = buildStateOfArt(analyses);
    expect(s.shortHash).toHaveLength(12);
    expect(s.corpusSignature.length).toBeGreaterThan(12);
    expect(s.documentCount).toBe(analyses.length);
    expect(s.providerCount).toBeGreaterThan(0);
    expect(s.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.corpus.aiProducts + s.corpus.baselineProducts).toBe(s.corpus.products);
  });

  it("identifica producto más restrictivo y más expuesto, con fundamento trazable", async () => {
    const analyses = await loadAllLicenseAnalyses();
    const s = buildStateOfArt(analyses);
    expect(s.insufficientEvidence).toBe(false);
    expect(s.mostRestrictiveProduct).not.toBeNull();
    expect(s.mostExposedLegalPracticeProduct).not.toBeNull();
    expect(s.mostRestrictiveProduct!.restrictiveness.value).toBeGreaterThan(0);
    expect(s.mostRestrictiveProduct!.restrictiveness.sourceDocuments.length).toBeGreaterThan(0);
    expect(topSignals(s.mostExposedLegalPracticeProduct!.exposure, 3).length).toBeGreaterThan(0);
  });

  it("entrega prosa de lectura y documentos para leer primero", async () => {
    const analyses = await loadAllLicenseAnalyses();
    const s = buildStateOfArt(analyses);
    expect(s.generalReading).toContain("Según el corpus actual");
    expect(s.whyLegalCriteria.length).toBeGreaterThan(80);
    expect(s.aiVsEveryday.length).toBeGreaterThan(80);
    expect(s.documentsToReadFirst.length).toBeGreaterThan(0);
    for (const d of s.documentsToReadFirst) {
      expect(d.id).toBeTruthy();
      expect(d.reason).toBeTruthy();
    }
  });

  it("las cautelas cuentan documentos reales del corpus de IA", async () => {
    const analyses = await loadAllLicenseAnalyses();
    const s = buildStateOfArt(analyses);
    for (const z of s.keyCautions) {
      expect(z.count).toBeGreaterThan(0);
      expect(z.count).toBeLessThanOrEqual(z.total);
    }
  });

  it("no usa lenguaje absoluto ni ranking comercial", async () => {
    const analyses = await loadAllLicenseAnalyses();
    const s = buildStateOfArt(analyses);
    const blob = [s.generalReading, s.whyLegalCriteria, s.aiVsEveryday, ...s.limitations].join(" ").toLowerCase();
    expect(blob).not.toMatch(/\bes ilegal\b|\bes seguro\b|\bgarantiza\b|\bmejor herramienta\b|\bcumple\b/);
    expect(blob).toContain("según el corpus");
  });

  it("corpus vacío => insufficientEvidence y sin picks", () => {
    const s = buildStateOfArt([]);
    expect(s.insufficientEvidence).toBe(true);
    expect(s.mostRestrictiveProduct).toBeNull();
    expect(s.mostExposedLegalPracticeProduct).toBeNull();
  });
});
