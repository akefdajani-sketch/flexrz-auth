// sentry.client.config.ts — PR-02: flexrz-auth client Sentry
import * as Sentry from '@sentry/nextjs';
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0,
  ignoreErrors: ['NEXT_NOT_FOUND', 'NEXT_REDIRECT'],
});
