"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";

export default function SignOutPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  useEffect(() => {
    // Trigger NextAuth sign-out to clear the shared session cookie (Domain=.flexrz.com)
    // then redirect back to the requested callback.
    signOut({ callbackUrl });
  }, [callbackUrl]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#0b1220",
        color: "#e2e8f0",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.18)",
          background: "rgba(15,23,42,0.55)",
          boxShadow: "0 18px 60px rgba(2,6,23,0.55)",
          padding: "20px 18px",
          fontSize: 14,
        }}
      >
        Signing you out…
      </div>
    </main>
  );
}
