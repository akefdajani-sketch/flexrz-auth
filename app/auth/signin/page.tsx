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

  // Compute a safe default return URL (prefer full `from` incl. path)
  let defaultReturn = fallback;
  if (from) {
    try {
      // `from` may already be a full URL like https://flexrz.com/book/birdie-golf
      const u = new URL(from);
      if (isAllowedHost(u.hostname)) {
        defaultReturn = u.toString();
      }
    } catch {
      // `from` might be just a hostname (legacy)
      const cleanedHost = from.replace(/^https?:\/\//i, "").split("/")[0];
      if (isAllowedHost(cleanedHost)) {
        defaultReturn = `https://${cleanedHost}`;
      }
    }
  }

  // Determine base origin for resolving relative callbackUrls
  let baseOrigin = fallback;
  try {
    baseOrigin = new URL(defaultReturn).origin;
  } catch {
    baseOrigin = fallback;
  }

  // If callbackUrl missing, return to where the flow started (not always /)
  if (!v) return defaultReturn;

  // Absolute callbackUrl: only allow our domains + localhost
  try {
    const u = new URL(v);
    if (isAllowedHost(u.hostname)) return u.toString();
    return defaultReturn;
  } catch {
    // Not absolute → handle relative forms below
  }

  // Relative callbackUrl (starts with /)
  if (v.startsWith("/")) {
    try {
      return new URL(v, baseOrigin).toString();
    } catch {
      return defaultReturn;
    }
  }

  // Other relative (e.g. "book/birdie-golf" or "?x=y") → resolve against baseOrigin
  try {
    return new URL(v, baseOrigin + "/").toString();
  } catch {
    return defaultReturn;
  }
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
