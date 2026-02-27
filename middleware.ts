import { NextRequest, NextResponse } from "next/server";

function resolveAndValidateReturnTo(raw: string): string | null {
  try {
    // Allow relative paths (e.g. "/book/birdie-golf") by resolving against flexrz.com.
    const candidateUrl = raw.startsWith("/")
      ? new URL(raw, "https://flexrz.com")
      : new URL(raw);

    const host = candidateUrl.hostname.toLowerCase();

    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".localhost");

    const isFlexrz =
      host === "flexrz.com" ||
      host.endsWith(".flexrz.com");

    if (!isLocal && !isFlexrz) return null;

    // Prevent protocol downgrade
    if (!isLocal && candidateUrl.protocol !== "https:") return null;

    return candidateUrl.toString();
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // 0) Safety net: if something redirects users to auth.flexrz.com/tenant/*,
  // bounce them back to the tenant dashboard host (app.flexrz.com by default).
  // This prevents 404s on sign-out flows where callbackUrl accidentally preserves the /tenant path.
  if (pathname === "/tenant" || pathname.startsWith("/tenant/")) {
    const appHost = (process.env.NEXT_PUBLIC_APP_HOST || "app.flexrz.com").toLowerCase();
    const currentHost = (req.headers.get("host") || "").toLowerCase();

    // Avoid loops if middleware runs on the app host for some reason.
    if (currentHost && currentHost !== appHost) {
      const dest = new URL(req.nextUrl.toString());
      dest.hostname = appHost;
      dest.protocol = "https:";
      return NextResponse.redirect(dest, 302);
    }
  }


  const common = {
    path: "/",
    sameSite: "lax" as const,
    secure: true,
    domain: ".flexrz.com",
  };

  // 1) OAuth callback: re-assert the callback-url cookie using the SAME-ORIGIN
  // callbackUrl we stored during /auth/signin (flexrz-callback-url).
  // This ensures NextAuth never tries to redirect cross-domain directly.
  if (pathname.startsWith("/api/auth/callback/")) {
    // At callback stage, NextAuth will decide where to redirect based on its callback-url cookie.
    // We ensure that cookie is ALWAYS set to a same-origin "/return?to=..." URL.
    let cb = req.cookies.get("flexrz-callback-url")?.value;

    // If legacy flow didn't set flexrz-callback-url, synthesize it from flexrz-return-to.
    if (!cb) {
      const rt = req.cookies.get("flexrz-return-to")?.value;
      const safeRt = rt ? resolveAndValidateReturnTo(rt) : null;
      if (safeRt) {
        const from = (req.headers.get("host") || "").toLowerCase() || "unknown";
        const authReturn = new URL("/return", req.nextUrl.origin);
        authReturn.searchParams.set("to", safeRt);
        authReturn.searchParams.set("from", from);
        cb = authReturn.toString();
      }
    }

    if (!cb) return NextResponse.next();

    const safeCb = resolveAndValidateReturnTo(cb);
    if (!safeCb) return NextResponse.next();

    const res = NextResponse.next();
    res.cookies.set("__Secure-next-auth.callback-url", safeCb, common);
    res.cookies.set("next-auth.callback-url", safeCb, common);
    // Keep our helper cookie in sync for future requests.
    res.cookies.set("flexrz-callback-url", safeCb, common);
    return res;
  }

  // 2) Sign-in entry points
  const isSigninRoute = pathname === "/auth/signin" || pathname === "/api/auth/signin";
  if (!isSigninRoute) return NextResponse.next();

  const rawCallbackUrl = searchParams.get("callbackUrl");
  const rawReturnTo = searchParams.get("returnTo");

  // Prefer callbackUrl for NextAuth (must be same-origin with NEXTAUTH_URL),
  // keep returnTo as the final destination (used by /return page).
  const safeCallbackUrl = rawCallbackUrl ? resolveAndValidateReturnTo(rawCallbackUrl) : null;
  const safeReturnTo = rawReturnTo ? resolveAndValidateReturnTo(rawReturnTo) : null;

  if (!safeCallbackUrl && !safeReturnTo) return NextResponse.next();

  // If callbackUrl is missing but returnTo exists, synthesize a safe same-origin callbackUrl
  // to force NextAuth to always redirect back through auth.flexrz.com/return.
  let effectiveCallbackUrl = safeCallbackUrl;
  if (!effectiveCallbackUrl && safeReturnTo) {
    const from = (req.headers.get("host") || "").toLowerCase() || "unknown";
    const authReturn = new URL("/return", req.nextUrl.origin);
    authReturn.searchParams.set("to", safeReturnTo);
    authReturn.searchParams.set("from", from);
    effectiveCallbackUrl = authReturn.toString();
  }

  const res = NextResponse.next();

  // If we have a safe callbackUrl, write it into NextAuth cookies and also store it for callback stage.
  if (effectiveCallbackUrl) {
    res.cookies.set("__Secure-next-auth.callback-url", effectiveCallbackUrl, common);
    res.cookies.set("next-auth.callback-url", effectiveCallbackUrl, common);
    res.cookies.set("flexrz-callback-url", effectiveCallbackUrl, common);
  }

  // Store the final destination separately so /return can bounce to it.
  // (If returnTo is missing, fall back to callbackUrl so we always have something.)
  const finalReturn = safeReturnTo || effectiveCallbackUrl;
  if (finalReturn) {
    res.cookies.set("flexrz-return-to", finalReturn, common);
  }

  return res;
}

export const config = {
  matcher: ["/auth/signin", "/api/auth/:path*", "/tenant/:path*"],
};
