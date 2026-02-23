
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Function to refresh Google access token using stored refresh token
async function refreshGoogleAccessToken(token: any) {
  const refreshToken = token?.google_refresh_token;
  if (!refreshToken) {
    return { ...token, error: "no_refresh_token" };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  if (!clientId || !clientSecret) {
    return { ...token, error: "missing_google_client_env" };
  }

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
      google_refresh_token: json?.refresh_token || token.google_refresh_token,
      google_id_token: json?.id_token || token.google_id_token,
      error: null,
    };
  } catch (e: any) {
    return { ...token, error: "refresh_exception", refresh_error: String(e?.message || e) };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          access_type: "offline",  // Ensures Google returns refresh token
          prompt: "consent",  // Forces Google to issue a refresh token
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
    maxAge: 30 * 24 * 60 * 60, // Align with session maxAge
  },

  callbacks: {
    async jwt({ token, account }) {
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

        (token as any).google_id_token = idToken;
        (token as any).google_access_token = accessToken;
        (token as any).google_refresh_token = refreshToken || (token as any).google_refresh_token;
        (token as any).google_access_token_expires_at_ms =
          expiryMs || (token as any).google_access_token_expires_at_ms;

        (token as any).error = null;
        return token;
      }

      const expMs = (token as any).google_access_token_expires_at_ms as number | undefined;

      if (!expMs) return token;

      const shouldRefresh = Date.now() > expMs - 60_000;
      if (!shouldRefresh) return token;

      const refreshed = await refreshGoogleAccessToken(token);
      return refreshed;
    },

    async session({ session, token }) {
      (session as any).google_id_token = (token as any).google_id_token || null;
      (session as any).google_access_token = (token as any).google_access_token || null;
      (session as any).tokenError = (token as any).error || null;

      return session;
    },
  },
};
