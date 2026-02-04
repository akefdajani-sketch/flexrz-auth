import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
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
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
