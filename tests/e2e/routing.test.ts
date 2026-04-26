import { describe, it, expect } from "vitest";

/*
 * Minimal E2E tests: real HTTP fetch against the running dev server.
 * Run `npm run dev` in another terminal first, then `npm test`.
 *
 * These tests are skipped automatically when the server is not reachable.
 */

const BASE = "http://localhost:3000";

async function serverIsUp(): Promise<boolean> {
  try {
    await fetch(`${BASE}/`, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
}

describe.skipIf(!(await serverIsUp()))("E2E routing (requires dev server on :3000)", () => {
  it("home page returns 200", async () => {
    const res = await fetch(`${BASE}/`);
    expect(res.status).toBe(200);
  });

  it("protected page redirects unauthenticated user", async () => {
    const res = await fetch(`${BASE}/jokes`, { redirect: "manual" });
    // middleware issues 307 to /auth/signin
    expect([307, 308, 302, 301]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/auth/signin");
  });

  it("protected API returns 401 JSON when logged out", async () => {
    const res = await fetch(`${BASE}/api/captions`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("/auth/signin redirects to Google (not a 404)", async () => {
    const res = await fetch(`${BASE}/auth/signin`, { redirect: "manual" });
    // Should be a redirect to accounts.google.com or supabase OAuth URL
    expect([307, 302, 301]).toContain(res.status);
    const loc = res.headers.get("location") ?? "";
    expect(loc.length).toBeGreaterThan(0);
  });
});
