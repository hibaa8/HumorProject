import { describe, it, expect, vi } from "vitest";
import { loadDashboardActivity } from "@/lib/dashboardActivity";

/*
 * Integration tests for loadDashboardActivity.
 * We pass in a fake Supabase client that returns controlled data so we can
 * verify the data-transformation logic without touching the database.
 */

type FakeClient = Parameters<typeof loadDashboardActivity>[0];

function makeChain(data: unknown[]) {
  let limitVal: number | null = null;
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: (n: number) => {
      limitVal = n;
      return chain;
    },
    then: (resolve: (v: unknown) => unknown) => {
      let out = data;
      if (limitVal != null) {
        out = data.slice(0, limitVal);
      }
      return Promise.resolve(resolve({ data: out, error: null }));
    },
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
    from: (table: string) => makeChain((defaults[table] ?? []) as unknown[]),
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

  it("respects generatedQueryLimit when loading captions", async () => {
    const client = makeClient({
      captions: [
        {
          id: "a",
          content: "1",
          humor_flavor_id: null,
          created_datetime_utc: "2024-02-01",
          images: { url: "https://img/a.jpg" },
        },
        {
          id: "b",
          content: "2",
          humor_flavor_id: null,
          created_datetime_utc: "2024-01-01",
          images: { url: "https://img/b.jpg" },
        },
      ],
    });
    const result = await loadDashboardActivity(client, "user-1", {
      generatedQueryLimit: 1,
    });
    expect(result.generated).toHaveLength(1);
    expect(result.generated[0].id).toBe("a");
  });

  it("applies votedListCap after deduplicating vote rows", async () => {
    const client = makeClient({
      caption_votes: [
        { caption_id: "cap-a", vote_value: 1, created_datetime_utc: "2024-03-01" },
        { caption_id: "cap-b", vote_value: -1, created_datetime_utc: "2024-02-01" },
        { caption_id: "cap-c", vote_value: 1, created_datetime_utc: "2024-01-01" },
      ],
      captions: [
        {
          id: "cap-a",
          content: "A",
          humor_flavor_id: null,
          created_datetime_utc: null,
          images: { url: "https://img/a.jpg" },
        },
        {
          id: "cap-b",
          content: "B",
          humor_flavor_id: null,
          created_datetime_utc: null,
          images: { url: "https://img/b.jpg" },
        },
        {
          id: "cap-c",
          content: "C",
          humor_flavor_id: null,
          created_datetime_utc: null,
          images: { url: "https://img/c.jpg" },
        },
      ],
    });
    const result = await loadDashboardActivity(client, "user-1", {
      votedListCap: 2,
    });
    expect(result.voted).toHaveLength(2);
    expect(result.voted.map((v) => v.id)).toEqual(["cap-a", "cap-b"]);
  });
});
