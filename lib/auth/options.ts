import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const COOKIE_DOMAIN = process.env.NEXTAUTH_COOKIE_DOMAIN || undefined;

// Allow redirects back to app/owner + localhost for dev.
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
    // Not an absolute URL
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Relative URLs are always safe.
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      // Only allow sending the user back to approved app domains.
      if (isAllowedRedirect(url)) return url;

      // Fallback to auth domain.
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
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
      },
    },
  },
};
