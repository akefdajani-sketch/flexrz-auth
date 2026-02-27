"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";

function GoogleSmallMark() {
  // Small multicolor Google mark (not the big default page)
  return (
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
  );
}

export function SignInCard({
  callbackUrl,
  error,
}: {
  callbackUrl: string;
  error?: string | null;
}) {
  const onClick = async () => {
    // Hardening: overwrite the NextAuth callback-url cookie so stale values can't hijack redirects.
    try {
      await fetch(
        `/api/auth/set-callback?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
        }
      );
    } catch {
      // best-effort
    }

    await signIn("google", {
      callbackUrl,
      redirect: true,
    });
  };

  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <div
        style={{
          borderRadius: 18,
          border: "1px solid #e2e8f0",
          background: "#ffffff",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
          padding: "22px 20px 18px",
        }}
      >
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            color: "#94a3b8",
            marginBottom: 6,
          }}
        >
          CUSTOMER SIGN IN
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 8,
            color: "#0f172a",
          }}
        >
          Log in to manage your bookings
        </div>

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: "#64748b",
            marginBottom: 16,
          }}
        >
          Use your Google account to sign in. After that you&apos;ll confirm your
          details and continue to the booking page.
        </div>

        {error ? (
          <div
            style={{
              marginTop: 10,
              marginBottom: 8,
              borderRadius: 12,
              border: "1px solid rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.07)",
              padding: "10px 12px",
              fontSize: 13,
              color: "#7f1d1d",
            }}
          >
            Sign-in failed. Please try again.
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClick}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 999,
            border: "1px solid rgba(15,23,42,0.10)",
            background: "#0f172a",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flex: "0 0 20px",
            }}
          >
            <GoogleSmallMark />
          </span>
          Continue with Google
        </button>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: "#64748b",
          fontSize: 13,
        }}
      >
        <span>Powered by</span>
        <Image
          src="/brand/flexrz-logo-outline-light.svg"
          alt="Flexrz"
          width={58}
          height={18}
          priority
        />
      </div>
    </div>
  );
}
