import { NextResponse } from "next/server";
import { isFlavorIncluded } from "@/lib/humorFlavorFilters";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("humor_flavors")
    .select("id, slug, description")
    .order("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: captionRows, error: captionError } = await supabase
    .from("captions")
    .select("humor_flavor_id");

  if (captionError) {
    return NextResponse.json({ error: captionError.message }, { status: 500 });
  }

  const flavorIdsWithCaptions = new Set(
    (captionRows ?? [])
      .map((row) => row.humor_flavor_id)
      .filter((id): id is number => Boolean(id))
  );

  const filtered =
    data?.filter((flavor) =>
      isFlavorIncluded(flavor.slug, flavor.id, flavorIdsWithCaptions)
    ) ?? [];

  return NextResponse.json({ data: filtered });
}
