import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/**
 * We want auth.flexrz.com to mint cookies readable by app.flexrz.com / owner.flexrz.com.
 * In production we default to `.flexrz.com` unless overridden.
 */
const COOKIE_DOMAIN =
  (process.env.NEXTAUTH_COOKIE_DOMAIN || "").trim() ||
  (process.env.NODE_ENV === "production" ? ".flexrz.com" : undefined);

function isAllowedRedirect(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.host;
    return (
      host === "app.flexrz.com" ||
      host === "owner.flexrz.com" ||
      host === "localhost:3000" ||
      host === "localhost:3001" ||
      host === "127.0.0.1:3000" ||
      host === "127.0.0.1:3001"
    );
  } catch {
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      // Optional: helps ensure refresh tokens are issued on first consent.
      authorization: { params: { prompt: "consent", access_type: "offline", response_type: "code" } },
    }),
  ],

  pages: {
    signIn: "/auth/signin",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    /**
     * IMPORTANT:
     * Put Google tokens onto the JWT so `getToken()` in app.flexrz.com can read them.
     */
    async jwt({ token, account, profile }) {
      // Initial sign-in (account is present)
      if (account) {
        // These are the keys your proxy is already trying to read:
        // google_id_token / google_access_token (and legacy fallbacks)
        (token as any).google_id_token = (account as any).id_token ?? (token as any).google_id_token;
        (token as any).google_access_token = (account as any).access_token ?? (token as any).google_access_token;

        // Optional: keep refresh token if Google returns it
        (token as any).google_refresh_token =
          (account as any).refresh_token ?? (token as any).google_refresh_token;

        // Keep stable identity fields
        if (profile && (profile as any).sub) (token as any).sub = (profile as any).sub;
        if (profile && (profile as any).email) (token as any).email = (profile as any).email;
        if (profile && ((profile as any).name || (profile as any).given_name || (profile as any).family_name)) {
          (token as any).name =
            (profile as any).name ||
            `${(profile as any).given_name || ""} ${(profile as any).family_name || ""}`.trim();
        }
      }

      return token;
    },

    /**
     * Optional: expose tokens to session JSON (useful for debugging at /api/auth/session)
     * This does NOT affect cookie decoding; it just makes inspection easier.
     */
    async session({ session, token }) {
      (session as any).googleIdToken = (token as any).google_id_token;
      (session as any).googleAccessToken = (token as any).google_access_token;
      (session as any).sub = (token as any).sub;

      if (session.user) {
        session.user.email = session.user.email || ((token as any).email as any);
        session.user.name = session.user.name || ((token as any).name as any);
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Relative URLs are always safe.
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      // Allow redirects that stay on auth broker itself.
      if (url.startsWith(baseUrl)) return url;

      // Allow approved app domains.
      if (isAllowedRedirect(url)) return url;

      // Fallback: stay on auth domain.
      return baseUrl;
    },
  },

  cookies: {
    // Make session cookies available across *.flexrz.com
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
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
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
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
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
        // __Host- cookies MUST NOT set a Domain attribute.
      },
    },
  },
};
