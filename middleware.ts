import { NextRequest, NextResponse } from "next/server";

function resolveAndValidateReturnTo(raw: string, requestOrigin: string): string | null {
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

  // Only target the custom auth signin page.
  if (pathname !== "/auth/signin") {
    return NextResponse.next();
  }

  const rawReturnTo = searchParams.get("returnTo") || searchParams.get("callbackUrl");
  if (!rawReturnTo) {
    return NextResponse.next();
  }

  const safeReturnTo = resolveAndValidateReturnTo(rawReturnTo, req.nextUrl.origin);
  if (!safeReturnTo) {
    return NextResponse.next();
  }

  // Overwrite NextAuth callback URL cookies at the parent domain,
  // so stale values (like https://flexrz.com/) cannot win.
  const res = NextResponse.next();

  const common = {
    path: "/",
    sameSite: "lax" as const,
    secure: true,
    domain: ".flexrz.com",
  };

  res.cookies.set("__Secure-next-auth.callback-url", safeReturnTo, common);
  res.cookies.set("next-auth.callback-url", safeReturnTo, common);

  return res;
}

export const config = {
  matcher: ["/auth/signin"],
};
