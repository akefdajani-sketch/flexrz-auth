import { NextRequest, NextResponse } from "next/server";

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

// Security: prevent open redirects.
// Allow:
//   - *.flexrz.com (and flexrz.com)
//   - Any tenant custom domain registered as ACTIVE in the backend (tenant_domains)
function isAllowedFlexrzHost(hostname: string) {
  const h = (hostname || "").toLowerCase();
  return h === "flexrz.com" || h === "www.flexrz.com" || h.endsWith(".flexrz.com");
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
    const slug = (json?.tenantSlug || json?.slug || "").toString().trim();
    return !!slug;
  } catch {
    return false;
  }
}

async function normalizeReturnUrl(req: NextRequest, rawTo: string | null) {
  const to = (rawTo || "").trim();
  if (!to) return null;

  // Support both absolute URLs and relative paths.
  // Relative paths will be treated as relative to:
  //   - ?from=<host> if provided AND allowed, else
  //   - app.flexrz.com by default.
  if (to.startsWith("/")) {
    const from = (req.nextUrl.searchParams.get("from") || "").trim().toLowerCase();
    const appHost = (process.env.NEXT_PUBLIC_APP_HOST || "app.flexrz.com").toLowerCase();

    const baseHost =
      from && (isAllowedFlexrzHost(from) || (await isRegisteredTenantDomain(from)))
        ? from
        : appHost;

    return new URL(`https://${baseHost}${to}`);
  }

  try {
    const u = new URL(to);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    const allowed = isAllowedFlexrzHost(host) || (await isRegisteredTenantDomain(host));
    if (!allowed) return null;
    return u;
  } catch {
    return null;
  }
}
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawTo = safeDecode(url.searchParams.get("to") || "");

  const appHost = (process.env.NEXT_PUBLIC_APP_HOST || "app.flexrz.com").toLowerCase();
  const fallback = new URL("https://flexrz.com");
  const target = (await normalizeReturnUrl(req, rawTo)) ?? fallback;

  // If the caller only provided the app *root* (or /tenant), we can still
  // land them on the correct tenant by using the cookie set by app.flexrz.com.
  if (target.hostname.toLowerCase() === appHost) {
    const p = target.pathname || "/";
    const isRootish = p === "/" || p === "" || p === "/tenant" || p === "/tenant/";
    if (isRootish) {
      const slug = (req.cookies.get("flexrz_last_tenant")?.value || "").trim();
      if (slug) {
        target.pathname = `/tenant/${encodeURIComponent(slug)}`;
      }
    }
  }

  // Read the NextAuth JWT directly from cookies in THIS request
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // IMPORTANT:
  // Do NOT forward Google id_tokens via URL fragments (/#id_token=...).
  // Fragments are never sent to the server and they cause the exact symptom
  // you are seeing: landing on app.flexrz.com/#id_token=... with routing broken.
  //
  // The canonical approach here is:
  //   1) NextAuth sets a session cookie for Domain=.flexrz.com (configured in auth)
  //   2) app.flexrz.com reads the shared session cookie (consumer) via next-auth/jwt getToken()
  //
  // So we ignore the Google id token here and simply redirect.
  void token;

  return NextResponse.redirect(target.toString(), 302);
}
