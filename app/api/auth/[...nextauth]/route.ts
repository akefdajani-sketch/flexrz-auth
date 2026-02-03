import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      // On first sign-in, Google profile info is available here.
      if (account?.provider === "google" && profile) {
        token.provider = "google";
      }
      return token;
    },
    async session({ session, token }) {
      // minimal: keep session as-is (we’ll enhance later for tenant binding)
      return session;
    }
  }
});

export { handler as GET, handler as POST };
