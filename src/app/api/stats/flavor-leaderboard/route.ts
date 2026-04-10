import { NextResponse } from "next/server";
import { computeFlavorStatsForViewer } from "@/lib/humorFlavorStatsServer";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await computeFlavorStatsForViewer(supabase, user.id);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, flavorError: result.flavorError },
      { status: 500 }
    );
  }

  return NextResponse.json({
    viewerId: result.viewerId,
    ...result.payload,
  });
}
