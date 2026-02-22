import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth/options";
import { SignInCard } from "./SignInCard";

function sanitizeCallbackUrl(raw: unknown): string {
  const v = typeof raw === "string" ? raw : "";
  if (!v) return "https://app.flexrz.com";

  // Accept relative paths (e.g. /tenant/<slug>) and attach them to app origin.
  // This is important because app may pass a relative callbackUrl when sending
  // users to central auth.
  if (v.startsWith("/")) {
    const base = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://app.flexrz.com";
    try {
      return new URL(v, base).toString();
    } catch {
      return "https://app.flexrz.com";
    }
  }

  // Keep it simple: allow only app/owner/localhost, everything else falls back.
  try {
    const u = new URL(v);
    const host = u.host;
    if (
      host === "app.flexrz.com" ||
      host === "owner.flexrz.com" ||
      host.startsWith("localhost") ||
      host.startsWith("127.0.0.1")
    ) {
      return v;
    }
  } catch {
    // ignore
  }
  return "https://app.flexrz.com";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const callbackUrl = sanitizeCallbackUrl(searchParams?.callbackUrl);

  // If the callbackUrl points to a tenant path on app.flexrz.com, persist it as
  // a shared cookie so the app root (https://app.flexrz.com/) can immediately
  // route users back into their last tenant after login.
  //
  // This makes the flow robust even if some OAuth/provider edge cases drop the
  // callback path and return users to app root.
  try {
    const u = new URL(callbackUrl);
    const host = u.hostname.toLowerCase();
    if (host === "app.flexrz.com") {
      const m = u.pathname.match(/^\/tenant\/([a-z0-9-]{2,80})(?:\/|$)/i);
      const slug = m?.[1] || "";
      if (slug) {
        const c = await cookies();
        c.set("flexrz_last_tenant", slug, {
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          // Share across all subdomains.
          domain:
            process.env.NODE_ENV === "production" ? ".flexrz.com" : undefined,
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      }
    }
  } catch {
    // ignore
  }

  // If already logged in, immediately return to the app.
  const session = await getServerSession(authOptions);
  if (session) {
    redirect(callbackUrl);
  }

  return <SignInCard callbackUrl={callbackUrl} />;
}
