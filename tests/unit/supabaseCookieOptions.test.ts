import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSupabaseCookieOptions", () => {
  it("always sets path to /", async () => {
    const { getSupabaseCookieOptions } = await import("@/lib/supabaseCookieOptions");
    expect(getSupabaseCookieOptions().path).toBe("/");
  });

  it("always sets sameSite to lax", async () => {
    const { getSupabaseCookieOptions } = await import("@/lib/supabaseCookieOptions");
    expect(getSupabaseCookieOptions().sameSite).toBe("lax");
  });

  it("sets secure: true in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { getSupabaseCookieOptions } = await import("@/lib/supabaseCookieOptions");
    expect(getSupabaseCookieOptions().secure).toBe(true);
  });

  it("sets secure: false in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { getSupabaseCookieOptions } = await import("@/lib/supabaseCookieOptions");
    expect(getSupabaseCookieOptions().secure).toBe(false);
  });

  it("does not set domain (prevents Vercel cookie mismatch)", async () => {
    const { getSupabaseCookieOptions } = await import("@/lib/supabaseCookieOptions");
    expect(getSupabaseCookieOptions()).not.toHaveProperty("domain");
  });
});
