import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const flavorIdParam = searchParams.get("flavorId");
  const offsetParam = searchParams.get("offset");
  const limitParam = searchParams.get("limit");

  const flavorId =
    flavorIdParam && flavorIdParam !== "all" ? Number(flavorIdParam) : null;
  const offset = offsetParam ? Number(offsetParam) : 0;
  const limit = limitParam ? Number(limitParam) : 10;
  if (flavorId !== null && !Number.isFinite(flavorId)) {
    return NextResponse.json(
      { error: "Missing or invalid flavorId." },
      { status: 400 }
    );
  }

  const rangeStart = Math.max(0, offset);
  const rangeEnd = rangeStart + Math.max(1, limit) - 1;

  let captionsQuery = supabase
    .from("captions")
    .select(
      "id, content, humor_flavor_id, created_datetime_utc, images!inner(url, image_description)"
    )
    .order("created_datetime_utc", { ascending: false })
    .range(rangeStart, rangeEnd);

  if (flavorId !== null) {
    captionsQuery = captionsQuery.eq("humor_flavor_id", flavorId);
  }

  const { data, error } = await captionsQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const captionIds = data.map((caption) => caption.id);
  let voteRows: { caption_id: string; vote_value: number }[] = [];
  if (captionIds.length > 0) {
    const { data: fetchedVotes, error: voteError } = await supabase
      .from("caption_votes")
      .select("caption_id, vote_value")
      .in("caption_id", captionIds);
    if (voteError) {
      return NextResponse.json({ error: voteError.message }, { status: 500 });
    }
    voteRows = fetchedVotes ?? [];
  }


  const upvoteTotals = new Map<string, number>();
  const downvoteTotals = new Map<string, number>();
  const userVotes = new Map<string, number>();
  (voteRows ?? []).forEach((row) => {
    if (row.vote_value === 1) {
      upvoteTotals.set(
        row.caption_id,
        (upvoteTotals.get(row.caption_id) ?? 0) + 1
      );
    } else if (row.vote_value === -1) {
      downvoteTotals.set(
        row.caption_id,
        (downvoteTotals.get(row.caption_id) ?? 0) + 1
      );
    }
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && captionIds.length > 0) {
    const { data: userVoteRows, error: userVoteError } = await supabase
      .from("caption_votes")
      .select("caption_id, vote_value")
      .eq("profile_id", user.id)
      .in("caption_id", captionIds);
    if (userVoteError) {
      return NextResponse.json({ error: userVoteError.message }, { status: 500 });
    }
    (userVoteRows ?? []).forEach((row) => {
      userVotes.set(row.caption_id, row.vote_value);
    });
  }

  const enriched = data.map((caption) => ({
    ...caption,
    upvote_count: upvoteTotals.get(caption.id) ?? 0,
    downvote_count: downvoteTotals.get(caption.id) ?? 0,
    my_vote: userVotes.get(caption.id) ?? 0,
  }));

  return NextResponse.json({ data: enriched });
}
