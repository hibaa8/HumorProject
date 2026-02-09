export default function LoginPage() {
  const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;

  return (
    <main style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Sign in</h1>
      <p>Sign in with Google to access the app.</p>
      {!googleClientId ? (
        <p style={{ color: "#b91c1c" }}>
          Missing GOOGLE_OAUTH_CLIENT_ID in environment variables.
        </p>
      ) : null}
      <a
        href="/auth/signin"
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
        Continue with Google
      </a>
    </main>
  );
}
