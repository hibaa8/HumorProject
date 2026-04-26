import { describe, it, expect, vi } from "vitest";
import { loadDashboardActivity } from "@/lib/dashboardActivity";

/*
 * Integration tests for loadDashboardActivity.
 * We pass in a fake Supabase client that returns controlled data so we can
 * verify the data-transformation logic without touching the database.
 */

type FakeClient = Parameters<typeof loadDashboardActivity>[0];

function makeChain(data: unknown) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolve({ data, error: null })),
  };
  return chain;
}

function makeClient(overrides: Partial<Record<string, unknown[]>> = {}): FakeClient {
  const defaults: Record<string, unknown[]> = {
    caption_votes: [],
    captions: [],
    humor_flavors: [],
    ...overrides,
  };

  return {
    from: (table: string) => makeChain(defaults[table] ?? []),
  } as unknown as FakeClient;
}

describe("loadDashboardActivity", () => {
  it("returns empty generated and voted arrays when user has no data", async () => {
    const client = makeClient();
    const result = await loadDashboardActivity(client, "user-1");
    expect(result.generated).toHaveLength(0);
    expect(result.voted).toHaveLength(0);
  });

  it("maps generated captions with correct shape", async () => {
    const client = makeClient({
      captions: [
        {
          id: "cap-1",
          content: "Funny caption",
          humor_flavor_id: 1,
          created_datetime_utc: "2024-01-01",
          images: { url: "https://img/1.jpg" },
        },
      ],
      humor_flavors: [{ id: 1, slug: "gigachad" }],
    });
    const result = await loadDashboardActivity(client, "user-1");
    expect(result.generated[0]).toMatchObject({
      id: "cap-1",
      content: "Funny caption",
      slug: "gigachad",
      upvotes: 0,
      downvotes: 0,
    });
  });

  it("resolves imageUrl from array images", async () => {
    const client = makeClient({
      captions: [
        {
          id: "cap-2",
          content: "Test",
          humor_flavor_id: null,
          created_datetime_utc: null,
          images: [{ url: "https://img/arr.jpg" }, { url: "https://img/second.jpg" }],
        },
      ],
    });
    const result = await loadDashboardActivity(client, "user-1");
    expect(result.generated[0].imageUrl).toBe("https://img/arr.jpg");
  });

  it("sets imageUrl to null when images is null", async () => {
    const client = makeClient({
      captions: [
        {
          id: "cap-3",
          content: "No image",
          humor_flavor_id: null,
          created_datetime_utc: null,
          images: null,
        },
      ],
    });
    const result = await loadDashboardActivity(client, "user-1");
    expect(result.generated[0].imageUrl).toBeNull();
  });

  it("includes voted captions with myVote field", async () => {
    const client = makeClient({
      caption_votes: [
        { caption_id: "cap-10", vote_value: 1, created_datetime_utc: "2024-01-02" },
      ],
      captions: [
        {
          id: "cap-10",
          content: "Voted caption",
          humor_flavor_id: null,
          created_datetime_utc: null,
          images: { url: "https://img/v.jpg" },
        },
      ],
    });
    const result = await loadDashboardActivity(client, "user-1");
    expect(result.voted[0]).toMatchObject({ id: "cap-10", myVote: 1 });
  });

  it("deduplicates votes (only first vote per caption in voted list)", async () => {
    const client = makeClient({
      caption_votes: [
        { caption_id: "cap-20", vote_value: 1, created_datetime_utc: "2024-01-03" },
        { caption_id: "cap-20", vote_value: -1, created_datetime_utc: "2024-01-01" },
      ],
      captions: [
        {
          id: "cap-20",
          content: "Dup caption",
          humor_flavor_id: null,
          created_datetime_utc: null,
          images: { url: "https://img/d.jpg" },
        },
      ],
    });
    const result = await loadDashboardActivity(client, "user-1");
    expect(result.voted.filter((v) => v.id === "cap-20")).toHaveLength(1);
  });
});
