import { describe, it, expect } from "vitest";
import { getSafeInternalPath } from "@/lib/authRedirect";

describe("getSafeInternalPath", () => {
  it("returns the path when valid", () => {
    expect(getSafeInternalPath("/dashboard", "/")).toBe("/dashboard");
    expect(getSafeInternalPath("/jokes", "/")).toBe("/jokes");
    expect(getSafeInternalPath("/stats", "/")).toBe("/stats");
  });

  it("returns fallback for null or undefined", () => {
    expect(getSafeInternalPath(null, "/dashboard")).toBe("/dashboard");
    expect(getSafeInternalPath(undefined, "/dashboard")).toBe("/dashboard");
    expect(getSafeInternalPath("", "/dashboard")).toBe("/dashboard");
  });

  it("blocks open redirect via // prefix", () => {
    expect(getSafeInternalPath("//evil.com", "/")).toBe("/");
    expect(getSafeInternalPath("//evil.com/steal", "/")).toBe("/");
  });

  it("blocks absolute URLs with protocol", () => {
    expect(getSafeInternalPath("https://evil.com", "/")).toBe("/");
    expect(getSafeInternalPath("http://evil.com/path", "/")).toBe("/");
  });

  it("blocks paths that do not start with /", () => {
    expect(getSafeInternalPath("evil.com", "/")).toBe("/");
    expect(getSafeInternalPath("javascript:alert(1)", "/")).toBe("/");
  });

  it("decodes encoded paths correctly", () => {
    expect(getSafeInternalPath("%2Fdashboard", "/")).toBe("/dashboard");
  });

  it("blocks encoded open redirects", () => {
    expect(getSafeInternalPath("%2F%2Fevil.com", "/")).toBe("/");
  });

  it("returns fallback on malformed percent-encoding", () => {
    expect(getSafeInternalPath("%", "/")).toBe("/");
    expect(getSafeInternalPath("%zz", "/")).toBe("/");
  });
});
