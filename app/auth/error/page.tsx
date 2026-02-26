import Link from "next/link";

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const err = searchParams?.error || "unknown";

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold">Authentication error</h1>
        <p className="mt-2 text-sm text-white/70">
          NextAuth reported an error during sign-in.
        </p>

        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <div className="text-xs text-white/60">Error code</div>
          <div className="mt-1 font-mono break-all text-sm text-red-200">{err}</div>
        </div>

        <div className="mt-6 text-sm text-white/70 space-y-2">
          <div>
            Open Vercel logs for <span className="font-mono">/api/auth/callback/google</span> and look
            for <span className="font-mono">[NextAuth error]</span>.
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-mono">invalid_client</span> → wrong GOOGLE_CLIENT_SECRET for the
              client ID.
            </li>
            <li>
              <span className="font-mono">redirect_uri_mismatch</span> → missing/incorrect Google
              redirect URI.
            </li>
            <li>
              <span className="font-mono">OAuthCallback</span> / <span className="font-mono">CallbackRouteError</span> → check cookie/state/PKCE.
            </li>
          </ul>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
            href="/auth/signin"
          >
            Back to sign in
          </Link>
          <a
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
            href="https://flexrz.com"
          >
            Go to flexrz.com
          </a>
        </div>
      </div>
    </div>
  );
}
