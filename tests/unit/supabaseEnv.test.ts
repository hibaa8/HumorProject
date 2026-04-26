import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabaseEnv";

const ORIG = { ...process.env };

beforeEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_PROJECT_ID;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

afterEach(() => {
  Object.assign(process.env, ORIG);
});

describe("getSupabaseUrl", () => {
  it("prefers SUPABASE_URL first", () => {
    process.env.SUPABASE_URL = "https://custom.example.com";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://other.example.com";
    expect(getSupabaseUrl()).toBe("https://custom.example.com");
  });

  it("falls back to NEXT_PUBLIC_SUPABASE_URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://public.example.com";
    expect(getSupabaseUrl()).toBe("https://public.example.com");
  });

  it("constructs URL from SUPABASE_PROJECT_ID as last resort", () => {
    process.env.SUPABASE_PROJECT_ID = "myprojectref";
    expect(getSupabaseUrl()).toBe("https://myprojectref.supabase.co");
  });

  it("returns undefined when no env vars are set", () => {
    expect(getSupabaseUrl()).toBeUndefined();
  });
});

describe("getSupabaseAnonKey", () => {
  it("prefers NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-key";
    process.env.SUPABASE_ANON_KEY = "server-key";
    expect(getSupabaseAnonKey()).toBe("public-key");
  });

  it("falls back to SUPABASE_ANON_KEY", () => {
    process.env.SUPABASE_ANON_KEY = "server-key";
    expect(getSupabaseAnonKey()).toBe("server-key");
  });

  it("returns undefined when neither is set", () => {
    expect(getSupabaseAnonKey()).toBeUndefined();
  });
});
