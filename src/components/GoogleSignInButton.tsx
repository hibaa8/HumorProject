"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  /** Post-login path (must be same-origin, start with /). */
  nextPath?: string;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Client-side OAuth start (humorproject-admin SignInButton pattern). Uses
 * `window.location.origin` so Supabase redirect URLs match the deployed host
 * on Vercel (previews, custom domains).
 */
export default function GoogleSignInButton({
  nextPath = "/jokes",
  className,
  children,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const safeNext =
        nextPath.startsWith("/") && !nextPath.startsWith("//")
          ? nextPath
          : "/jokes";
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button
        type="button"
        onClick={onSignIn}
        disabled={loading}
        className={className}
        style={{
          display: "inline-block",
          padding: "10px 16px",
          borderRadius: "6px",
          background: "#111827",
          color: "#ffffff",
          border: "1px solid #374151",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Redirecting…" : children ?? "Continue with Google"}
      </button>
      {error ? (
        <p style={{ color: "#fca5a5", margin: 0, fontSize: "14px" }}>{error}</p>
      ) : null}
    </div>
  );
}
