import { NextResponse } from "next/server";

// POST /api/auth/set-callback?callbackUrl=<absolute url>
// Sets NextAuth callback-url cookies (both secure + non-secure variants) with Domain=.flexrz.com
// so OAuth redirects always land back on the initiating page (e.g. /book/:slug).
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const callbackUrl = searchParams.get("callbackUrl") || "";

  // Minimal safety: require absolute https URL pointing to flexrz.com or app.flexrz.com.
  // (Extend allowlist later for tenant custom domains.)
  let safe = "https://flexrz.com/";
  try {
    const u = new URL(callbackUrl);
    const host = u.host.toLowerCase();
    const isAllowed = host === "flexrz.com" || host.endsWith(".flexrz.com");
    if (u.protocol === "https:" && isAllowed) safe = u.toString();
  } catch {
    // keep default
  }

  const res = NextResponse.json({ ok: true, callbackUrl: safe });

  // Set both cookie names to cover NextAuth secure/non-secure naming.
  // Secure cookies require HTTPS; Vercel production is HTTPS.
  const common = {
    httpOnly: false,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    domain: ".flexrz.com",
  };

  res.cookies.set("__Secure-next-auth.callback-url", safe, common);
  res.cookies.set("next-auth.callback-url", safe, common);

  return res;
}
