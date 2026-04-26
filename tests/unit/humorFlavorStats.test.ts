import { describe, it, expect } from "vitest";
import {
  buildFlavorLeaderboard,
  topCaptionsForFlavor,
  type FlavorRow,
  type CaptionWithImageRow,
  type VoteRow,
} from "@/lib/humorFlavorStats";

const flavors: FlavorRow[] = [
  { id: 1, slug: "nature-documentary", description: null },
  { id: 2, slug: "gigachad", description: null },
  { id: 3, slug: "erlich-bachman", description: null }, // excluded
];

const captions: CaptionWithImageRow[] = [
  { id: "c1", content: "Caption 1", humor_flavor_id: 1, images: { url: "https://img/1.jpg" } },
  { id: "c2", content: "Caption 2", humor_flavor_id: 1, images: { url: "https://img/2.jpg" } },
  { id: "c3", content: "Caption 3", humor_flavor_id: 2, images: { url: "https://img/3.jpg" } },
  { id: "c4", content: "Caption 4", humor_flavor_id: 3, images: { url: "https://img/4.jpg" } }, // excluded flavor
  { id: "c5", content: "No image",  humor_flavor_id: 1, images: null }, // no image, excluded from stats
];

const votes: VoteRow[] = [
  { caption_id: "c1", vote_value: 1 },
  { caption_id: "c1", vote_value: 1 },
  { caption_id: "c2", vote_value: 1 },
  { caption_id: "c3", vote_value: 1 },
  { caption_id: "c3", vote_value: -1 },
];

const withCaptions = new Set([1, 2, 3]);

describe("buildFlavorLeaderboard", () => {
  it("returns one row per included flavor that has captioned images", () => {
    const rows = buildFlavorLeaderboard(flavors, captions, votes, withCaptions);
    const slugs = rows.map((r) => r.slug);
    expect(slugs).toContain("nature-documentary");
    expect(slugs).toContain("gigachad");
    expect(slugs).not.toContain("erlich-bachman"); // excluded
  });

  it("computes upvotesPerCaption correctly", () => {
    const rows = buildFlavorLeaderboard(flavors, captions, votes, withCaptions);
    const nd = rows.find((r) => r.slug === "nature-documentary")!;
    // c1 has 2 upvotes, c2 has 1 upvote, 2 captions with images → (2+1)/2 = 1.5
    expect(nd.upvotesPerCaption).toBe(1.5);
  });

  it("sorts descending by upvotesPerCaption", () => {
    const rows = buildFlavorLeaderboard(flavors, captions, votes, withCaptions);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].upvotesPerCaption).toBeGreaterThanOrEqual(
        rows[i].upvotesPerCaption
      );
    }
  });

  it("excludes captions without images from stats", () => {
    const rows = buildFlavorLeaderboard(flavors, captions, votes, withCaptions);
    const nd = rows.find((r) => r.slug === "nature-documentary")!;
    expect(nd.captionCount).toBe(2); // c5 has no image, not counted
  });

  it("returns empty array when no captions", () => {
    const rows = buildFlavorLeaderboard(flavors, [], [], withCaptions);
    expect(rows).toHaveLength(0);
  });

  it("counts downvotes separately", () => {
    const rows = buildFlavorLeaderboard(flavors, captions, votes, withCaptions);
    const gc = rows.find((r) => r.slug === "gigachad")!;
    expect(gc.downvotes).toBe(1);
    expect(gc.upvotes).toBe(1);
  });
});

describe("topCaptionsForFlavor", () => {
  it("returns only captions for the given flavor", () => {
    const tops = topCaptionsForFlavor(1, captions, votes, 10);
    expect(tops.every((c) => ["c1", "c2"].includes(c.id))).toBe(true);
  });

  it("sorts by upvotes descending", () => {
    const tops = topCaptionsForFlavor(1, captions, votes, 10);
    expect(tops[0].id).toBe("c1"); // 2 upvotes
    expect(tops[1].id).toBe("c2"); // 1 upvote
  });

  it("respects the limit", () => {
    const tops = topCaptionsForFlavor(1, captions, votes, 1);
    expect(tops).toHaveLength(1);
    expect(tops[0].id).toBe("c1");
  });

  it("excludes captions without images", () => {
    const tops = topCaptionsForFlavor(1, captions, votes, 10);
    expect(tops.every((c) => c.imageUrl !== null)).toBe(true);
  });

  it("returns empty array for flavor with no captions", () => {
    expect(topCaptionsForFlavor(99, captions, votes, 10)).toHaveLength(0);
  });
});
