import Link from "next/link";

export default function Navbar() {
  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <Link href="/jokes" className="nav-text-link">
          Home
        </Link>
        <Link href="/dashboard" className="nav-text-link">
          Dashboard
        </Link>
        <Link href="/stats" className="nav-text-link">
          Flavor stats
        </Link>
        <Link href="/generate" className="nav-pill-primary">
          Generate captions
        </Link>
      </div>
      <Link href="/auth/logout" className="nav-pill-outline">
        Log out
      </Link>
    </nav>
  );
}
