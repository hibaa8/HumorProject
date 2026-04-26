import { describe, it, expect } from "vitest";
import {
  isFlavorIncluded,
  REQUIRED_FLAVOR_SLUGS,
  EXCLUDED_FLAVOR_SLUGS,
} from "@/lib/humorFlavorFilters";

const WITH_CAPTIONS = new Set([10, 20, 30]);

describe("isFlavorIncluded", () => {
  it("always excludes slugs in EXCLUDED_FLAVOR_SLUGS", () => {
    for (const slug of EXCLUDED_FLAVOR_SLUGS) {
      expect(isFlavorIncluded(slug, 999, WITH_CAPTIONS)).toBe(false);
    }
  });

  it("always includes slugs in REQUIRED_FLAVOR_SLUGS regardless of captions", () => {
    for (const slug of REQUIRED_FLAVOR_SLUGS) {
      expect(isFlavorIncluded(slug, 999, new Set())).toBe(true);
    }
  });

  it("includes any slug starting with ter-re-", () => {
    expect(isFlavorIncluded("ter-re-pop-culture", 999, new Set())).toBe(true);
    expect(isFlavorIncluded("ter-re-sidechat", 999, new Set())).toBe(true);
  });

  it("includes unknown slug if flavorId is in flavorIdsWithCaptions", () => {
    expect(isFlavorIncluded("unknown-flavor", 20, WITH_CAPTIONS)).toBe(true);
  });

  it("excludes unknown slug if flavorId is NOT in flavorIdsWithCaptions", () => {
    expect(isFlavorIncluded("unknown-flavor", 99, WITH_CAPTIONS)).toBe(false);
  });

  it("treats null slug as empty string (falls through to ID check)", () => {
    expect(isFlavorIncluded(null, 10, WITH_CAPTIONS)).toBe(true);
    expect(isFlavorIncluded(null, 99, WITH_CAPTIONS)).toBe(false);
  });

  it("exclusion takes priority over required set (if slug were in both)", () => {
    // Build a set where an excluded slug would also match a required-slug check
    // Excluded list should always win — check erlich-bachman directly
    expect(isFlavorIncluded("erlich-bachman", 999, WITH_CAPTIONS)).toBe(false);
  });
});
