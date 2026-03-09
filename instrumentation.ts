// instrumentation.ts — PR-02: Sentry for flexrz-auth
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      enabled: Boolean(process.env.SENTRY_DSN),
      tracesSampleRate: 0,
      ignoreErrors: ['NEXT_NOT_FOUND', 'NEXT_REDIRECT'],
    });
  }
}
