import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: voteRows, error: voteError } = await supabase
    .from("caption_votes")
    .select("caption_id, vote_value");

  if (voteError) {
    return NextResponse.json({ error: voteError.message }, { status: 500 });
  }

  const voteTotals = new Map<string, number>();
  (voteRows ?? []).forEach((row) => {
    const current = voteTotals.get(row.caption_id) ?? 0;
    voteTotals.set(row.caption_id, current + row.vote_value);
  });

  const topIds = [...voteTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([captionId]) => captionId);

  if (topIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const { data: captions, error: captionError } = await supabase
    .from("captions")
    .select("id, content, humor_flavor_id, images (url, image_description)")
    .in("id", topIds);

  if (captionError) {
    return NextResponse.json({ error: captionError.message }, { status: 500 });
  }

  const enriched = (captions ?? [])
    .map((caption) => ({
      ...caption,
      vote_count: voteTotals.get(caption.id) ?? 0,
    }))
    .sort((a, b) => (voteTotals.get(b.id) ?? 0) - (voteTotals.get(a.id) ?? 0));

  return NextResponse.json({ data: enriched });
}
