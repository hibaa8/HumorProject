export default function Home() {
  return (
    <main style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Welcome</h1>
      <p>Please sign in to view jokes by humor flavor.</p>
      <a
        href="/login"
        style={{
          display: "inline-block",
          marginTop: "12px",
          padding: "10px 16px",
          borderRadius: "6px",
          background: "#111827",
          color: "#ffffff",
          textDecoration: "none",
        }}
      >
        Go to login
      </a>
    </main>
  );
}
