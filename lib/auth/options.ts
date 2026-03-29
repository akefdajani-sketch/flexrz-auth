import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import crypto from "crypto";

// NOTE: We intentionally do NOT store or refresh Google access tokens in the NextAuth JWT.
// The JWT is stored in a cookie and must remain comfortably under browser cookie limits.
// We persist the Google *ID token* for backward compat AND a long-lived Flexrz App JWT
// for backend API auth (replaces the ~1-hour Google token in the booking/customer flow).

// ---------------------------------------------------------------------------
// Flexrz App JWT helpers
// ---------------------------------------------------------------------------
// We mint a long-lived HS256 JWT at sign-in time so backend routes can verify
// identity without relying on the short-lived (~1hr) Google ID token.
// ---------------------------------------------------------------------------

function base64UrlEncode(buf: Buffer) {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signHs256Jwt(payload: Record<string, any>, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const h = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const p = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${h}.${p}`;
  const sig = base64UrlEncode(
    crypto.createHmac("sha256", secret).update(signingInput).digest()
  );
  return `${signingInput}.${sig}`;
}

function mintFlexrzAppJwt(token: any): string | null {
  const secret = (
    process.env.FLEXRZ_APP_JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ""
  ).trim();
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "auth.flexrz.com",
    sub: token?.sub || null,
    email: (token?.email || "").toLowerCase() || null,
    name: token?.name || null,
    iat: now,
    exp: now + 30 * 24 * 60 * 60, // 30 days — matches session lifetime
  };

  try {
    return signHs256Jwt(payload, secret);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------

function isAllowedRedirectHost(hostname: string) {
  const host = (hostname || "").toLowerCase();
  return (
    host === "flexrz.com" ||
    host === "www.flexrz.com" ||
    host.endsWith(".flexrz.com") ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "127.0.0.1"
  );
}


function stripNestedCallbackUrl(input: string): string {
  let out = input;
  for (let i = 0; i < 3; i++) {
    try {
      const u = new URL(out);
      if (!u.searchParams.has("callbackUrl")) break;
      const inner = u.searchParams.get("callbackUrl") || "";
      if (!inner) break;
      let decoded = inner;
      for (let j = 0; j < 2; j++) {
        try {
          const d2 = decodeURIComponent(decoded);
          if (d2 === decoded) break;
          decoded = d2;
        } catch {
          break;
        }
      }
      out = decoded;
    } catch {
      break;
    }
  }
  return out;
}

function isBlockedAuthCallback(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "auth.flexrz.com" && u.pathname.startsWith("/auth/");
  } catch {
    return false;
  }
}


export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          // Refresh tokens (offline) for long-lived sessions when needed.
          access_type: "offline",
          prompt: "consent",
          // Defensive: ensure the authorize request includes the required
          // OAuth param. NextAuth normally sets this, but we explicitly
          // include it to avoid malformed authorize URLs in edge cases.
          response_type: "code",
          // Explicit scopes (Google accepts space-delimited).
          scope: "openid email profile",
        },
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 6 * 60 * 60, // Re-issue session JWT every 6 hours
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },

  // Branded sign-in UI (MUST respect callbackUrl)
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  // Emit useful errors in Vercel logs. Without this, many OAuth callback
  // failures degrade to "error=google" on the sign-in page with no details.
  logger: {
    error(code, metadata) {
      console.error("[NextAuth error]", code, metadata);
    },
    warn(code) {
      console.warn("[NextAuth warn]", code);
    },
    debug(code, metadata) {
      // Only log debug when explicitly enabled.
      if (process.env.NEXTAUTH_DEBUG === "true") {
        console.debug("[NextAuth debug]", code, metadata);
      }
    },
  },

  debug: process.env.NEXTAUTH_DEBUG === "true",

  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // Capture provider-level sign-in failures that otherwise only surface as `error=google`.
      const DEBUG = process.env.AUTH_DEBUG_SIGNIN === "1" || process.env.NEXTAUTH_DEBUG === "true";
      if (DEBUG) {
        try {
          console.info("[AUTH signIn] provider=", account?.provider);
          console.info("[AUTH signIn] account keys=", account ? Object.keys(account as any) : null);
          console.info("[AUTH signIn] profile keys=", profile ? Object.keys(profile as any) : null);
        } catch {}
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      const DEBUG = process.env.AUTH_DEBUG_REDIRECT === "1";

      // IMPORTANT:
      // In multi-domain deployments, NextAuth can occasionally compute `baseUrl`
      // as the marketing domain (e.g. https://flexrz.com). If we ever fall back
      // to that, users land on "/" even when a correct callbackUrl cookie exists.
      // Use NEXTAUTH_URL (auth origin) as the source of truth.
      const envOrigin = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
      const baseOrigin = (baseUrl || "").replace(/\/$/, "");
      // Prefer the runtime baseUrl if it is the auth domain; otherwise prefer env if it is auth; else default.
      const AUTH_ORIGIN = (baseOrigin.includes("auth.") ? baseOrigin : (envOrigin.includes("auth.") ? envOrigin : "https://auth.flexrz.com")).replace(/\/$/, "");

      // NextAuth sometimes passes encoded callbackUrl (e.g. "https%3A%2F%2F...").
      // Decode defensively (1–2 times) before validating.
      const decodeMaybe = (value: string) => {
        let v = (value || "").trim();
        for (let i = 0; i < 2; i++) {
          try {
            // Normalize '+' (some encoders use it for spaces)
            v = v.replace(/\+/g, "%20");
            const dv = decodeURIComponent(v);
            if (dv === v) break;
            v = dv;
          } catch (e) {
            if (DEBUG) console.warn("[AUTH redirect] decode exception:", String((e as any)?.message || e));
            break;
          }
        }
        return v;
      };

      try {
        let candidate = decodeMaybe(url);
        candidate = stripNestedCallbackUrl(candidate);

        // HARDENING: If NextAuth resolves the final redirect to the marketing root (https://flexrz.com/),
        // do NOT send the user there. Instead bounce through auth /return, which will forward using
        // the flexrz-return-to cookie set earlier in the flow.
        try {
          const cUrl = candidate.startsWith("/") ? new URL(candidate, AUTH_ORIGIN) : new URL(candidate);
          const isMarketingRoot =
            (cUrl.hostname === "flexrz.com" || cUrl.hostname === "www.flexrz.com") && (cUrl.pathname === "/" || cUrl.pathname === "");
          const isBareRoot = cUrl.origin === AUTH_ORIGIN && (cUrl.pathname === "/" || cUrl.pathname === "");
          if (isMarketingRoot || isBareRoot) {
            const out = new URL("/return", AUTH_ORIGIN).toString();
            if (DEBUG) console.info("[AUTH redirect] marketing/root detected → bounce to /return ->", out);
            return out;
          }
        } catch {}

        // Always allow the auth-hosted bounce endpoint (/return).
        if (candidate.startsWith("/return")) {
          const out = new URL(candidate, AUTH_ORIGIN).toString();
          if (DEBUG) console.info("[AUTH redirect] allow /return (relative) ->", out);
          return out;
        }
        if (candidate.startsWith(`${AUTH_ORIGIN}/return`)) {
          if (DEBUG) console.info("[AUTH redirect] allow /return (absolute) ->", candidate);
          return candidate;
        }

        if (baseOrigin && baseOrigin !== AUTH_ORIGIN && candidate.startsWith(`${baseOrigin}/return`)) {
          if (DEBUG) console.info("[AUTH redirect] allow /return (baseOrigin absolute) ->", candidate);
          return candidate;
        }

        if (isBlockedAuthCallback(candidate)) {
          return AUTH_ORIGIN;
        }

        if (DEBUG) {
          console.info("[AUTH redirect] raw url=", url);
          console.info("[AUTH redirect] decoded candidate=", candidate);
          console.info("[AUTH redirect] baseUrl=", baseUrl);
          console.info("[AUTH redirect] authOrigin=", AUTH_ORIGIN);
        }

        if (candidate.startsWith("/")) return new URL(candidate, AUTH_ORIGIN).toString();

        const target = new URL(candidate);

        if (target.origin === AUTH_ORIGIN) return candidate;

        if (isAllowedRedirectHost(target.hostname)) {
          if (DEBUG) console.info("[AUTH redirect] allowed host:", target.hostname);
          return candidate;
        }

        if (DEBUG) console.warn("[AUTH redirect] blocked host:", target.hostname, "→ fallback auth origin");
        return AUTH_ORIGIN;
      } catch (e) {
        if (DEBUG) console.warn("[AUTH redirect] exception:", String((e as any)?.message || e), "→ fallback auth origin");
        return AUTH_ORIGIN;
      }
    },

    async jwt({ token, account }) {
      // On initial sign-in, persist the Google ID token AND mint a long-lived Flexrz App JWT.
      //
      // Why two tokens?
      // - google_id_token: kept for backward compatibility with any code still reading it.
      //   Its actual lifetime is ~1 hour; we no longer use it for API auth.
      // - app_jwt: our own HS256 JWT, 30-day expiry, used by requireAppAuth on the backend.
      //   This eliminates the 1-hour auth drop that caused booking/customer actions to fail.
      if (account?.provider === "google") {
        const idToken = (account as any).id_token as string | undefined;
        (token as any).google_id_token = idToken || (token as any).google_id_token || null;

        // Mint a long-lived Flexrz App JWT for backend API auth.
        // This runs ONLY on initial sign-in (account is present), so the 30-day
        // token is minted once and stored in the encrypted NextAuth cookie.
        const appJwt = mintFlexrzAppJwt(token);
        if (appJwt) {
          (token as any).app_jwt = appJwt;
          console.log("[NextAuth jwt] minted app_jwt for", (token as any)?.email || "unknown");
        } else {
          console.warn("[NextAuth jwt] FLEXRZ_APP_JWT_SECRET not set — app_jwt not minted");
        }

        (token as any).error = null;
        return token;
      }

      return token;
    },

    async session({ session, token }) {
      // Expose google_id_token for backward compat (not used for API auth anymore).
      (session as any).google_id_token = (token as any).google_id_token || null;
      // Expose app_jwt — booking frontend reads this to use as Bearer for customer API calls.
      (session as any).app_jwt = (token as any).app_jwt || null;
      (session as any).tokenError = (token as any).error || null;
      return session;
    },
  },

  events: {
    async signIn(message) {
      console.log("[NextAuth event:signIn]", message?.user?.email || message?.user?.name || message);
    },
    async signOut(message) {
      console.log("[NextAuth event:signOut]", message);
    },
    async session(message) {
      console.log("[NextAuth event:session]", message?.session?.user?.email || message);
    },
  },

  // Share session cookies across *.flexrz.com
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" ? ".flexrz.com" : undefined,
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.callback-url"
          : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" ? ".flexrz.com" : undefined,
      },
    },
    csrfToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Host-next-auth.csrf-token"
          : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // __Host- cookies must NOT set a Domain attribute.
      },
    },
  },
};
