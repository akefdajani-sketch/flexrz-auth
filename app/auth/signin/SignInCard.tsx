"use client";

import { signIn } from "next-auth/react";

export function SignInCard({ callbackUrl }: { callbackUrl: string }) {
  const onClick = async () => {
    // IMPORTANT: respect the callbackUrl passed in from /api/auth/signin.
    // Do NOT force /return here — that breaks booking flows (flexrz.com/book/*)
    // and causes unexpected redirects to app.flexrz.com.
    await signIn("google", { callbackUrl });
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-6 shadow-xl backdrop-blur">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-white">Sign in to Flexrz</h1>
        <p className="text-sm text-white/70">
          Continue with Google to access your dashboard and booking experiences.
        </p>
      </div>

      <button
        onClick={onClick}
        className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black hover:bg-white/90"
      >
        Continue with Google
      </button>
    </div>
  );
}
