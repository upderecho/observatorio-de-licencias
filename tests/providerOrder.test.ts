import { describe, it, expect } from "vitest";
import { compareProviders } from "../src/lib/derive";

describe("compareProviders", () => {
  it("posiciona Anthropic, OpenAI y xAI arriba, en ese orden", () => {
    const sorted = ["Google", "OpenAI", "Adobe", "xAI", "Anthropic", "Apple"].sort(compareProviders);
    expect(sorted.slice(0, 3)).toEqual(["Anthropic", "OpenAI", "xAI"]);
  });

  it("ordena el resto alfabéticamente", () => {
    const sorted = ["Microsoft", "Adobe", "Google", "Cohere"].sort(compareProviders);
    expect(sorted).toEqual(["Adobe", "Cohere", "Google", "Microsoft"]);
  });

  it("mantiene los fijos antes que cualquier otro alfabéticamente anterior", () => {
    // "Adobe" < "Anthropic" alfabéticamente, pero Anthropic está fijo arriba.
    expect(compareProviders("Anthropic", "Adobe")).toBeLessThan(0);
  });
});
