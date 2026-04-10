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

export async function computeFlavorStatsForViewer(
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
