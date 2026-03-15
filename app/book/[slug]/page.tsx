import { defaultTheme } from "@/lib/theme/defaultTheme";
import { resolveTheme } from "@/lib/theme/resolveTheme";
import type { Theme } from "@/lib/theme/types";
import { layoutPresetOverride } from "@/lib/theme/layoutPresets";
import { computeTenantCssVars, cssVarsToStyleTagText } from "@/lib/theme/tenantCssVars";
import type { PublicTenantThemeResponse } from "@/types/appearanceSnapshot";
import PublicBookingClient from "./PublicBookingClient";
import { normalizeLayoutName } from "@/components/booking/layouts/layoutRegistry";
import { cookies, headers } from "next/headers";
import { resolveTenantTheme } from "@/lib/theme/resolveTenantTheme";

export const runtime = "nodejs";
// Keep a small revalidate for performance; theme correctness is ensured by SSR fetch logic.
export const revalidate = 60;

type TenantThemePayload = PublicTenantThemeResponse & {
  tenant?: {
    id: number;
    slug: string;
    logo_url?: string | null;
    banners?: {
      home?: string | null;
      book?: string | null;
      account?: string | null;
      reservations?: string | null;
    };
    brand_overrides?: Record<string, string>;
    // Back-compat: some backend responses may use *_json naming.
    brand_overrides_json?: Record<string, string> | string;
    branding?: any;
  };
  theme?: {
    key: string;
    layout_key?: string;
    tokens?: Record<string, string> | string;
  };
};

function coerceRecord(val: unknown): Record<string, string> {
  if (!val) return {};
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === "object") return parsed as Record<string, string>;
    } catch {
      return {};
    }
    return {};
  }
  if (typeof val === "object") return val as Record<string, string>;
  return {};
}

async function getRequestOrigin(): Promise<string> {
  // Build an absolute origin for server-side fetches to our own Next.js API routes.
  const h = await headers();
  const proto = (h.get("x-forwarded-proto") || "https").split(",")[0].trim();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  return `${proto}://${host}`;
}


function backendOriginCandidates(): string[] {
  // Prefer the known-good production backend first.
  const prod = "https://booking-backend-6jbc.onrender.com";

  const envA = String(process.env.NEXT_PUBLIC_API_BASE_URL || "")
    .trim()
    .replace(/\/+$/g, "");
  const envB = String(process.env.NEXT_PUBLIC_BACKEND_URL || "")
    .trim()
    .replace(/\/+$/g, "");

  const candidates = [prod, envA, envB].filter((v) => v && v !== "undefined" && v !== "null");
  return Array.from(new Set(candidates));
}

async function fetchTenantTheme(slug: string): Promise<{ payload: TenantThemePayload; debug: any }> {
  const candidates = backendOriginCandidates();
  const tried: Array<{ origin: string; url: string; ok: boolean; status?: number; error?: string }> = [];

  for (const origin of candidates) {
    const url = `${origin}/api/public/tenant-theme/${encodeURIComponent(slug)}`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      tried.push({ origin, url, ok: res.ok, status: res.status });

      if (!res.ok) continue;

      const json = (await res.json()) as TenantThemePayload;
      return { payload: json || {}, debug: { pickedOrigin: origin, tried } };
    } catch (e: any) {
      tried.push({ origin, url, ok: false, error: String(e?.message || e) });
    }
  }

  return { payload: {}, debug: { pickedOrigin: null, tried } };
}

