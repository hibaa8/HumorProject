import {
  buildFlavorLeaderboard,
  topCaptionsForFlavor,
  type CaptionWithImageRow,
  type FlavorRow,
  type VoteRow,
} from "@/lib/humorFlavorStats";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const PAGE = 1000;

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type FlavorLeaderboardApiRow = {
  flavorId: number;
  slug: string | null;
  captionCount: number;
  upvotes: number;
  downvotes: number;
  upvotesPerCaption: number;
};

export type FlavorStatsExample = {
  id: string;
  content: string | null;
  imageUrl: string;
  upvotes: number;
};

export type FlavorStatsPayload = {
  leaderboard: FlavorLeaderboardApiRow[];
  topFlavor: {
    id: number;
    slug: string | null;
    description: string | null;
  } | null;
  examples: FlavorStatsExample[];
};

export type FlavorStatsComputeResult =
  | { ok: true; viewerId: string; payload: FlavorStatsPayload }
  | { ok: false; viewerId: string; error: string; flavorError?: string };

function parseFlavorStatsRpc(data: unknown): FlavorStatsPayload | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (!Array.isArray(o.leaderboard)) return null;

  const leaderboard: FlavorLeaderboardApiRow[] = o.leaderboard.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      flavorId: Number(r.flavorId),
      slug: (r.slug as string | null) ?? null,
      captionCount: Number(r.captionCount),
      upvotes: Number(r.upvotes),
      downvotes: Number(r.downvotes),
      upvotesPerCaption: Number(r.upvotesPerCaption),
    };
  });

  let topFlavor: FlavorStatsPayload["topFlavor"] = null;
  if (o.topFlavor != null && typeof o.topFlavor === "object") {
    const t = o.topFlavor as Record<string, unknown>;
    topFlavor = {
      id: Number(t.id),
      slug: (t.slug as string | null) ?? null,
      description: (t.description as string | null) ?? null,
    };
  }

  const examples: FlavorStatsExample[] = Array.isArray(o.examples)
    ? o.examples.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id),
          content: (r.content as string | null) ?? null,
          imageUrl: String(r.imageUrl ?? ""),
          upvotes: Number(r.upvotes),
        };
      })
    : [];

  return { leaderboard, topFlavor, examples };
}

async function fetchAllCaptionsWithImages(
  supabase: ServerClient
): Promise<CaptionWithImageRow[]> {
  const all: CaptionWithImageRow[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("captions")
      .select("id, content, humor_flavor_id, images!inner(url)")
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    all.push(...(data as CaptionWithImageRow[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function fetchAllVotes(supabase: ServerClient): Promise<VoteRow[]> {
  const all: VoteRow[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("caption_votes")
      .select("caption_id, vote_value")
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    all.push(...(data as VoteRow[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

/** Slow path: paginate all captions + votes (many HTTP round-trips). */
async function computeFlavorStatsPaginated(
  supabase: ServerClient,
  viewerId: string
): Promise<FlavorStatsComputeResult> {
  const { data: allFlavors, error: flavorError } = await supabase
    .from("humor_flavors")
    .select("id, slug, description")
    .order("id");

  if (flavorError) {
    return {
      ok: false,
      viewerId,
      error: flavorError.message,
      flavorError: flavorError.message,
    };
  }

  const { data: captionRows } = await supabase
    .from("captions")
    .select("humor_flavor_id");

  const flavorIdsWithCaptions = new Set(
    (captionRows ?? [])
      .map((row) => row.humor_flavor_id)
      .filter((id): id is number => Boolean(id))
  );

  let captions: CaptionWithImageRow[] = [];
  let votes: VoteRow[] = [];
  try {
    [captions, votes] = await Promise.all([
      fetchAllCaptionsWithImages(supabase),
      fetchAllVotes(supabase),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, viewerId, error: msg };
  }

  const leaderboard = buildFlavorLeaderboard(
    (allFlavors ?? []) as FlavorRow[],
    captions,
    votes,
    flavorIdsWithCaptions
  );

  const topFlavorRow = leaderboard[0];
  const topFlavorMeta = topFlavorRow
    ? (allFlavors ?? []).find((f) => f.id === topFlavorRow.flavorId) ?? null
    : null;

  const examples =
    topFlavorRow != null
      ? topCaptionsForFlavor(topFlavorRow.flavorId, captions, votes, 8).map(
          (ex) => ({
            id: ex.id,
            content: ex.content,
            imageUrl: ex.imageUrl as string,
            upvotes: ex.upvotes,
          })
        )
      : [];

  const payload: FlavorStatsPayload = {
    leaderboard,
    topFlavor: topFlavorMeta
      ? {
          id: topFlavorMeta.id,
          slug: topFlavorMeta.slug,
          description: topFlavorMeta.description,
        }
      : null,
    examples,
  };

  return { ok: true, viewerId, payload };
}

export async function computeFlavorStatsForViewer(
  supabase: ServerClient,
  viewerId: string
): Promise<FlavorStatsComputeResult> {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "api_humor_flavor_stats_payload"
  );

  if (!rpcError && rpcData != null) {
    const parsed = parseFlavorStatsRpc(rpcData);
    if (parsed) {
      return { ok: true, viewerId, payload: parsed };
    }
  }

  return computeFlavorStatsPaginated(supabase, viewerId);
}
