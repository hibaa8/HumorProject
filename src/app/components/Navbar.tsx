export default function Navbar() {
  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
      }}
    >
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <a
          href="/jokes"
          style={{ color: "#f9fafb", textDecoration: "none", fontWeight: 600 }}
        >
          Home
        </a>
        <a
          href="/generate"
          style={{ color: "#f9fafb", textDecoration: "none" }}
        >
          Generate captions
        </a>
      </div>
      <a
        href="/auth/logout"
        style={{
          color: "#f9fafb",
          textDecoration: "none",
          border: "1px solid #1f2937",
          padding: "6px 12px",
          borderRadius: "999px",
        }}
      >
        Log out
      </a>
    </nav>
  );
}
