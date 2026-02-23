"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function SignoutClient() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const callbackUrl =
      searchParams.get("callbackUrl") ||
      searchParams.get("callback") ||
      "/auth/signin";

    // This triggers NextAuth signout + redirects
    signOut({ callbackUrl });
  }, [searchParams]);

  return <div style={{ padding: 24 }}>Signing you out…</div>;
}
