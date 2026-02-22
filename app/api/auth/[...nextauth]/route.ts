import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          // Always show an account chooser so users can switch accounts easily.
          prompt: "select_account",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  // Ensure we always use the branded sign-in UI (avoid NextAuth's default page).
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    /**
     * Allow redirecting back to other Flexrz subdomains after sign-in.
     *
     * NextAuth's default redirect behavior is same-origin only.
     * Without this, login can succeed but users end up back on auth.flexrz.com
     * instead of returning to app.flexrz.com / owner.flexrz.com.
     */
    async redirect({ url, baseUrl }) {
      try {
        if (url.startsWith("/")) return `${baseUrl}${url}`;

        const target = new URL(url);
        const base = new URL(baseUrl);

        // Always allow same-origin.
        if (target.origin === base.origin) return url;

        const host = target.hostname.toLowerCase();

        // Allow Flexrz apex + subdomains.
        if (host === "flexrz.com" || host.endsWith(".flexrz.com")) return url;

        // Dev convenience.
        if (
          host === "localhost" ||
          host.endsWith(".localhost") ||
          host.endsWith(".local")
        ) {
          return url;
        }

        // Block anything else.
        return baseUrl;
      } catch {
        return baseUrl;
      }
    },
    async jwt({ token, account }) {
      // Persist Google tokens in the JWT so we can hand them off safely via /return.
      if (account?.provider === "google") {
        // account.id_token is what our backend expects as Bearer.
        // account.access_token is optional fallback.
        (token as any).googleIdToken = (account as any).id_token ?? null;
        (token as any).accessToken = (account as any).access_token ?? null;
        (token as any).provider = "google";
      }
      return token;
    },
    async session({ session, token }) {
      // Expose tokens to server routes (like /return) via getServerSession.
      (session as any).googleIdToken = (token as any).googleIdToken ?? null;
      (session as any).accessToken = (token as any).accessToken ?? null;
      return session;
    },
  },
  /**
   * Optional but recommended: share session cookies across *.flexrz.com.
   * This makes central auth easier (and avoids surprises later).
   */
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
