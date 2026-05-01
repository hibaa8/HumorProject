import { describe, it, expect } from "vitest";
import {
  extractPresignUploadResponse,
  pipelineErrorMessageFromBody,
} from "@/lib/almostCrackdClient";

describe("extractPresignUploadResponse", () => {
  it("parses camelCase keys", () => {
    expect(
      extractPresignUploadResponse({
        presignedUrl: "https://s3/presign",
        cdnUrl: "https://cdn/x.jpg",
      })
    ).toEqual({
      presignedUrl: "https://s3/presign",
      cdnUrl: "https://cdn/x.jpg",
    });
  });

  it("parses snake_case keys", () => {
    expect(
      extractPresignUploadResponse({
        presigned_url: "https://s3/presign",
        cdn_url: "https://cdn/x.jpg",
      })
    ).toEqual({
      presignedUrl: "https://s3/presign",
      cdnUrl: "https://cdn/x.jpg",
    });
  });

  it("returns null when a URL is missing", () => {
    expect(
      extractPresignUploadResponse({ presigned_url: "https://only/one" })
    ).toBeNull();
  });
});

describe("pipelineErrorMessageFromBody", () => {
  it("prefers error string", () => {
    expect(
      pipelineErrorMessageFromBody({ error: "bad" }, "fallback")
    ).toBe("bad");
  });
});
