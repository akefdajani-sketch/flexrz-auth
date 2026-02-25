import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { SignInCard } from "./SignInCard";

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
  const callbackUrl = sanitizeCallbackUrl(
    searchParams?.callbackUrl,
    searchParams?.from
  );

  const session = await getServerSession(authOptions);
  if (session) {
    redirect(callbackUrl);
  }

  return <SignInCard callbackUrl={callbackUrl} />;
}
