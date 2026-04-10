/** Same-origin path only; blocks open redirects and `//evil.com` paths. */
export function getSafeInternalPath(
  value: string | null | undefined,
  fallback: string
): string {
  if (!value) return fallback;
  let path: string;
  try {
    path = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes(":")) return fallback;
  return path;
}
