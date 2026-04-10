import { createSupabaseServerClient } from "@/lib/supabaseServer";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type DashboardCaptionItem = {
  id: string;
  content: string | null;
  createdAt: string | null;
  upvotes: number;
  downvotes: number;
  imageUrl: string | null;
  slug: string | null;
  /** Present on “votes” cards: how you last voted on this caption */
  myVote?: 1 | -1;
};

const VOTE_CHUNK = 120;

async function aggregateVotesByCaption(
  supabase: ServerClient,
  captionIds: string[]
): Promise<{ up: Map<string, number>; down: Map<string, number> }> {
  const up = new Map<string, number>();
  const down = new Map<string, number>();
  if (captionIds.length === 0) return { up, down };

  for (let i = 0; i < captionIds.length; i += VOTE_CHUNK) {
    const chunk = captionIds.slice(i, i + VOTE_CHUNK);
    const { data, error } = await supabase
      .from("caption_votes")
      .select("caption_id, vote_value")
      .in("caption_id", chunk);
    if (error) throw new Error(error.message);
    (data ?? []).forEach((row) => {
      if (row.vote_value === 1) {
        up.set(row.caption_id, (up.get(row.caption_id) ?? 0) + 1);
      } else if (row.vote_value === -1) {
        down.set(row.caption_id, (down.get(row.caption_id) ?? 0) + 1);
      }
    });
  }
  return { up, down };
}

function normalizeImage(
  images: { url: string | null } | { url: string | null }[] | null
): string | null {
  if (!images) return null;
  const row = Array.isArray(images) ? images[0] : images;
  return row?.url ?? null;
}

export async function loadDashboardActivity(
  supabase: ServerClient,
  userId: string
): Promise<{ generated: DashboardCaptionItem[]; voted: DashboardCaptionItem[] }> {
  const { data: voteRows } = await supabase
    .from("caption_votes")
    .select("caption_id, vote_value, created_datetime_utc")
    .eq("profile_id", userId)
    .order("created_datetime_utc", { ascending: false })
    .limit(200);

  const voteCaptionIds = [
    ...new Set((voteRows ?? []).map((r) => r.caption_id)),
  ];

  let votedCaps: {
    id: string;
    content: string | null;
    humor_flavor_id: number | null;
    created_datetime_utc: string | null;
    images: { url: string | null } | { url: string | null }[] | null;
  }[] = [];

  if (voteCaptionIds.length > 0) {
    const { data: caps } = await supabase
      .from("captions")
      .select(
        "id, content, humor_flavor_id, created_datetime_utc, images!inner(url)"
      )
      .in("id", voteCaptionIds);
    votedCaps = caps ?? [];
  }

  const detailById = new Map(votedCaps.map((c) => [c.id, c]));

  const { data: myCaptions } = await supabase
    .from("captions")
    .select(
      "id, content, humor_flavor_id, created_datetime_utc, images!inner(url)"
    )
    .eq("profile_id", userId)
    .order("created_datetime_utc", { ascending: false })
    .limit(100);

  const myList = myCaptions ?? [];

  const flavorIds = [
    ...new Set([
      ...myList.map((c) => c.humor_flavor_id).filter(Boolean),
      ...votedCaps.map((c) => c.humor_flavor_id).filter(Boolean),
    ]),
  ] as number[];

  const { data: flavorRows } =
    flavorIds.length > 0
      ? await supabase.from("humor_flavors").select("id, slug").in("id", flavorIds)
      : { data: [] as { id: number; slug: string | null }[] };

  const slugByFlavorId = new Map(
    (flavorRows ?? []).map((f) => [f.id, f.slug])
  );

  const allCaptionIds = [
    ...new Set([...myList.map((c) => c.id), ...voteCaptionIds]),
  ];

  const { up, down } = await aggregateVotesByCaption(supabase, allCaptionIds);

  const generated: DashboardCaptionItem[] = myList.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.created_datetime_utc,
    upvotes: up.get(c.id) ?? 0,
    downvotes: down.get(c.id) ?? 0,
    imageUrl: normalizeImage(c.images),
    slug: c.humor_flavor_id
      ? slugByFlavorId.get(c.humor_flavor_id) ?? null
      : null,
  }));

  const latestVoteByCaption = new Map<string, 1 | -1>();
  for (const row of voteRows ?? []) {
    if (!latestVoteByCaption.has(row.caption_id)) {
      const v = row.vote_value;
      if (v === 1 || v === -1) {
        latestVoteByCaption.set(row.caption_id, v);
      }
    }
  }

  const voted: DashboardCaptionItem[] = [];
  const seenVoteCaption = new Set<string>();
  for (const row of voteRows ?? []) {
    const cid = row.caption_id;
    if (seenVoteCaption.has(cid)) continue;
    seenVoteCaption.add(cid);

    const cap = detailById.get(cid);
    if (!cap) {
      voted.push({
        id: cid,
        content: null,
        createdAt: null,
        upvotes: up.get(cid) ?? 0,
        downvotes: down.get(cid) ?? 0,
        imageUrl: null,
        slug: null,
        myVote: row.vote_value === 1 || row.vote_value === -1 ? row.vote_value : undefined,
      });
      continue;
    }

    const mv = latestVoteByCaption.get(cid);
    voted.push({
      id: cap.id,
      content: cap.content,
      createdAt: cap.created_datetime_utc,
      upvotes: up.get(cap.id) ?? 0,
      downvotes: down.get(cap.id) ?? 0,
      imageUrl: normalizeImage(cap.images),
      slug: cap.humor_flavor_id
        ? slugByFlavorId.get(cap.humor_flavor_id) ?? null
        : null,
      myVote: mv,
    });
  }

  return { generated, voted };
}
