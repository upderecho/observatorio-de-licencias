import { describe, it, expect } from "vitest";
import { documentKey, latestAnalyses, versionsOf } from "../src/domain/versions";
import type { LicenseAnalysis } from "../src/lib/schema";

/** Construye un análisis mínimo con solo lo que versions.ts lee. */
function mk(over: {
  id: string;
  providerName?: string;
  productName?: string;
  documentType?: string;
  retrievedAt?: string;
  contentHash?: string;
}): LicenseAnalysis {
  return {
    id: over.id,
    providerName: over.providerName ?? "OpenAI",
    productName: over.productName ?? "ChatGPT",
    documentType: over.documentType ?? "Privacy Policy",
    retrievedAt: over.retrievedAt ?? "2026-06-14",
    metadata: { retrievedAt: over.retrievedAt, contentHash: over.contentHash },
  } as unknown as LicenseAnalysis;
}

describe("documentKey", () => {
  it("agrupa por proveedor + producto + tipo, sin importar fecha/id", () => {
    const a = mk({ id: "openai-chatgpt-privacy-policy-2026-06-14" });
    const b = mk({ id: "openai-chatgpt-privacy-policy-2026-07-20" });
    expect(documentKey(a)).toBe(documentKey(b));
  });

  it("distingue documentos distintos del mismo proveedor", () => {
    const a = mk({ id: "x", documentType: "Privacy Policy" });
    const b = mk({ id: "y", documentType: "Terms of Use" });
    expect(documentKey(a)).not.toBe(documentKey(b));
  });

  it("no colisiona entre proveedores con el mismo tipo de documento", () => {
    const a = mk({ id: "a", providerName: "OpenAI", documentType: "Privacy Policy" });
    const b = mk({ id: "b", providerName: "Anthropic", productName: "Claude", documentType: "Privacy Policy" });
    expect(documentKey(a)).not.toBe(documentKey(b));
  });
});

describe("latestAnalyses", () => {
  it("devuelve una sola captura por documento (la más reciente)", () => {
    const v1 = mk({ id: "doc-2026-06-14", retrievedAt: "2026-06-14" });
    const v2 = mk({ id: "doc-2026-07-20", retrievedAt: "2026-07-20" });
    const latest = latestAnalyses([v1, v2]);
    expect(latest).toHaveLength(1);
    expect(latest[0].id).toBe("doc-2026-07-20");
  });

  it("conserva documentos con una sola versión", () => {
    const a = mk({ id: "a", documentType: "Privacy Policy" });
    const b = mk({ id: "b", documentType: "Terms of Use" });
    expect(latestAnalyses([a, b])).toHaveLength(2);
  });

  it("usa metadata.retrievedAt cuando está presente", () => {
    const older = mk({ id: "older", retrievedAt: "2026-06-14" });
    const newer = mk({ id: "newer", retrievedAt: "2026-08-01" });
    expect(latestAnalyses([newer, older])[0].id).toBe("newer");
  });
});

describe("versionsOf", () => {
  it("devuelve todas las capturas del documento, más reciente primero", () => {
    const v1 = mk({ id: "doc-2026-06-14", retrievedAt: "2026-06-14" });
    const v2 = mk({ id: "doc-2026-07-20", retrievedAt: "2026-07-20" });
    const other = mk({ id: "x", documentType: "Terms of Use" });
    const versions = versionsOf([v1, other, v2], v1);
    expect(versions.map((v) => v.id)).toEqual(["doc-2026-07-20", "doc-2026-06-14"]);
  });

  it("para un documento con una sola captura, devuelve esa", () => {
    const a = mk({ id: "a" });
    expect(versionsOf([a], a).map((v) => v.id)).toEqual(["a"]);
  });
});
