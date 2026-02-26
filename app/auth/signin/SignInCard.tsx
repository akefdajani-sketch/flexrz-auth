"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.72 1.22 9.23 3.62l6.87-6.87C35.9 2.44 30.4 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8 6.22C12.47 13.3 17.79 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.14-3.09-.4-4.55H24v9.02h12.95c-.58 2.9-2.21 5.36-4.69 7.02l7.26 5.63c4.26-3.93 6.46-9.72 6.46-17.14z"
      />
      <path
        fill="#FBBC05"
        d="M10.56 28.44c-.48-1.45-.76-2.99-.76-4.44s.27-2.99.76-4.44l-8-6.22C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.66l8-6.22z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.4 0 11.78-2.1 15.7-5.7l-7.26-5.63c-2.01 1.35-4.58 2.15-8.44 2.15-6.21 0-11.53-3.8-13.44-9.95l-8 6.22C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function SignInCard({
  callbackUrl,
  error,
}: {
  callbackUrl: string;
  error?: string | null;
}) {
  const onClick = async () => {
    // Hardening: overwrite the NextAuth callback-url cookie so stale values (e.g. "/")
    // can't hijack the post-login redirect.
    // We set it server-side on auth.flexrz.com with Domain=.flexrz.com so it applies to flexrz.com.
    try {
      await fetch(`/api/auth/set-callback?callbackUrl=${encodeURIComponent(callbackUrl)}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
      });
    } catch {
      // If this fails, we still attempt sign-in (better than blocking), but redirects may fall back to "/".
    }

    // ✅ Use NextAuth client helper so CSRF + state cookies are created correctly.
    // This prevents the immediate bounce back to /auth/signin?error=google.
    await signIn("google", {
      callbackUrl,
      redirect: true,
    });
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-6 shadow-xl backdrop-blur">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-white">Sign in to Flexrz</h1>
        <p className="text-sm text-white/70">Continue with Google to access your dashboard and booking experiences.</p>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
          Sign-in failed. Please try again.
        </div>
      ) : null}

      <button
        type="button"
        onClick={onClick}
        className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 active:scale-[0.99]"
      >
        <GoogleMark />
        Continue with Google
      </button>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/50">
        <span>Powered by</span>
        <Image src="/brand/flexrz-logo-outline-light.svg" alt="Flexrz" width={48} height={16} />
      </div>
    </div>
  );
}
