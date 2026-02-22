"use client";

import * as React from "react";
import { signIn } from "next-auth/react";

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function first(v: string | string[] | undefined): string {
  if (!v) return "";
  return Array.isArray(v) ? v[0] || "" : v;
}

function safeNormalizeCallbackUrl(raw: string, fromHost: string): string {
  const callbackUrl = raw || "";

  // Absolute URL → trust NextAuth redirect callback to allow/deny.
  if (/^https?:\/\//i.test(callbackUrl)) return callbackUrl;

  // Relative path → normalize to the initiator host.
  // The booking app is on app.flexrz.com, owner dashboard is on owner.flexrz.com.
  const host = (fromHost || "").toLowerCase();
  const base = host === "owner.flexrz.com" ? "https://owner.flexrz.com" : "https://app.flexrz.com";
  const path = callbackUrl.startsWith("/") ? callbackUrl : "/";
  return `${base}${path}`;
}

export default function SignInPage({ searchParams }: Props) {
  const rawCb = first(searchParams?.callbackUrl);
  const from = first(searchParams?.from);

  const callbackUrl = React.useMemo(() => safeNormalizeCallbackUrl(rawCb, from), [rawCb, from]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "system-ui",
        background: "linear-gradient(180deg, #0b1220 0%, #070c16 100%)",
      }}
    >
      <div
        style={{
          width: "min(560px, 92vw)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.06)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          padding: 22,
        }}
      >
        <div style={{ marginBottom: 14, color: "rgba(255,255,255,0.90)" }}>
          <div style={{ fontSize: 12, letterSpacing: 0.6, opacity: 0.8 }}>CUSTOMER SIGN IN</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>Log in to manage your bookings</div>
          <div style={{ fontSize: 14, marginTop: 8, opacity: 0.85, lineHeight: 1.4 }}>
            Use your Google account to sign in. After that you&apos;ll continue to your dashboard.
          </div>
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl }, { prompt: "select_account" })}
          style={{
            width: "100%",
            height: 46,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "#0f172a",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 650,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <span style={{ display: "inline-flex", width: 18, height: 18, borderRadius: 4, background: "#fff" }} />
          Continue with Google
        </button>

        <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, opacity: 0.75, color: "rgba(255,255,255,0.85)" }}>
          Powered by Flexrz
        </div>
      </div>
    </main>
  );
}
