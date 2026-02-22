"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { redirectToCentralGoogleAuth } from "@/lib/auth/redirectToCentralAuth";

export default function AuthSignInClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Where to send the user after login
  const cookieLastTenant = (() => {
    try {
      const m = document.cookie.match(/(?:^|;\s*)flexrz_last_tenant=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : "";
    } catch {
      return "";
    }
  })();

  const rawCallbackUrl = searchParams.get("callbackUrl") || "/";
  // If someone hits /auth/signin without a callbackUrl (common from app root),
  // send them to their last visited tenant (if we have it).
  const callbackUrl =
    (rawCallbackUrl === "/" || rawCallbackUrl === "") && cookieLastTenant
      ? `/tenant/${cookieLastTenant}`
      : rawCallbackUrl;

  const returnUrl =
    callbackUrl.startsWith("http://") || callbackUrl.startsWith("https://")
      ? callbackUrl
      : `${window.location.origin}${callbackUrl.startsWith("/") ? "" : "/"}${callbackUrl}`;

  const { data: session, status } = useSession();

  // If already authenticated, go straight to the callback URL
  useEffect(() => {
      if (status !== "authenticated") return;

      const tokenError = (session as any)?.tokenError as string | null;
      if (tokenError === "google_token_expired") {
        signOut({
          callbackUrl: `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        });
        return;
      }

      router.replace(callbackUrl);
  }, [status, callbackUrl, router, session]);

  const loading = status === "loading";
  const authed = status === "authenticated";

  if (loading || authed) {
    // Simple "bridge" screen while checking / redirecting
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#f8fafc",
          color: "#020617",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 360,
            width: "100%",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
            padding: "20px 18px",
            fontSize: 14,
          }}
        >
          Checking your account…
        </div>
      </main>
    );
  }

  // Not authenticated → show the customer login portal
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#f8fafc",
        color: "#020617",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ maxWidth: 380, width: "100%" }}>
        <div
          style={{
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
            padding: "20px 18px 18px",
          }}
        >
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#94a3b8",
            marginBottom: 4,
          }}
        >
          Customer sign in
        </div>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          Log in to manage your bookings
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "#64748b",
            marginBottom: 16,
          }}
        >
          Use your Google account to sign in. After that you&apos;ll confirm
          your details and continue to the booking page.
        </p>

        <button
          type="button"
          onClick={() => redirectToCentralGoogleAuth(returnUrl)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 999,
            border: "1px solid #e2e8f0",
            background: "#0f172a",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flex: "0 0 18px",
            }}
          >
            {/* Google "G" mark (inline SVG). */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 50 50"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Google"
            >
              <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303C33.708 32.656 29.233 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.047 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
              />
              <path
                fill="#FF3D00"
                d="M6.306 14.691l6.571 4.819C14.655 16.108 19.01 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.047 6.053 29.268 4 24 4c-7.682 0-14.334 4.337-17.694 10.691z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.213 0-9.676-3.326-11.289-7.946l-6.52 5.02C9.518 39.556 16.227 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303c-.781 2.184-2.258 4.044-4.084 5.238l.003-.002 6.19 5.238C36.98 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
              />
            </svg>
          </span>
          Continue with Google
        </button>

        </div>

        {/* Powered by Flexrz */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "#64748b",
            fontSize: 14,
          }}
        >
          <span>Powered by</span>
          <img
            src="/brand/flexrz-logo-outline-light.svg"
            alt="Flexrz"
            style={{ height: 16, width: "auto", display: "block" }}
          />
        </div>
      </div>
    </main>
  );
}
