import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const to = url.searchParams.get("to") || "https://flexrz.com";

  // Read the NextAuth JWT directly from cookies in THIS request
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const idToken = (token as any)?.googleIdToken as string | undefined;

  // Build redirect back to the destination
  const dest = new URL(to);

  // If we have the Google id_token, attach it as a hash so the main app can capture it
  if (idToken) {
    dest.hash = `id_token=${encodeURIComponent(idToken)}`;
  }

  return NextResponse.redirect(dest.toString(), 302);
}
