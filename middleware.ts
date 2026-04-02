import { NextRequest, NextResponse } from "next/server";

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

async function resolveAndValidateReturnTo(raw: string): Promise<string | null> {
  try {
    const candidateUrl = raw.startsWith("/")
      ? new URL(raw, "https://flexrz.com")
      : new URL(raw);

    const host = candidateUrl.hostname.toLowerCase();

    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".localhost");

    const isFlexrz = host === "flexrz.com" || host.endsWith(".flexrz.com");
    const isTenantDomain = !isLocal && !isFlexrz && (await isRegisteredTenantDomain(host));

    if (!isLocal && !isFlexrz && !isTenantDomain) return null;
    if (!isLocal && candidateUrl.protocol !== "https:") return null;

    return candidateUrl.toString();
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (pathname === "/tenant" || pathname.startsWith("/tenant/")) {
    const appHost = (process.env.NEXT_PUBLIC_APP_HOST || "app.flexrz.com").toLowerCase();
    const currentHost = (req.headers.get("host") || "").toLowerCase();

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

  if (pathname.startsWith("/api/auth/callback/")) {
    let cb = req.cookies.get("flexrz-callback-url")?.value;

    if (!cb) {
      const rt = req.cookies.get("flexrz-return-to")?.value;
      const safeRt = rt ? await resolveAndValidateReturnTo(rt) : null;
      if (safeRt) {
        const from = (req.headers.get("host") || "").toLowerCase() || "unknown";
        const authReturn = new URL("/return", req.nextUrl.origin);
        authReturn.searchParams.set("to", safeRt);
        authReturn.searchParams.set("from", from);
        cb = authReturn.toString();
      }
    }

    if (!cb) return NextResponse.next();

    const safeCb = await resolveAndValidateReturnTo(cb);
    if (!safeCb) return NextResponse.next();

    const res = NextResponse.next();
    res.cookies.set("__Secure-next-auth.callback-url", safeCb, common);
    res.cookies.set("next-auth.callback-url", safeCb, common);
    res.cookies.set("flexrz-callback-url", safeCb, common);
    return res;
  }

  const isSigninRoute = pathname === "/auth/signin" || pathname === "/api/auth/signin";
  if (!isSigninRoute) return NextResponse.next();

  const rawCallbackUrl = searchParams.get("callbackUrl");
  const rawReturnTo = searchParams.get("returnTo");

  const safeCallbackUrl = rawCallbackUrl ? await resolveAndValidateReturnTo(rawCallbackUrl) : null;
  const safeReturnTo = rawReturnTo ? await resolveAndValidateReturnTo(rawReturnTo) : null;

  if (!safeCallbackUrl && !safeReturnTo) return NextResponse.next();

  let effectiveCallbackUrl = safeCallbackUrl;
  if (!effectiveCallbackUrl && safeReturnTo) {
    const from = (req.headers.get("host") || "").toLowerCase() || "unknown";
    const authReturn = new URL("/return", req.nextUrl.origin);
    authReturn.searchParams.set("to", safeReturnTo);
    authReturn.searchParams.set("from", from);
    effectiveCallbackUrl = authReturn.toString();
  }

  const res = NextResponse.next();

  if (effectiveCallbackUrl) {
    res.cookies.set("__Secure-next-auth.callback-url", effectiveCallbackUrl, common);
    res.cookies.set("next-auth.callback-url", effectiveCallbackUrl, common);
    res.cookies.set("flexrz-callback-url", effectiveCallbackUrl, common);
  }

  const finalReturn = safeReturnTo || effectiveCallbackUrl;
  if (finalReturn) {
    res.cookies.set("flexrz-return-to", finalReturn, common);
  }

  return res;
}

export const config = {
  matcher: ["/auth/signin", "/api/auth/:path*", "/tenant/:path*"],
};
