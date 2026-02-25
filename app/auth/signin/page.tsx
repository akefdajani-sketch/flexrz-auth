import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { SignInCard } from "./SignInCard";
import { headers } from "next/headers";

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

function safeDecode(v: string) {
  if (!v) return "";
  // Decode once, but never throw.
  // (callbackUrl often arrives encoded from upstream redirect hops.)
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function sanitizeCallbackUrl(raw: unknown, fromRaw: unknown): string {
  // Next.js searchParams values are not guaranteed to be decoded.
  // In practice, callbackUrl often arrives as an encoded absolute URL
  // (e.g. https%3A%2F%2Fflexrz.com%2Fbook%2Fbirdie-golf). If we don't decode it,
  // new URL(v) throws and we fall back to the base origin, causing the
  // post-login redirect to land on https://flexrz.com instead of /book/<slug>.
  const v = safeDecode(typeof raw === "string" ? raw : "");
  const from = safeDecode(typeof fromRaw === "string" ? fromRaw : "");

  // Default safe landing
  const fallback = "https://flexrz.com";

  // Determine base origin for relative callbackUrls.
  // Priority:
  // 1) explicit "from" param (set by booking-frontend)
  // 2) fallback to flexrz.com
  let baseOrigin = fallback;
  if (from) {
    const cleanedFrom = from.replace(/^https?:\/\//i, "").split("/")[0];
    if (isAllowedHost(cleanedFrom)) {
      baseOrigin = `https://${cleanedFrom}`;
    }
  }

  if (!v) return baseOrigin;

  // Relative → resolve against the initiating origin
  if (v.startsWith("/")) {
    try {
      return new URL(v, baseOrigin).toString();
    } catch {
      return baseOrigin;
    }
  }

  // Absolute → allow only flexrz.com + subdomains (+ local dev)
  try {
    const u = new URL(v);
    if (isAllowedHost(u.hostname)) return v;
  } catch {
    // ignore
  }

  return baseOrigin;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string; from?: string };
}) {
  // Primary: use callbackUrl/from query params.
  let callbackUrl = sanitizeCallbackUrl(searchParams?.callbackUrl, searchParams?.from);

  // If callbackUrl isn't provided (e.g. user navigated to /auth/signin directly from a deep link),
  // recover the originating URL from Referer so post-login returns to /book/... instead of '/'.
  if (!searchParams?.callbackUrl) {
    const ref = headers().get("referer");
    if (ref) {
      callbackUrl = sanitizeCallbackUrl(ref, searchParams?.from || ref);
    }
  }

  const session = await getServerSession(authOptions);
  if (session) {
    redirect(callbackUrl);
  }

  return <SignInCard callbackUrl={callbackUrl} />;
}
