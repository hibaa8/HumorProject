import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    captionId?: string;
    voteValue?: number;
  };

  const captionId = body.captionId?.trim();
  const voteValue = body.voteValue;

  if (!captionId || (voteValue !== 1 && voteValue !== -1)) {
    return NextResponse.json({ error: "Invalid vote payload." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 403 });
  }

  const { data: existingVote, error: existingError } = await supabase
    .from("caption_votes")
    .select("vote_value")
    .eq("profile_id", user.id)
    .eq("caption_id", captionId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("caption_votes")
    .upsert(
      {
        created_datetime_utc: now,
        modified_datetime_utc: now,
        vote_value: voteValue,
        profile_id: user.id,
        caption_id: captionId,
      },
      { onConflict: "profile_id,caption_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let upvoteDelta = 0;
  let downvoteDelta = 0;

  let unchanged = false;
  if (!existingVote) {
    if (voteValue === 1) {
      upvoteDelta = 1;
    } else {
      downvoteDelta = 1;
    }
  } else if (existingVote.vote_value !== voteValue) {
    if (voteValue === 1) {
      upvoteDelta = 1;
      downvoteDelta = -1;
    } else {
      upvoteDelta = -1;
      downvoteDelta = 1;
    }
  } else {
    unchanged = true;
  }

  return NextResponse.json({
    ok: true,
    upvoteDelta,
    downvoteDelta,
    unchanged,
    myVote: voteValue,
  });
}
