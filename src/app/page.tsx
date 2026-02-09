import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: newsSnippets, error } = await supabase
    .from("news_snippets")
    .select("id, headline, category, source_url, priority, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <main style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Supabase News Snippets</h1>
      {error ? (
        <p>Unable to load data from Supabase: {error.message}</p>
      ) : newsSnippets && newsSnippets.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px" }}>Headline</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Category</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Priority</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Active</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {newsSnippets.map((snippet) => (
              <tr key={snippet.id}>
                <td style={{ padding: "8px", borderTop: "1px solid #e5e7eb" }}>
                  {snippet.headline}
                </td>
                <td style={{ padding: "8px", borderTop: "1px solid #e5e7eb" }}>
                  {snippet.category}
                </td>
                <td style={{ padding: "8px", borderTop: "1px solid #e5e7eb" }}>
                  {snippet.priority ?? "—"}
                </td>
                <td style={{ padding: "8px", borderTop: "1px solid #e5e7eb" }}>
                  {snippet.is_active ? "Yes" : "No"}
                </td>
                <td style={{ padding: "8px", borderTop: "1px solid #e5e7eb" }}>
                  {snippet.source_url ? (
                    <a href={snippet.source_url}>Link</a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No rows found in `news_snippets`. Check RLS policies and table data.</p>
      )}
    </main>
  );
}
