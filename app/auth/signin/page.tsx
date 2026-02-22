import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
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

  // If already logged in, immediately return to the app.
  const session = await getServerSession(authOptions);
  if (session) {
    const to = encodeURIComponent(callbackUrl);
    redirect(`/return?to=${to}`);
  }

  return <SignInCard callbackUrl={callbackUrl} />;
}
