"use client";

import { useState } from "react";

/**
 * Full navigation to `/auth/logout` so the Route Handler can clear all `sb-*`
 * session cookies on the response. Client-only `signOut()` often leaves
 * chunked cookies that still satisfy `getSession()` in `proxy.ts`.
 */
export default function LogoutButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    setLoading(true);
    window.location.assign("/auth/logout");
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={className}
      style={{ cursor: loading ? "wait" : "pointer" }}
    >
      {loading ? "Logging out…" : "Log out"}
    </button>
  );
}