async function fetchTenantThemePreview(slug: string): Promise<{ payload: TenantThemePayload; debug: any } | null> {
  // Preview mode is for logged-in owners/admins only (uses proxy-admin which requires a session).
  const origin = await getRequestOrigin();
  const url = `${origin}/api/proxy-admin/tenants/${encodeURIComponent(slug)}`;
  try {
    const c = cookies().toString();
    const res = await fetch(url, {
      cache: "no-store",
      headers: c ? { cookie: c } : undefined,
    });
    if (!res.ok) return null;
    const j = (await res.json()) as any;
    const t = j?.tenant || j;
    if (!t?.slug) return null;

    const payload: TenantThemePayload = {
      tenant: {
        id: Number(t.id),
        slug: String(t.slug),
        logo_url: t.logo_url ?? null,
        banners: t.banners || undefined,
        brand_overrides: coerceRecord(t.brand_overrides) || undefined,
        brand_overrides_json: t.brand_overrides_json ?? undefined,
        branding: t.branding || undefined,
      },
      theme: {
        key: String(t.theme_key || "default_v1"),
        layout_key: t.layout_key || undefined,
        // Prefer explicit theme tokens if present; otherwise fall back to theme-level tokens.
        tokens: coerceRecord(t.theme_tokens ?? t.themeTokens ?? t.tokens ?? t.theme?.tokens) || undefined,
      },
    };

    return { payload, debug: { preview: true, url } };
  } catch {
    return null;
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  // NOTE: In some Next.js versions, `params` can be a Promise. We support both.
  params: { slug?: string } | Promise<{ slug?: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const resolvedParams = await Promise.resolve(params as any);
  const slug = (resolvedParams?.slug ? String(resolvedParams.slug) : "").trim();

  // If slug is missing, render safe fallback and expose debug.
  if (!slug) {
    const fallbackTheme: Theme = resolveTheme(defaultTheme as any, layoutPresetOverride("classic"));
    const cssText = cssVarsToStyleTagText(
      computeTenantCssVars({
        theme: fallbackTheme,
        branding: null,
        themeTokens: {},
        brandOverrides: {},
      }).vars,
    );

    return (
      <>
        <style id="bf-theme-vars" dangerouslySetInnerHTML={{ __html: cssText }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__BF_SSR_DEBUG__ = ${JSON.stringify({
              missingSlug: true,
              receivedParamsType: typeof params,
              receivedParams: resolvedParams ?? null,
              receivedSearchParams: searchParams ?? null,
            })};`,
          }}
        />
        <PublicBookingClient
          __ssrTheme={{
            themeKey: "default_v1",
            layoutKey: "classic",
            themeTokens: {},
            brandOverrides: {},
          }}
        />
      </>
    );
  }

  const previewFlag =
    String((searchParams as any)?.preview || "").trim() === "1" ||
    String((searchParams as any)?.preview || "").trim().toLowerCase() === "true";

  const preview = previewFlag ? await fetchTenantThemePreview(slug) : null;
  const { payload, debug: __ssrDebugFetch } = preview ? preview : await fetchTenantTheme(slug);

  const snapshot = payload?.appearance || null;
  const themeKey = snapshot?.themeKey || payload?.themeKey || payload?.theme?.key || "default_v1";

  // Published layout comes from appearance snapshot first, then public theme contract.
  const publishedLayoutRaw = snapshot?.layoutKey || payload?.layoutKey || payload?.theme?.layout_key || payload?.theme?.key || "classic";
  const publishedLayout = normalizeLayoutName(publishedLayoutRaw) || "classic";

  // Published layout comes from /api/public/tenant-theme/:slug
  const layoutName = publishedLayout || "classic";

  const themeTokens = snapshot?.themeStudioTokens || coerceRecord(payload?.theme?.tokens);
  const brandOverridesRaw = snapshot?.brandOverrides || payload?.tenant?.brand_overrides || (payload?.tenant as any)?.brand_overrides_json;
  const branding = snapshot?.branding || payload?.tenant?.branding || null;

  // Single-source-of-truth resolution (tokens + overrides + fallbacks)
  const resolvedTheme = resolveTenantTheme({
    mode: "published",
    tenant: payload?.tenant || null,
    theme: payload?.theme || null,
    branding,
  });

  const brandOverrides = resolvedTheme.brandOverrides;

  const preset = layoutPresetOverride(layoutName);
  const theme: Theme = resolveTheme(defaultTheme as any, preset);

  const computed = computeTenantCssVars({
    theme,
    branding,
    themeTokens: resolvedTheme.themeTokens || themeTokens,
    brandOverrides,
  });
  const vars = snapshot?.resolvedCssVars && typeof snapshot.resolvedCssVars === "object"
    ? snapshot.resolvedCssVars as Record<string, string>
    : computed.vars;
  const cssText = cssVarsToStyleTagText(vars);

  return (
    <>
      {/* Critical: apply vars BEFORE first paint to eliminate default-theme flash */}
      <style id="bf-theme-vars" dangerouslySetInnerHTML={{ __html: cssText }} />

      {/* SSR debug: inspect in DevTools via window.__BF_SSR_DEBUG__ */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__BF_SSR_DEBUG__ = ${JSON.stringify({
            tenantSlug: slug,
            resolved: {
              themeKey,
              publishedLayout, layoutName,
            },
            fetch: __ssrDebugFetch,
            snapshotUsed: payload?.snapshotUsed ?? !!snapshot,
          })};`,
        }}
      />

      <PublicBookingClient
        __ssrTheme={{
          themeKey: resolvedTheme.themeKey || themeKey,
          layoutKey: layoutName,
          themeTokens: resolvedTheme.themeTokens || themeTokens,
          brandOverrides,
          branding: resolvedTheme.branding || branding,
        }}
      />
    </>
  );
}