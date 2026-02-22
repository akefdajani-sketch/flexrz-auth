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

  // IMPORTANT:
  // Do NOT forward Google id_tokens via URL fragments (/#id_token=...).
  // Fragments are never sent to the server and they cause the exact symptom
  // you are seeing: landing on app.flexrz.com/#id_token=... with routing broken.
  //
  // The canonical approach here is:
  //   1) NextAuth sets a session cookie for Domain=.flexrz.com (configured in auth)
  //   2) app.flexrz.com reads the shared session cookie (consumer) via next-auth/jwt getToken()
  //
  // So we ignore the Google id token here and simply redirect.
  void token;

  return NextResponse.redirect(to, 302);
}
