import { describe, it, expect } from "vitest";
import { colorFor, initials, resolveLogoSrc } from "../src/lib/providerLogoUtils";
import { BASE_PATH } from "../src/lib/basePath";

describe("colorFor (monograma determinístico)", () => {
  it("es determinístico por id", () => {
    expect(colorFor("openai")).toBe(colorFor("openai"));
  });
  it("siempre devuelve un color de la paleta", () => {
    const palette = ["#334155", "#475569", "#1e3a5f", "#3f3f46", "#0f766e", "#7c2d12"];
    for (const id of ["openai", "anthropic", "google", "x", "amazon-web-services"]) {
      expect(palette).toContain(colorFor(id));
    }
  });
});

describe("initials", () => {
  it("toma la inicial de las dos primeras palabras", () => {
    expect(initials("Hugging Face")).toBe("HF");
    expect(initials("Amazon Web Services")).toBe("AW");
  });
  it("para un solo nombre usa su inicial", () => {
    expect(initials("Anthropic")).toBe("A");
  });
});

describe("resolveLogoSrc", () => {
  it("sin logoPath y sin archivo disponible → undefined (monograma)", () => {
    expect(resolveLogoSrc("openai", new Set(), undefined)).toBeUndefined();
  });
  it("con archivo disponible → ruta con basePath", () => {
    const src = resolveLogoSrc("openai", new Set(["openai"]), undefined);
    expect(src).toBe(`${BASE_PATH}/logos/openai.svg`);
  });
  it("logoPath explícito del registro tiene prioridad", () => {
    const src = resolveLogoSrc("openai", new Set(), "logos/custom-openai.svg");
    expect(src).toBe(`${BASE_PATH}/logos/custom-openai.svg`);
  });
});
