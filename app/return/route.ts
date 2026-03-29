import { NextRequest, NextResponse } from "next/server";

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

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
//
// For tenant custom domains we "handoff" a short-lived signed token via the
// URL fragment (#flexrz_handoff=...). The custom domain consumes it client-side,
// calls its own /api/customer-session/handoff endpoint, and mints a FIRST-PARTY
// cookie on that domain.
//
// Token payload now includes BOTH:
//   gid  — Google ID token (backward compat for old bf_session readers)
//   app  — Flexrz App JWT (long-lived, ~30 days, used by requireAppAuth)
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
  const rawToCookie = safeDecode(req.cookies.get("flexrz-return-to")?.value || "");
  const rawTo = (rawToParam || rawToCookie || "");

  const appHost = (process.env.NEXT_PUBLIC_APP_HOST || "app.flexrz.com").toLowerCase();

  const fallback = new URL("https://flexrz.com/book/birdie-golf?dbg_fallback=auth_return_fallback");

  const normalized = await normalizeReturnUrl(req, rawTo);
  const target = normalized.ok
    ? normalized.url
    : (() => {
        fallback.searchParams.set("dbg_reason", normalized.reason);
        return fallback;
      })();

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

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // ---------------------------------------------------------------------------
  // Custom-domain handoff — include both gid (backward compat) and app (new)
  // ---------------------------------------------------------------------------
  try {
    const host = target.hostname.toLowerCase();
    const isFlexrz = isAllowedFlexrzHost(host);
    const isCustomDomain = !isFlexrz && (await isRegisteredTenantDomain(host));

    if (isCustomDomain && token) {
      const secret = (process.env.BOOKING_HANDOFF_SECRET || process.env.NEXTAUTH_SECRET || "").trim();
      if (secret) {
        const now = Math.floor(Date.now() / 1000);
        const exp = now + 90; // 90 seconds: bridge token only

        const googleIdToken = (token as any)?.google_id_token || null;
        // NEW: Flexrz App JWT — long-lived token for backend API auth
        const appJwt = (token as any)?.app_jwt || null;
        const email = (token as any)?.email || (token as any)?.user?.email || null;
        const sub = (token as any)?.sub || null;
        const name = (token as any)?.name || null;

        // Only hand off if we have at least one usable auth token
        if (googleIdToken || appJwt) {
          const handoffJwt = signHs256Jwt(
            {
              iss: "auth.flexrz.com",
              aud: "flexrz-booking-handoff",
              iat: now,
              exp,
              dest: `https://${host}`,
              sub,
              email,
              name,
              // Both tokens included — handoff receiver stores whichever is present
              gid: googleIdToken,   // backward compat (short-lived, ~1hr)
              app: appJwt,          // NEW: long-lived Flexrz App JWT (30 days)
            },
            secret
          );

          const currentHash = target.hash ? target.hash.replace(/^#/, "") : "";
          const frag = `flexrz_handoff=${encodeURIComponent(handoffJwt)}`;
          target.hash = currentHash ? `${currentHash}&${frag}` : frag;
        }
      }
    }
  } catch {
    // Never break redirect on handoff failures; custom domain will simply appear logged out.
  }

  void token;

  return NextResponse.redirect(target.toString(), 302);
}
