import Link from "next/link";

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const err = searchParams?.error || "unknown";

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center p-6">
      <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-6 shadow-xl backdrop-blur">
        <h1 className="text-xl font-semibold text-white">Authentication Error</h1>
        <p className="mt-2 text-sm text-white/70">
          Something went wrong while completing sign-in.
        </p>

        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <div className="font-medium">Error</div>
          <div className="mt-1 break-all font-mono text-xs">{err}</div>
        </div>

        <div className="mt-4 text-sm text-white/70">
          Open Vercel logs for <span className="font-mono">flexrz-auth</span> and search for
          <span className="mx-1 rounded bg-white/10 px-1 font-mono">[NextAuth error]</span>
          to see the root cause.
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/auth/signin"
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
          >
            Back to Sign In
          </Link>
          <a
            href="https://flexrz.com"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            Go to Flexrz
          </a>
        </div>
      </div>
    </div>
  );
}
