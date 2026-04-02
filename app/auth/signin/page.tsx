import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { SignInCard } from "./SignInCard";
import { headers } from "next/headers";

function isAllowedHost(host: string) {
  const h = (host || "").toLowerCase();
  return (
    h === "flexrz.com" ||
    h === "www.flexrz.com" ||
    h.endsWith(".flexrz.com") ||
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h === "127.0.0.1"
  );
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
    const slug = (json?.slug || json?.tenantSlug || "").toString().trim();
    return !!slug;
  } catch {
    return false;
  }
}

function decodeMaybe(input: string): string {
  let out = input;
  for (let i = 0; i < 2; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(out)) break;
    try {
      const decoded = decodeURIComponent(out);
      if (decoded === out) break;
      out = decoded;
    } catch {
      break;
    }
  }
  return out;
}

async function sanitizeCallbackUrl(raw: unknown, fromRaw: unknown): Promise<string> {
  const vRaw = typeof raw === "string" ? raw : "";
  const v = decodeMaybe(vRaw);
  const from = typeof fromRaw === "string" ? fromRaw : "";
  const fallback = "https://flexrz.com";

  let baseOrigin = fallback;
  if (from) {
    const cleanedFrom = from.replace(/^https?:\/\//i, "").split("/")[0];
    if (isAllowedHost(cleanedFrom) || (await isRegisteredTenantDomain(cleanedFrom))) {
      baseOrigin = `https://${cleanedFrom}`;
    }
  }

  if (!v) return baseOrigin;

  if (v.startsWith("/")) {
    try {
      return new URL(v, baseOrigin).toString();
    } catch {
      return baseOrigin;
    }
  }

  try {
    const u = new URL(v);
    if (isAllowedHost(u.hostname) || (await isRegisteredTenantDomain(u.hostname))) {
      return u.toString();
    }
  } catch {}

  return baseOrigin;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string; returnTo?: string; from?: string };
}) {
  const hdrs = await headers();

  const preferred = searchParams?.returnTo || searchParams?.callbackUrl;
  let callbackUrl = await sanitizeCallbackUrl(preferred, searchParams?.from);
  let refForDebug: string | null = null;

  if (!preferred) {
    refForDebug = hdrs.get("referer");
    const ref = refForDebug;
    if (ref) {
      callbackUrl = await sanitizeCallbackUrl(ref, searchParams?.from || ref);
    }
  }

  const DEBUG_SIGNIN = process.env.AUTH_DEBUG_SIGNIN === "1";
  if (DEBUG_SIGNIN) {
    console.info("[AUTH signin] raw search callbackUrl=", searchParams?.callbackUrl || "");
    console.info("[AUTH signin] raw search returnTo=", searchParams?.returnTo || "");
    console.info("[AUTH signin] raw search from=", searchParams?.from || "");
    console.info("[AUTH signin] referer=", refForDebug || "");
    console.info("[AUTH signin] computed callbackUrl=", callbackUrl);
  }

  const session = await getServerSession(authOptions);
  if (session) {
    redirect(callbackUrl);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <SignInCard callbackUrl={callbackUrl} />
    </main>
  );
}
