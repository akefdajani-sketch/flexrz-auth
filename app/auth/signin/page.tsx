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

function sanitizeCallbackUrl(raw: unknown, fromRaw: unknown): string {
  const v = typeof raw === "string" ? raw : "";
  const from = typeof fromRaw === "string" ? fromRaw : "";

  // Default safe landing
  const fallback = "https://flexrz.com";

  // Determine base origin for relative callbackUrls.
  // Priority:
  // 1) explicit "from" param (set by redirectToCentralGoogleAuth)
  // 2) fallback to flexrz.com
  let baseOrigin = fallback;
  if (from) {
    const cleanedFrom = from.replace(/^https?:\/\//i, "").split("/")[0];
    if (isAllowedHost(cleanedFrom)) {
      baseOrigin = `https://${cleanedFrom}`;
    }
  }

  if (!v) return baseOrigin;

  // Relative → resolve against the initiating origin (NOT always app.flexrz.com)
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
    // Next 16: `headers()` is async.
    const h = await headers();
    const ref = h.get("referer");
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
