"use client";

import { signIn } from "next-auth/react";

export function SignInCard({ callbackUrl }: { callbackUrl: string }) {
  const onClick = async () => {
    // Force an account chooser so users aren't "stuck" in the last Google account.
    await signIn("google", { callbackUrl }, { prompt: "select_account" });
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.kicker}>CUSTOMER SIGN IN</div>
        <div style={styles.title}>Log in to manage your bookings</div>
        <div style={styles.sub}>
          Use your Google account to sign in. After that you’ll continue back
          to the app.
        </div>
        <button type="button" onClick={onClick} style={styles.button}>
          <span style={styles.googleDot} aria-hidden />
          Continue with Google
        </button>
        <div style={styles.powered}>Powered by Flexrz</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(800px 400px at 50% 20%, rgba(60, 240, 160, 0.16), transparent 55%), #0b0f14",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    padding: 24,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    color: "#eaf2ff",
    backdropFilter: "blur(10px)",
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 0.9,
    opacity: 0.72,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 8,
  },
  sub: {
    fontSize: 13,
    lineHeight: 1.5,
    opacity: 0.8,
    marginBottom: 18,
  },
  button: {
    width: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "#0f172a",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 999,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  googleDot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    background:
      "conic-gradient(#4285F4 0 25%, #34A853 0 50%, #FBBC05 0 75%, #EA4335 0 100%)",
    boxShadow: "0 0 0 2px rgba(255,255,255,0.06) inset",
  },
  powered: {
    marginTop: 14,
    fontSize: 12,
    opacity: 0.6,
    textAlign: "center",
  },
};
