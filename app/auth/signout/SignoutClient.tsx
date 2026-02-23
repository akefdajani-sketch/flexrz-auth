"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function SignoutClient({ callbackUrl }: { callbackUrl: string }) {
  useEffect(() => {
    signOut({ callbackUrl });
  }, [callbackUrl]);

  return (
    <main
      style={{
        padding: 24,
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 18 }}>Signing you out…</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>One moment.</p>
    </main>
  );
}
