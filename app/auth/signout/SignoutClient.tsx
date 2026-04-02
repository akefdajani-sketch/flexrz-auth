"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";

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
  let out = (input || "").trim();
  for (let i = 0; i < 2; i++) {
    try {
      const d = decodeURIComponent(out);
      if (d === out) break;
      out = d;
    } catch {
      break;
    }
  }
  return out;
}

async function sanitizeCallbackUrl(raw: string | null, fromRaw: string | null): Promise<string> {
  const fallback = "https://flexrz.com";
  const v = decodeMaybe(raw || "");
  const from = decodeMaybe(fromRaw || "");

  let baseOrigin = fallback;
  if (from) {
    const cleaned = from.replace(/^https?:\/\//i, "").split("/")[0];
    if (isAllowedHost(cleaned) || (await isRegisteredTenantDomain(cleaned))) {
      baseOrigin = `https://${cleaned}`;
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

export default function SignoutClient() {
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const raw = searchParams.get("callbackUrl") || searchParams.get("callback") || "";
      const from = searchParams.get("from") || "";
      const callbackUrl = await sanitizeCallbackUrl(raw, from);
      if (!cancelled) {
        signOut({ callbackUrl });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return <div style={{ padding: 24 }}>Signing you out…</div>;
}
