import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type Tally = { up: number; down: number };

function tallyVotes(
  voteRows: { caption_id: string; vote_value: number }[]
): Map<string, Tally> {
  const tally = new Map<string, Tally>();
  for (const row of voteRows ?? []) {
    const cur = tally.get(row.caption_id) ?? { up: 0, down: 0 };
    if (row.vote_value === 1) cur.up += 1;
    else if (row.vote_value === -1) cur.down += 1;
    tally.set(row.caption_id, cur);
  }
  return tally;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rankBy =
    searchParams.get("rankBy") === "upvotes" ? "upvotes" : "net";
  const limitRaw = searchParams.get("limit");
  const limit = Math.min(
    50,
    Math.max(1, limitRaw ? Number(limitRaw) : 10)
  );

  const { data: voteRows, error: voteError } = await supabase
    .from("caption_votes")
    .select("caption_id, vote_value");

  if (voteError) {
    return NextResponse.json({ error: voteError.message }, { status: 500 });
  }

  const tally = tallyVotes(voteRows ?? []);

  const scored = [...tally.entries()].map(([captionId, { up, down }]) => ({
    captionId,
    up,
    down,
    net: up - down,
    score: rankBy === "upvotes" ? up : up - down,
  }));

  scored.sort((a, b) => b.score - a.score || b.up - a.up);
  const top = scored.slice(0, limit);
  const topIds = top.map((s) => s.captionId);

  if (topIds.length === 0) {
    return NextResponse.json({ data: [], rankBy });
  }

  const scoreById = new Map(
    top.map((s) => [
      s.captionId,
      { upvote_count: s.up, downvote_count: s.down, net_score: s.net },
    ])
  );

  const { data: captions, error: captionError } = await supabase
    .from("captions")
    .select("id, content, humor_flavor_id, images (url, image_description)")
    .in("id", topIds);

  if (captionError) {
    return NextResponse.json({ error: captionError.message }, { status: 500 });
  }

  const flavorIds = [
    ...new Set(
      (captions ?? [])
        .map((c) => c.humor_flavor_id)
        .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
    ),
  ];

  const { data: flavorRows } =
    flavorIds.length > 0
      ? await supabase.from("humor_flavors").select("id, slug").in("id", flavorIds)
      : { data: [] as { id: number; slug: string | null }[] };

  const slugByFlavorId = new Map(
    (flavorRows ?? []).map((f) => [f.id, f.slug])
  );

  const byId = new Map((captions ?? []).map((c) => [c.id, c]));

  const enriched = topIds
    .map((id) => {
      const caption = byId.get(id);
      if (!caption) return null;
      const scores = scoreById.get(id) ?? {
        upvote_count: 0,
        downvote_count: 0,
        net_score: 0,
      };
      const fid = caption.humor_flavor_id;
      const flavor_slug =
        typeof fid === "number" ? slugByFlavorId.get(fid) ?? null : null;

      return {
        id: caption.id,
        content: caption.content,
        humor_flavor_id: caption.humor_flavor_id,
        flavor_slug,
        images: caption.images,
        upvote_count: scores.upvote_count,
        downvote_count: scores.downvote_count,
        net_score: scores.net_score,
        /** @deprecated use net_score */
        vote_count: scores.net_score,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  return NextResponse.json({ data: enriched, rankBy });
}
