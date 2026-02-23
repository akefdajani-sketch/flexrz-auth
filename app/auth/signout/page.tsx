import { Suspense } from "react";
import SignoutClient from "./SignoutClient";

export const dynamic = "force-dynamic";

export default function SignoutPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Signing you out…</div>}>
      <SignoutClient />
    </Suspense>
  );
}
