/**
 * Filters which humor flavors appear in the /jokes (and similar) UI dropdown.
 *
 * The DB may list 200+ flavors, but the dropdown intentionally shows only:
 * 1. Flavors in {@link REQUIRED_FLAVOR_SLUGS} (always shown).
 * 2. Flavors whose slug starts with `ter-re-` (always shown).
 * 3. Any other flavor that has **at least one caption** in `captions.humor_flavor_id`.
 * 4. {@link EXCLUDED_FLAVOR_SLUGS} are never shown even if they have captions.
 *
 * So: no captions + not in the allowlist ⇒ hidden from the dropdown.
 */
export const REQUIRED_FLAVOR_SLUGS = new Set([
  "nature-documentary",
  "gen-z-dark-roast",
  "corecore-man",
  "russ-hanemann",
  "gigachad",
  "dwight-schrute",
  "columbia",
  "pov-pov",
]);

export const EXCLUDED_FLAVOR_SLUGS = new Set([
  "erlich-bachman",
  "social-justice-warrior",
]);

export function isFlavorIncluded(
  slug: string | null,
  flavorId: number,
  flavorIdsWithCaptions: Set<number>
): boolean {
  const s = slug ?? "";
  if (EXCLUDED_FLAVOR_SLUGS.has(s)) return false;
  if (REQUIRED_FLAVOR_SLUGS.has(s) || s.startsWith("ter-re-")) return true;
  return flavorIdsWithCaptions.has(flavorId);
}
