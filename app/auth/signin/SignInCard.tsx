
"use client";

import Image from "next/image";

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className="h-5 w-5"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.72 1.22 9.23 3.62l6.87-6.87C35.9 2.44 30.4 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8 6.22C12.47 13.3 17.79 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.62-.14-3.18-.41-4.7H24v9.01h12.43c-.54 2.9-2.2 5.36-4.7 7.03l7.26 5.63C43.41 37.5 46.1 31.5 46.1 24.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.56 28.44a14.6 14.6 0 0 1-.76-4.44c0-1.54.26-3.02.76-4.44l-8-6.22A23.96 23.96 0 0 0 0 24c0 3.88.93 7.55 2.56 10.66l8-6.22z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.4 0 11.78-2.1 15.7-5.7l-7.26-5.63c-2.01 1.35-4.58 2.15-8.44 2.15-6.21 0-11.53-3.8-13.44-9.95l-8 6.22C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function SignInCard({ callbackUrl, error }: { callbackUrl: string; error?: string | null }) {
  const onClick = async () => {
    // IMPORTANT: We must preserve the *full* callbackUrl (including /book/<slug>).
    // In some environments, next-auth/react `signIn()` can end up collapsing the
    // callbackUrl to origin-only. To eliminate that risk, navigate directly to
    // the NextAuth signin route with an explicit callbackUrl query param.
    const params = new URLSearchParams();
    params.set("callbackUrl", callbackUrl);
    window.location.assign(`/api/auth/signin/google?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-6 shadow-xl backdrop-blur">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-white">Sign in to Flexrz</h1>
        <p className="text-sm text-white/70">
          Continue with Google to access your dashboard and booking experiences.
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <div className="font-medium">Sign-in error</div>
          <div className="mt-1 break-all opacity-90">{error}</div>
          <div className="mt-2 text-xs text-red-200/70">
            Check Vercel logs for a line starting with <span className="font-mono">[NextAuth error]</span>.
          </div>
        </div>
      ) : null}

      <button
        onClick={onClick}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-black hover:bg-white/90"
      >
        <GoogleMark />
        <span>Continue with Google</span>
      </button>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/50">
        <span>Powered by</span>
        <Image
          src="/brand/flexrz-logo-outline-light.svg"
          alt="Flexrz"
          width={64}
          height={16}
          className="opacity-80"
          priority
        />
      </div>
    </div>
  );
}
