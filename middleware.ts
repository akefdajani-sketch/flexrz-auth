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

  const AUTH_ORIGIN = (process.env.NEXTAUTH_URL || "https://auth.flexrz.com").replace(/\/$/, "");

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
    // Prefer the same-origin callbackUrl we stored during /auth/signin (flexrz-callback-url).
    // If it is missing (e.g. caller only provided returnTo), synthesize a safe same-origin
    // callbackUrl from flexrz-return-to so NextAuth never falls back to "/".
    const cb = req.cookies.get("flexrz-callback-url")?.value;
    const rt = req.cookies.get("flexrz-return-to")?.value;

    let safeCb: string | null = null;

    if (cb) safeCb = resolveAndValidateReturnTo(cb);

    if (!safeCb && rt) {
      const safeRt = resolveAndValidateReturnTo(rt);
      if (safeRt) {
        const fromHost = req.nextUrl.searchParams.get("from") || req.headers.get("host") || "";
        safeCb = `${AUTH_ORIGIN}/return?to=${encodeURIComponent(safeRt)}${fromHost ? `&from=${encodeURIComponent(fromHost)}` : ""}`;
      }
    }

    if (!safeCb) return NextResponse.next();

    const res = NextResponse.next();
    res.cookies.set("__Secure-next-auth.callback-url", safeCb, common);
    res.cookies.set("next-auth.callback-url", safeCb, common);
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
  let safeCallbackUrl = rawCallbackUrl ? resolveAndValidateReturnTo(rawCallbackUrl) : null;
  const safeReturnTo = rawReturnTo ? resolveAndValidateReturnTo(rawReturnTo) : null;

  if (!safeCallbackUrl && !safeReturnTo) return NextResponse.next();

  const res = NextResponse.next();

  // Store the final destination separately so /return can bounce to it.
  // (If returnTo is missing, fall back to callbackUrl so we always have something.)
  const finalReturn = safeReturnTo || safeCallbackUrl;
  if (!safeCallbackUrl && finalReturn) {
    // If caller provided only returnTo (and no callbackUrl), synthesize a same-origin callbackUrl
    // so NextAuth doesn't fall back to "/" after OAuth callback.
    const fromHost = searchParams.get("from") || req.headers.get("host") || "";
    safeCallbackUrl = `${AUTH_ORIGIN}/return?to=${encodeURIComponent(finalReturn)}${fromHost ? `&from=${encodeURIComponent(fromHost)}` : ""}`;
  }


  // If we have a safe callbackUrl, write it into NextAuth cookies and also store it for callback stage.
  if (safeCallbackUrl) {
    res.cookies.set("__Secure-next-auth.callback-url", safeCallbackUrl, common);
    res.cookies.set("next-auth.callback-url", safeCallbackUrl, common);
    res.cookies.set("flexrz-callback-url", safeCallbackUrl, common);
  }
  if (finalReturn) {
    res.cookies.set("flexrz-return-to", finalReturn, common);
  }

  return res;
}

export const config = {
  matcher: ["/auth/signin", "/api/auth/:path*"],
};
