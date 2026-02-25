import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Refresh Google access token using stored refresh token
async function refreshGoogleAccessToken(token: any) {
  const refreshToken = token?.google_refresh_token;
  if (!refreshToken) return { ...token, error: "no_refresh_token" };

  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) return { ...token, error: "missing_google_client_env" };

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ...token,
        error: "refresh_failed",
        refresh_error: json || { status: res.status },
      };
    }

    const newAccessToken = json?.access_token;
    const expiresInSec = json?.expires_in;

    const newExpiryMs =
      typeof expiresInSec === "number" ? Date.now() + expiresInSec * 1000 : undefined;

    return {
      ...token,
      google_access_token: newAccessToken || token.google_access_token,
      google_access_token_expires_at_ms: newExpiryMs || token.google_access_token_expires_at_ms,
      // refresh_token usually not returned on refresh, but keep if it is.
      google_refresh_token: json?.refresh_token || token.google_refresh_token,
      google_id_token: json?.id_token || token.google_id_token,
      error: null,
    };
  } catch (e: any) {
    return { ...token, error: "refresh_exception", refresh_error: String(e?.message || e) };
  }
}

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
  },

  callbacks: {
    async redirect({ url, baseUrl }) {
      // NextAuth sometimes stores callbackUrl in an encoded form (e.g.
      // "https%3A%2F%2Fflexrz.com%2Fbook%2Fbirdie-golf"). If we treat that
      // as a raw URL, `new URL(url)` throws and we fall back to baseUrl,
      // causing the user to land on "/".
      //
      // To prevent this, we attempt to decode 1–2 times before validating.
      const decodeMaybe = (value: string) => {
        let v = (value || "").trim();
        for (let i = 0; i < 2; i++) {
          try {
            const dv = decodeURIComponent(v);
            if (dv === v) break;
            v = dv;
          } catch {
            break;
          }
        }
        return v;
      };

      try {
        const candidate = decodeMaybe(url);

        // Relative paths
        if (candidate.startsWith("/")) return new URL(candidate, baseUrl).toString();

        // Absolute URLs (allow only Flexrz domains + local dev)
        const target = new URL(candidate);

        // allow same-origin always
        const base = new URL(baseUrl);
        if (target.origin === base.origin) return candidate;

        if (isAllowedRedirectHost(target.hostname)) return candidate;

        return baseUrl;
      } catch {
        return baseUrl;
      }
    },

    async jwt({ token, account }) {
      // On initial sign-in, persist Google tokens into the JWT
      if (account?.provider === "google") {
        const idToken = (account as any).id_token as string | undefined;
        const accessToken = (account as any).access_token as string | undefined;
        const refreshToken = (account as any).refresh_token as string | undefined;

        const expiresAtSec = (account as any).expires_at as number | undefined;
        const expiresInSec = (account as any).expires_in as number | undefined;

        const expiryMs =
          typeof expiresAtSec === "number"
            ? expiresAtSec * 1000
            : typeof expiresInSec === "number"
              ? Date.now() + expiresInSec * 1000
              : undefined;

        (token as any).google_id_token = idToken || (token as any).google_id_token || null;
        (token as any).google_access_token =
          accessToken || (token as any).google_access_token || null;

        // Keep refresh token if Google doesn't send it again
        (token as any).google_refresh_token =
          refreshToken || (token as any).google_refresh_token || null;

        (token as any).google_access_token_expires_at_ms =
          expiryMs || (token as any).google_access_token_expires_at_ms;

        (token as any).error = null;
        return token;
      }

      // Refresh when close to expiry
      const expMs = (token as any).google_access_token_expires_at_ms as number | undefined;
      if (!expMs) return token;

      const shouldRefresh = Date.now() > expMs - 60_000;
      if (!shouldRefresh) return token;

      return await refreshGoogleAccessToken(token);
    },

    async session({ session, token }) {
      (session as any).google_id_token = (token as any).google_id_token || null;
      (session as any).google_access_token = (token as any).google_access_token || null;
      (session as any).tokenError = (token as any).error || null;
      return session;
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
