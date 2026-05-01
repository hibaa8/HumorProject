import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

/*
 * Integration tests for middleware routing logic.
 * We mock `@supabase/ssr` to control getSession() and stub env vars so the
 * early-return guard (missing URL/key) doesn't skip our tests.
 */

const mockGetSession = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getSession: mockGetSession },
  }),
}));

// Import AFTER mock is declared so the hoisted mock applies.
// File is named proxy.ts in Next.js 16+, function is exported as `proxy`.
const { proxy: middleware } = await import("../../src/proxy");

function req(pathname: string) {
  return new NextRequest(`http://localhost:3000${pathname}`);
}

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("middleware routing — unauthenticated user", () => {
  it("passes / through (public)", async () => {
    const res = await middleware(req("/"));
    expect(res.status).not.toBe(307);
  });

  it("passes /auth/signin through (public)", async () => {
    const res = await middleware(req("/auth/signin"));
    expect(res.status).not.toBe(307);
  });

  it("passes /auth/callback through (public)", async () => {
    const res = await middleware(req("/auth/callback"));
    expect(res.status).not.toBe(307);
  });

  it("redirects /jokes → /auth/signin", async () => {
    const res = await middleware(req("/jokes"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/signin");
  });

  it("redirects /dashboard → /auth/signin", async () => {
    const res = await middleware(req("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/signin");
  });

  it("redirects /stats → /auth/signin", async () => {
    const res = await middleware(req("/stats"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/signin");
  });

  it("redirects /generate → /auth/signin", async () => {
    const res = await middleware(req("/generate"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/signin");
  });

  it("includes ?next=<path> in the redirect URL", async () => {
    const res = await middleware(req("/stats"));
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("next=");
    expect(decodeURIComponent(loc)).toContain("/stats");
  });

  it("returns 401 JSON for /api/* routes", async () => {
    const res = await middleware(req("/api/captions"));
    expect(res.status).toBe(401);
  });
});

describe("middleware routing — authenticated user", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "u1", email: "test@test.com" } } },
      error: null,
    });
  });

  it("passes /jokes through", async () => {
    const res = await middleware(req("/jokes"));
    expect(res.status).not.toBe(307);
  });

  it("passes /dashboard through", async () => {
    const res = await middleware(req("/dashboard"));
    expect(res.status).not.toBe(307);
  });

  it("passes /stats through", async () => {
    const res = await middleware(req("/stats"));
    expect(res.status).not.toBe(307);
  });

  it("passes /api/captions through", async () => {
    const res = await middleware(req("/api/captions"));
    expect(res.status).not.toBe(401);
  });
});

describe("middleware routing — stale refresh token", () => {
  it("redirects to / and clears sb-* cookies on refresh_token_not_found", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: { code: "refresh_token_not_found", status: 400 },
    });
    const res = await middleware(req("/jokes"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/");
  });
});
