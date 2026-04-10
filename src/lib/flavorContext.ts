/**
 * Curated “how it works” copy for humor flavors (user study: names alone were unclear).
 * Falls back to DB description when no entry exists.
 */
export function getFlavorHowItWorks(
  slug: string | null,
  dbDescription: string | null
): string {
  const s = slug ?? "";
  if (s.startsWith("ter-re-")) {
    return (
      "Research-oriented variant of the ter-re pipeline: same core multi-step flow " +
      "with different prompts or context (e.g. sidechat, pop culture). Expect " +
      "experiment-style humor that may shift tone run to run."
    );
  }
  const map: Record<string, string> = {
    "nature-documentary":
      "Treats the scene like a wildlife documentary: identify the subject, set the " +
      "‘habitat,’ then narrate in a calm, observational voice—often deadpan contrast " +
      "with what’s actually happening.",
    "gen-z-dark-roast":
      "Typically a multi-step pipeline (e.g. recognition → image read → punchy Gen Z " +
      "caption). Tends toward ironic, hyper-online roast energy rather than setup/punchline jokes.",
    "corecore-man":
      "Gen-Z ‘corecore’ vibe: short, fragmented, emotionally loaded lines that feel " +
      "like a meme caption or TikTok overlay more than a traditional joke.",
    "russ-hanemann":
      "Silicon Valley–style absurdity and tech-bro ego—references to startups, hype, " +
      "and self-importance played for cringe comedy.",
    gigachad:
      "Hyper-confident ‘sigma’ / gigachad persona: over-the-top self-assurance and " +
      "mock-heroic statements about mundane moments.",
    "dwight-schrute":
      "Office-style deadpan: treats ordinary situations like high-stakes survival or " +
      "competition; rules, rank, and beet-farm energy.",
    columbia:
      "Campus / Ivy-adjacent tone: academic ambition, social dynamics, and subtle " +
      "roast of student life (varies with the underlying prompt chain).",
    "pov-pov":
      "First-person POV captions: reads like you’re inside someone’s head narrating " +
      "the moment, often for comedic contrast with the image.",
  };
  return map[s] ?? dbDescription ?? "Flavor-specific pipeline; try a few captions to feel the tone.";
}
