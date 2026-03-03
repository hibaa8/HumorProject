import { NextResponse } from "next/server";
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

  const allowedSlugs = new Set([
    "nature-documentary",
    "gen-z-dark-roast",
    "corecore-man",
    "russ-hanemann",
    "gigachad",
    "dwight-schrute",
    "columbia",
    "pov-pov",
  ]);

  const excludedSlugs = new Set(["erlich-bachman", "social-justice-warrior"]);

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
    data?.filter((flavor) => {
      const slug = flavor.slug ?? "";
      if (excludedSlugs.has(slug)) {
        return false;
      }
      const isRequired =
        allowedSlugs.has(slug) || slug.startsWith("ter-re-");
      if (isRequired) {
        return true;
      }
      return flavorIdsWithCaptions.has(flavor.id);
    }) ?? [];

  return NextResponse.json({ data: filtered });
}
