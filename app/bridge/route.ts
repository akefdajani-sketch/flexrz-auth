import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Security: allow returning to *.flexrz.com, plus any custom domain registered to a tenant.
const ALLOWED_HOST_SUFFIXES = [".flexrz.com"];

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function isAllowedFlexrzHost(hostname: string) {
  const h = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((s) => h === s.slice(1) || h.endsWith(s));
}

function getBackendBase(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    ""
  ).trim();
}

async function isRegisteredTenantDomain(hostname: string): Promise<boolean> {
  const backend = getBackendBase();
  if (!backend) return false;
  try {
    const u = new URL("/api/tenant-domains/_public/resolve", backend);
    u.searchParams.set("domain", hostname);
    const res = await fetch(u.toString(), { next: { revalidate: 60 } });
    if (!res.ok) return false;
    const json = (await res.json()) as any;
    const slug = (json?.slug || json?.tenantSlug || "").toString().trim();
    return !!slug;
  } catch {
    return false;
  }
}

function pickGoogleToken(decoded: any): string | null {
  if (!decoded) return null;
  return (
    decoded.google_id_token ||
    decoded.googleIdToken ||
    decoded.id_token ||
    decoded.google_access_token ||
    decoded.accessToken ||
    decoded.access_token ||
    null
  );
}

/**
 * Bridge flow for custom tenant domains.
 *
 * booking domain -> https://auth.flexrz.com/bridge?returnTo=https://tenant-domain.com/book/slug
 * - if not signed in -> redirect to /auth/signin (callback back here)
 * - if signed in -> redirect back with #id_token=...
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  // Prefer explicit returnTo, but also support other common param/cookie names.
  const sp = url.searchParams;
  const cookieCallbackUrl =
    req.cookies.get("__Secure-next-auth.callback-url")?.value ||
    req.cookies.get("next-auth.callback-url")?.value ||
    "";

  const rawReturnTo = safeDecode(
    sp.get("returnTo") ||
      sp.get("return") ||
      sp.get("to") ||
      sp.get("callbackUrl") ||
      cookieCallbackUrl ||
      ""
  );

  let returnTo: URL | null = null;
  try {
    const u = new URL(rawReturnTo);
    if (u.protocol !== "https:") returnTo = null;
    else returnTo = u;
  } catch {
    returnTo = null;
  }

  if (!returnTo) return NextResponse.redirect("https://flexrz.com", 302);

  const host = returnTo.hostname.toLowerCase();
  const allowed = isAllowedFlexrzHost(host) || (await isRegisteredTenantDomain(host));
  if (!allowed) return NextResponse.redirect("https://flexrz.com", 302);

  const decoded = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const token = pickGoogleToken(decoded);

  if (!token) {
    const cb = encodeURIComponent(
      `${url.origin}/bridge?returnTo=${encodeURIComponent(returnTo.toString())}`
    );
    return NextResponse.redirect(`${url.origin}/auth/signin?callbackUrl=${cb}`, 302);
  }

  const dest = new URL(returnTo.toString());
  dest.hash = `id_token=${encodeURIComponent(token)}`;
  return NextResponse.redirect(dest.toString(), 302);
}
