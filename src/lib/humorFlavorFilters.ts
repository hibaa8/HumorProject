/** Shared allowlist / exclusions for humor flavor UI (dropdown + landing). */
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
