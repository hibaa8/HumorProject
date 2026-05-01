import Link from "next/link";
import LogoutButton from "@/app/components/LogoutButton";

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
        <Link href="/dashboard" className="nav-text-link">
          Dashboard
        </Link>
        <Link href="/jokes" className="nav-text-link">
          Browse
        </Link>
        <Link href="/stats" className="nav-text-link">
          Flavor stats
        </Link>
        <Link href="/activity" className="nav-text-link">
          Your activity
        </Link>
        <Link href="/generate" className="nav-pill-primary">
          Generate captions
        </Link>
      </div>
      <LogoutButton className="nav-pill-outline" />
    </nav>
  );
}
