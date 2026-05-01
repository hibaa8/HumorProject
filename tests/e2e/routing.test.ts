import { describe, it, expect } from "vitest";

/*
 * E2E tests run against a dedicated dev server spawned by tests/e2e/globalSetup.ts
 * on port 3001 (or against E2E_BASE_URL if set, e.g. a Vercel preview URL).
 *
 * No setup needed beyond `npm test` — globalSetup handles it.
 */

const BASE = process.env.E2E_TEST_BASE_URL ?? "http://localhost:3001";

describe("E2E routing", () => {
  it("home page returns 200 (public, no auth required)", async () => {
    const res = await fetch(`${BASE}/`);
    expect(res.status).toBe(200);
  });

  it("/jokes redirects unauthenticated user to /auth/signin", async () => {
    const res = await fetch(`${BASE}/jokes`, { redirect: "manual" });
    expect([301, 302, 307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/auth/signin");
  });

  it("/dashboard redirects unauthenticated user to /auth/signin", async () => {
    const res = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
    expect([301, 302, 307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/auth/signin");
  });

  it("/activity redirects unauthenticated user to /auth/signin", async () => {
    const res = await fetch(`${BASE}/activity`, { redirect: "manual" });
    expect([301, 302, 307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/auth/signin");
  });

  it("/api/captions returns 401 JSON when logged out", async () => {
    const res = await fetch(`${BASE}/api/captions`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("/api/humor-flavors returns 401 JSON when logged out", async () => {
    const res = await fetch(`${BASE}/api/humor-flavors`);
    expect(res.status).toBe(401);
  });

  it("/api/caption-vote returns 401 JSON when logged out", async () => {
    const res = await fetch(`${BASE}/api/caption-vote`, {
      method: "POST",
      body: JSON.stringify({ captionId: "x", voteValue: 1 }),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(401);
  });

  it("/auth/signin redirects (toward Google OAuth) instead of returning 404", async () => {
    const res = await fetch(`${BASE}/auth/signin`, { redirect: "manual" });
    expect([301, 302, 307, 308]).toContain(res.status);
    expect((res.headers.get("location") ?? "").length).toBeGreaterThan(0);
  });
});
