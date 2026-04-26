import { describe, it, expect } from "vitest";
import { getFlavorHowItWorks } from "@/lib/flavorContext";

describe("getFlavorHowItWorks", () => {
  it("returns curated copy for known slugs", () => {
    const result = getFlavorHowItWorks("nature-documentary", null);
    expect(result).toContain("documentary");
    expect(result.length).toBeGreaterThan(20);
  });

  it("returns curated copy for all required flavors", () => {
    const knownSlugs = [
      "nature-documentary",
      "gen-z-dark-roast",
      "corecore-man",
      "russ-hanemann",
      "gigachad",
      "dwight-schrute",
      "columbia",
      "pov-pov",
    ];
    for (const slug of knownSlugs) {
      const result = getFlavorHowItWorks(slug, null);
      expect(result.length).toBeGreaterThan(20);
    }
  });

  it("returns ter-re copy for any ter-re- prefixed slug", () => {
    const a = getFlavorHowItWorks("ter-re-pop-culture", null);
    const b = getFlavorHowItWorks("ter-re-sidechat", null);
    expect(a).toContain("ter-re");
    expect(b).toContain("ter-re");
    expect(a).toBe(b); // same copy regardless of suffix
  });

  it("falls back to db description for unknown slug", () => {
    const result = getFlavorHowItWorks("totally-unknown", "DB description text");
    expect(result).toBe("DB description text");
  });

  it("falls back to generic message when both slug and db description are null", () => {
    const result = getFlavorHowItWorks(null, null);
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles null slug without throwing", () => {
    expect(() => getFlavorHowItWorks(null, "fallback")).not.toThrow();
  });
});
