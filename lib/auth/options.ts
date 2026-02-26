import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// NOTE: We intentionally do NOT store or refresh Google access tokens in the NextAuth JWT.
// The JWT is stored in a cookie and must remain comfortably under browser cookie limits.
// We only persist the Google *ID token* for backend verification.

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
          } catch (e) {
        if (DEBUG) console.warn("[AUTH redirect] exception, fallback baseUrl:", String((e as any)?.message || e));

            break;
          }
        }
        return v;
      };

      try {
        let candidate = decodeMaybe(url);
        candidate = stripNestedCallbackUrl(candidate);
        if (isBlockedAuthCallback(candidate)) {
          // Never allow returning to auth domain pages; fallback to baseUrl.
          return baseUrl;
        }
        if (DEBUG) {
          console.info("[AUTH redirect] raw url=", url);
          console.info("[AUTH redirect] decoded candidate=", candidate);
          console.info("[AUTH redirect] baseUrl=", baseUrl);
        }

        // Relative paths
        if (candidate.startsWith("/")) return new URL(candidate, baseUrl).toString();

        // Absolute URLs (allow only Flexrz domains + local dev)
        const target = new URL(candidate);

        // allow same-origin always
        const base = new URL(baseUrl);
        if (target.origin === base.origin) return candidate;

        if (isAllowedRedirectHost(target.hostname)) {
          if (DEBUG) console.info("[AUTH redirect] allowed host:", target.hostname);
          return candidate;
        }

        if (DEBUG) console.warn("[AUTH redirect] blocked host:", target.hostname, "→ fallback baseUrl");
        return baseUrl;
      } catch {
        return baseUrl;
      }
    },

    async jwt({ token, account }) {
      // On initial sign-in, persist ONLY the Google ID token into the JWT.
      // Storing access/refresh tokens can push the cookie over 4KB and break sessions.
      if (account?.provider === "google") {
        const idToken = (account as any).id_token as string | undefined;
        (token as any).google_id_token = idToken || (token as any).google_id_token || null;
        (token as any).error = null;
        return token;
      }

      return token;
    },

    async session({ session, token }) {
      (session as any).google_id_token = (token as any).google_id_token || null;
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
      // Fires when a session is checked/created. Helpful for debugging cookie issues.
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
