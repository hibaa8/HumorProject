import { isFlavorIncluded } from "@/lib/humorFlavorFilters";

export type FlavorRow = { id: number; slug: string | null; description: string | null };

export type CaptionWithImageRow = {
  id: string;
  content: string | null;
  humor_flavor_id: number | null;
  images: { url: string | null } | { url: string | null }[] | null;
};

export type VoteRow = { caption_id: string; vote_value: number };

function normalizeImage(
  images: CaptionWithImageRow["images"]
): { url: string | null } | null {
  if (!images) return null;
  return Array.isArray(images) ? images[0] ?? null : images;
}

/** Rank included flavors by average upvotes per caption (captions must have an image row). */
export function buildFlavorLeaderboard(
  flavors: FlavorRow[],
  captions: CaptionWithImageRow[],
  votes: VoteRow[],
  flavorIdsWithCaptions: Set<number>
) {
  const includedFlavors = flavors.filter((f) =>
    isFlavorIncluded(f.slug, f.id, flavorIdsWithCaptions)
  );
  const includedIds = new Set(includedFlavors.map((f) => f.id));

  const captionMeta = new Map<
    string,
    { humor_flavor_id: number | null; hasUrl: boolean }
  >();
  for (const c of captions) {
    const img = normalizeImage(c.images);
    captionMeta.set(c.id, {
      humor_flavor_id: c.humor_flavor_id,
      hasUrl: Boolean(img?.url),
    });
  }

  const upByCaption = new Map<string, number>();
  const downByCaption = new Map<string, number>();
  for (const v of votes) {
    if (v.vote_value === 1) {
      upByCaption.set(v.caption_id, (upByCaption.get(v.caption_id) ?? 0) + 1);
    } else if (v.vote_value === -1) {
      downByCaption.set(
        v.caption_id,
        (downByCaption.get(v.caption_id) ?? 0) + 1
      );
    }
  }

  type Agg = {
    flavorId: number;
    slug: string | null;
    captionCount: number;
    upvotes: number;
    downvotes: number;
  };
  const byFlavor = new Map<number, Agg>();

  for (const [captionId, meta] of captionMeta) {
    const fid = meta.humor_flavor_id;
    if (fid == null || !includedIds.has(fid) || !meta.hasUrl) continue;
    if (!byFlavor.has(fid)) {
      const slug = includedFlavors.find((f) => f.id === fid)?.slug ?? null;
      byFlavor.set(fid, {
        flavorId: fid,
        slug,
        captionCount: 0,
        upvotes: 0,
        downvotes: 0,
      });
    }
    const agg = byFlavor.get(fid)!;
    agg.captionCount += 1;
    agg.upvotes += upByCaption.get(captionId) ?? 0;
    agg.downvotes += downByCaption.get(captionId) ?? 0;
  }

  const rows = [...byFlavor.values()]
    .filter((r) => r.captionCount > 0)
    .map((r) => ({
      ...r,
      upvotesPerCaption: r.upvotes / r.captionCount,
    }))
    .sort((a, b) => b.upvotesPerCaption - a.upvotesPerCaption);

  return rows;
}

export function topCaptionsForFlavor(
  flavorId: number,
  captions: CaptionWithImageRow[],
  votes: VoteRow[],
  limit: number
) {
  const upByCaption = new Map<string, number>();
  for (const v of votes) {
    if (v.vote_value === 1) {
      upByCaption.set(v.caption_id, (upByCaption.get(v.caption_id) ?? 0) + 1);
    }
  }

  const list = captions
    .filter((c) => c.humor_flavor_id === flavorId)
    .map((c) => {
      const img = normalizeImage(c.images);
      return {
        id: c.id,
        content: c.content,
        imageUrl: img?.url ?? null,
        upvotes: upByCaption.get(c.id) ?? 0,
      };
    })
    .filter((c) => c.imageUrl)
    .sort((a, b) => b.upvotes - a.upvotes)
    .slice(0, limit);

  return list;
}
