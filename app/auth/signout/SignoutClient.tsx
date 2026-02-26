"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function isAllowedHost(host: string) {
  const h = (host || "").toLowerCase();
  return (
    h === "flexrz.com" ||
    h === "www.flexrz.com" ||
    h.endsWith(".flexrz.com") ||
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h === "127.0.0.1"
  );
}

function decodeMaybe(input: string): string {
  let out = (input || "").trim();
  for (let i = 0; i < 2; i++) {
    try {
      const d = decodeURIComponent(out);
      if (d === out) break;
      out = d;
    } catch {
      break;
    }
  }
  return out;
}

/**
 * Normalize callbackUrl for sign-out.
 * - Supports absolute URLs (allowed hosts only)
 * - Supports relative paths via ?from=<host> (allowed hosts only)
 * - Falls back to https://flexrz.com
 */
function sanitizeCallbackUrl(raw: string | null, fromRaw: string | null): string {
  const fallback = "https://flexrz.com";
  const v = decodeMaybe(raw || "");
  const from = decodeMaybe(fromRaw || "");

  let baseOrigin = fallback;
  if (from) {
    const cleaned = from.replace(/^https?:\/\//i, "").split("/")[0];
    if (isAllowedHost(cleaned)) baseOrigin = `https://${cleaned}`;
  }

  if (!v) return baseOrigin;

  if (v.startsWith("/")) {
    try {
      return new URL(v, baseOrigin).toString();
    } catch {
      return baseOrigin;
    }
  }

  try {
    const u = new URL(v);
    if (isAllowedHost(u.hostname)) return u.toString();
  } catch {
    // ignore
  }

  return baseOrigin;
}

export default function SignoutClient() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const raw =
      searchParams.get("callbackUrl") ||
      searchParams.get("callback") ||
      "";

    const from =
      searchParams.get("from") ||
      "";

    const callbackUrl = sanitizeCallbackUrl(raw, from) || "/auth/signin";

    // Trigger NextAuth signout + redirect
    signOut({ callbackUrl });
  }, [searchParams]);

  return <div style={{ padding: 24 }}>Signing you out…</div>;
}
