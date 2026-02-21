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
    "social-justice-warrior",
    "corecore-man",
    "russ-hanemann",
    "gigachad",
    "erlich-bachman",
    "dwight-schrute",
    "columbia",
    "pov-pov",
  ]);

  const filtered =
    data?.filter((flavor) => {
      const slug = flavor.slug ?? "";
      return allowedSlugs.has(slug) || slug.startsWith("ter-re-");
    }) ?? [];

  return NextResponse.json({ data: filtered });
}
