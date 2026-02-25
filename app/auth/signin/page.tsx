import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { SignInCard } from "./SignInCard";

function sanitizeCallbackUrl(raw: unknown): string {
  const v = typeof raw === "string" ? raw : "";
  if (!v) return "https://flexrz.com";

  // Accept relative paths and treat them as relative to app.flexrz.com
  // (mainly for tenant dashboard flows).
  if (v.startsWith("/")) {
    const base = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://app.flexrz.com";
    try {
      return new URL(v, base).toString();
    } catch {
      return "https://flexrz.com";
    }
  }

  // Allow only Flexrz apex + subdomains (+ local dev). Everything else falls back.
  try {
    const u = new URL(v);
    const host = u.hostname.toLowerCase();

    const isFlexrz = host === "flexrz.com" || host === "www.flexrz.com" || host.endsWith(".flexrz.com");
    const isLocal =
      host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "127.0.0.1";

    if (isFlexrz || isLocal) return v;
  } catch {
    // ignore
  }

  return "https://flexrz.com";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const callbackUrl = sanitizeCallbackUrl(searchParams?.callbackUrl);

  // If already logged in, return directly to the requested callbackUrl.
  const session = await getServerSession(authOptions);
  if (session) {
    redirect(callbackUrl);
  }

  return <SignInCard callbackUrl={callbackUrl} />;
}
