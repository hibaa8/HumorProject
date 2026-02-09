import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const flavorIdParam = searchParams.get("flavorId");
  const offsetParam = searchParams.get("offset");
  const limitParam = searchParams.get("limit");

  const flavorId = flavorIdParam ? Number(flavorIdParam) : NaN;
  const offset = offsetParam ? Number(offsetParam) : 0;
  const limit = limitParam ? Number(limitParam) : 10;

  if (!Number.isFinite(flavorId)) {
    return NextResponse.json(
      { error: "Missing or invalid flavorId." },
      { status: 400 }
    );
  }

  const rangeStart = Math.max(0, offset);
  const rangeEnd = rangeStart + Math.max(1, limit) - 1;

  const { data, error } = await supabase
    .from("captions")
    .select("id, content, humor_flavor_id, images (url, image_description)")
    .eq("humor_flavor_id", flavorId)
    .order("created_datetime_utc", { ascending: false })
    .range(rangeStart, rangeEnd);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
