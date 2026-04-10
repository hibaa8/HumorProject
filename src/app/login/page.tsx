import GoogleSignInButton from "@/components/GoogleSignInButton";
import { getSafeInternalPath } from "@/lib/authRedirect";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_start_failed: "Could not start Google sign-in. Try again.",
  oauth_exchange_failed: "Sign-in did not complete. Try again.",
  missing_code: "Sign-in was cancelled or interrupted.",
};

type Props = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const errorKey = params.error;
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] ?? errorKey : null;
  const nextPath = getSafeInternalPath(params.next, "/jokes");

  return (
    <main style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Sign in</h1>
      <p>Sign in with Google to access the app.</p>
      {errorMessage ? (
        <p style={{ color: "#fca5a5", marginTop: "8px" }} role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div style={{ marginTop: "12px" }}>
        <GoogleSignInButton nextPath={nextPath} />
      </div>
      <p style={{ marginTop: "20px", fontSize: "14px", color: "#94a3b8" }}>
        Trouble on a preview URL? Add that exact URL to Supabase Auth → URL
        configuration (redirect allow list).
      </p>
    </main>
  );
}
