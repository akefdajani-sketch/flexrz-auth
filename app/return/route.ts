import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";

function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedHost(hostname: string, allow: string[]): boolean {
  const h = hostname.toLowerCase();

  // Always allow our own domains.
  if (h === "flexrz.com" || h.endsWith(".flexrz.com")) return true;

  // Exact match allowlist entries (recommended).
  if (allow.includes(h)) return true;

  // Optional wildcard entries like "*.example.com"
  for (const entry of allow) {
    if (entry.startsWith("*.")) {
      const suffix = entry.slice(1); // ".example.com"
      if (h.endsWith(suffix)) return true;
    }
  }

  return false;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = url.searchParams.get("to");

  const baseUrl = process.env.NEXTAUTH_URL || "https://auth.flexrz.com";
  const fallback = "https://www.flexrz.com";

  if (!to) return NextResponse.redirect(fallback);

  try {
    const dest = new URL(to);

    // Only allow https destinations.
    if (dest.protocol !== "https:") return NextResponse.redirect(baseUrl);

    const allow = parseAllowlist(process.env.AUTH_CALLBACK_HOST_ALLOWLIST);
    if (!isAllowedHost(dest.hostname, allow)) return NextResponse.redirect(baseUrl);

    // Pull tokens from the current auth session (same-site, so cookies work here).
    const session: any = await getServerSession(authOptions);
    const idToken: string | null = session?.googleIdToken || session?.accessToken || null;

    // If we have a token, pass it as a URL fragment so it doesn't hit logs/proxies as a querystring.
    if (idToken) {
      dest.hash = `id_token=${encodeURIComponent(idToken)}`;
    }

    return NextResponse.redirect(dest.toString());
  } catch {
    return NextResponse.redirect(baseUrl);
  }
}
