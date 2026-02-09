import CaptionBrowser from "@/app/CaptionBrowser";

export default function Home() {
  return (
    <main style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Captions by Humor Flavor</h1>
      <CaptionBrowser />
    </main>
  );
}
