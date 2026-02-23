import { NextRequest, NextResponse } from "next/server";

// Hosts we will allow redirecting *to*.
//
// Security: prevents open redirects.
// Keep this explicit and validated.
const ALLOWED_HOST_SUFFIXES = [".flexrz.com"]; // app.flexrz.com, owner.flexrz.com, etc.

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function isAllowedHost(hostname: string) {
  const h = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((s) => h === s.slice(1) || h.endsWith(s));
}

function normalizeReturnUrl(req: NextRequest, rawTo: string | null) {
  const to = (rawTo || "").trim();
  if (!to) return null;

  // Support both absolute URLs and relative paths.
  // Relative paths will be treated as relative to app.flexrz.com by default.
  if (to.startsWith("/")) {
    const appHost = process.env.NEXT_PUBLIC_APP_HOST || "app.flexrz.com";
    return new URL(`https://${appHost}${to}`);
  }

  try {
    const u = new URL(to);
    if (!isAllowedHost(u.hostname)) return null;
    if (u.protocol !== "https:") return null;
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
  const target = normalizeReturnUrl(req, rawTo) ?? fallback;

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
