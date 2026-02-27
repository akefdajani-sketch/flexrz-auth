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

type NormalizeResult =
  | { ok: true; url: URL }
  | {
      ok: false;
      reason:
        | "missing_to"
        | "invalid_url"
        | "protocol_not_https"
        | "host_not_allowed";
    };

async function normalizeReturnUrl(req: NextRequest, rawTo: string | null): Promise<NormalizeResult> {
  const to = (rawTo || "").trim();
  if (!to) return { ok: false, reason: "missing_to" };

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

    return { ok: true, url: new URL(`https://${baseHost}${to}`) };
  }

  try {
    const u = new URL(to);
    if (u.protocol !== "https:") return { ok: false, reason: "protocol_not_https" };
    const host = u.hostname.toLowerCase();
    const allowed = isAllowedFlexrzHost(host) || (await isRegisteredTenantDomain(host));
    if (!allowed) return { ok: false, reason: "host_not_allowed" };
    return { ok: true, url: u };
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
}
import { getToken } from "next-auth/jwt";

// -----------------------------------------------------------------------------
// Custom-domain login handoff
// -----------------------------------------------------------------------------
// Browsers cannot share cookies between different registrable domains.
// Example: cookies for .flexrz.com are NOT readable by birdiegolf-jo.com.
//
// For tenant custom domains, we "handoff" a short-lived signed token via the
// URL fragment. The custom domain consumes it client-side, calls its own
// /api/customer-session/handoff endpoint, and mints a FIRST-PARTY cookie.
//
// IMPORTANT:
// - We use the URL fragment (#...) so the token is never sent in HTTP requests.
// - Token is short-lived and domain-bound (dest host must match).
// -----------------------------------------------------------------------------

function base64UrlEncode(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlEncodeJson(obj: any) {
  return base64UrlEncode(Buffer.from(JSON.stringify(obj), "utf8"));
}

function hmacSha256(input: string, secret: string) {
  const crypto = require("crypto") as typeof import("crypto");
  return base64UrlEncode(crypto.createHmac("sha256", secret).update(input).digest());
}

function signHs256Jwt(payload: any, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const h = base64UrlEncodeJson(header);
  const p = base64UrlEncodeJson(payload);
  const signingInput = `${h}.${p}`;
  const sig = hmacSha256(signingInput, secret);
  return `${signingInput}.${sig}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawToParam = safeDecode(url.searchParams.get("to") || "");
  // If the caller didn't provide ?to=, fall back to the cookie set by our auth middleware.
  // This is critical for flows where NextAuth loses callbackUrl and tries to send users to '/'.
  const rawToCookie = safeDecode(req.cookies.get("flexrz-return-to")?.value || "");
  const rawTo = (rawToParam || rawToCookie || "");

  const appHost = (process.env.NEXT_PUBLIC_APP_HOST || "app.flexrz.com").toLowerCase();

  // Diagnostic fallback target (Patch Set A / Step 1)
  // If /return cannot normalize/validate the `to=` param, we redirect to Birdie booking
  // with a reason tag so we can identify WHY it fell back.
  const fallback = new URL("https://flexrz.com/book/birdie-golf?dbg_fallback=auth_return_fallback");

  const normalized = await normalizeReturnUrl(req, rawTo);
  const target = normalized.ok
    ? normalized.url
    : (() => {
        fallback.searchParams.set("dbg_reason", normalized.reason);
        return fallback;
      })();

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

  // ---------------------------------------------------------------------------
  // Custom-domain handoff
  // ---------------------------------------------------------------------------
  // If the redirect target is a registered tenant custom domain (NOT *.flexrz.com),
  // we attach a short-lived signed token via URL fragment so that the custom domain
  // can mint its OWN first-party session cookie.
  //
  // We DO NOT rely on cross-site cookie reads (impossible across eTLD+1).
  //
  // Token contents are intentionally minimal and short-lived.
  // ---------------------------------------------------------------------------
  try {
    const host = target.hostname.toLowerCase();
    const isFlexrz = isAllowedFlexrzHost(host);
    const isCustomDomain = !isFlexrz && (await isRegisteredTenantDomain(host));

    if (isCustomDomain && token) {
      const secret = (process.env.BOOKING_HANDOFF_SECRET || process.env.NEXTAUTH_SECRET || "").trim();
      if (secret) {
        const now = Math.floor(Date.now() / 1000);
        const exp = now + 90; // 90 seconds: enough for the browser to land + call handoff

        const googleIdToken = (token as any)?.google_id_token || null;
        const email = (token as any)?.email || (token as any)?.user?.email || null;
        const sub = (token as any)?.sub || null;

        if (googleIdToken) {
          const handoffJwt = signHs256Jwt(
            {
              iss: "auth.flexrz.com",
              aud: "flexrz-booking-handoff",
              iat: now,
              exp,
              dest: `https://${host}`,
              sub,
              email,
              gid: googleIdToken,
            },
            secret
          );

          // Use URL fragment so the token is NOT sent to the server in HTTP requests.
          const currentHash = target.hash ? target.hash.replace(/^#/, "") : "";
          const frag = `flexrz_handoff=${encodeURIComponent(handoffJwt)}`;
          target.hash = currentHash ? `${currentHash}&${frag}` : frag;
        }
      }
    }
  } catch {
    // Never break redirect on handoff failures; custom domain will simply appear logged out.
  }

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
