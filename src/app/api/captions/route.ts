import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authedUser },
  } = await supabase.auth.getUser();

  if (!authedUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const flavorIdParam = searchParams.get("flavorId");
  const sortParam = searchParams.get("sort");
  const offsetParam = searchParams.get("offset");
  const limitParam = searchParams.get("limit");

  const flavorId =
    flavorIdParam && flavorIdParam !== "all" ? Number(flavorIdParam) : null;
  const offset = offsetParam ? Number(offsetParam) : 0;
  const limit = limitParam ? Number(limitParam) : 50;
  const sortBy =
    sortParam === "downvotes" ||
    sortParam === "upvotes" ||
    sortParam === "time" ||
    sortParam === "oldest"
      ? sortParam
      : "upvotes";

  if (flavorId !== null && !Number.isFinite(flavorId)) {
    return NextResponse.json(
      { error: "Missing or invalid flavorId." },
      { status: 400 }
    );
  }

  const rangeStart = Math.max(0, offset);
  const rangeEnd = rangeStart + Math.max(1, limit) - 1;

  const getCountsForIds = async (ids: string[]) => {
    if (ids.length === 0) {
      return { up: new Map<string, number>(), down: new Map<string, number>() };
    }
    const { data: fetchedVotes, error: voteError } = await supabase
      .from("caption_votes")
      .select("caption_id, vote_value")
      .in("caption_id", ids);
    if (voteError) {
      throw new Error(voteError.message);
    }
    const up = new Map<string, number>();
    const down = new Map<string, number>();
    (fetchedVotes ?? []).forEach((row) => {
      if (row.vote_value === 1) {
        up.set(row.caption_id, (up.get(row.caption_id) ?? 0) + 1);
      } else if (row.vote_value === -1) {
        down.set(row.caption_id, (down.get(row.caption_id) ?? 0) + 1);
      }
    });
    return { up, down };
  };

  const getUserVotesForIds = async (ids: string[]) => {
    const userVotes = new Map<string, number>();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || ids.length === 0) {
      return userVotes;
    }
    const { data: userVoteRows, error: userVoteError } = await supabase
      .from("caption_votes")
      .select("caption_id, vote_value")
      .eq("profile_id", user.id)
      .in("caption_id", ids);
    if (userVoteError) {
      throw new Error(userVoteError.message);
    }
    (userVoteRows ?? []).forEach((row) => {
      userVotes.set(row.caption_id, row.vote_value);
    });
    return userVotes;
  };

  if (sortBy === "time" || sortBy === "oldest") {
    let captionsQuery = supabase
      .from("captions")
      .select(
        "id, content, humor_flavor_id, created_datetime_utc, images!inner(url, image_description)"
      )
      .order("created_datetime_utc", { ascending: sortBy === "oldest" })
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

    const ids = data.map((row) => row.id);
    const counts = await getCountsForIds(ids);
    const userVotes = await getUserVotesForIds(ids);

    const enriched = data
      .map((caption) => {
        const images = caption.images;
        const normalizedImage = Array.isArray(images) ? images[0] : images;
        return {
          ...caption,
          images: normalizedImage,
          upvote_count: counts.up.get(caption.id) ?? 0,
          downvote_count: counts.down.get(caption.id) ?? 0,
          my_vote: userVotes.get(caption.id) ?? 0,
        };
      })
      .filter((caption) => caption.images?.url);

    return NextResponse.json({ data: enriched });
  }

  let voteRows: { caption_id: string; vote_value: number }[] = [];
  if (flavorId === null) {
    const { data: fetchedVotes, error: voteError } = await supabase
      .from("caption_votes")
      .select("caption_id, vote_value");
    if (voteError) {
      return NextResponse.json({ error: voteError.message }, { status: 500 });
    }
    voteRows = fetchedVotes ?? [];
  } else {
    const { data: fetchedVotes, error: voteError } = await supabase
      .from("caption_votes")
      .select("caption_id, vote_value, captions!inner(humor_flavor_id)")
      .eq("captions.humor_flavor_id", flavorId);
    if (voteError) {
      return NextResponse.json({ error: voteError.message }, { status: 500 });
    }
    voteRows = fetchedVotes ?? [];
  }

  const upvoteTotals = new Map<string, number>();
  const downvoteTotals = new Map<string, number>();
  voteRows.forEach((row) => {
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

  const sortedIds = [...new Set(upvoteTotals.keys())].sort((a, b) => {
    if (sortBy === "downvotes") {
      return (downvoteTotals.get(b) ?? 0) - (downvoteTotals.get(a) ?? 0);
    }
    return (upvoteTotals.get(b) ?? 0) - (upvoteTotals.get(a) ?? 0);
  });

  const pagedIds = sortedIds.slice(rangeStart, rangeEnd + 1);
  if (pagedIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const { data: pageDetails, error: detailsError } = await supabase
    .from("captions")
    .select(
      "id, content, humor_flavor_id, created_datetime_utc, images!inner(url, image_description)"
    )
    .in("id", pagedIds);

  if (detailsError) {
    return NextResponse.json({ error: detailsError.message }, { status: 500 });
  }

  const detailMap = new Map(
    (pageDetails ?? []).map((row) => [row.id, row])
  );
  const userVotes = await getUserVotesForIds(pagedIds);

  const combined = pagedIds
    .map((id) => {
      const details = detailMap.get(id);
      if (!details) {
        return null;
      }
      const images = details.images;
      const normalizedImage = Array.isArray(images) ? images[0] : images;
      return {
        ...details,
        images: normalizedImage,
        upvote_count: upvoteTotals.get(id) ?? 0,
        downvote_count: downvoteTotals.get(id) ?? 0,
        my_vote: userVotes.get(id) ?? 0,
      };
    })
    .filter((caption): caption is NonNullable<typeof caption> => Boolean(caption))
    .filter((caption) => caption.images?.url);

  return NextResponse.json({ data: combined });
}
