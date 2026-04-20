"use client";

// ---------------------------------------------------------------------------
// PackagePurchaseModalAtoms — helpers + primitives for PackagePurchaseModal.
//
// The HR divider, icon SVGs (UserIcon/TagIcon/CalendarIcon), LBL style
// constant, and METHOD_LABELS payment-method map are BYTE-IDENTICAL to
// the ones used by MembershipPurchaseModal. Rather than maintaining two
// copies, this file re-exports those symbols from the sibling atoms
// module. Only fmtMoney is Package-specific (handles nullable amount with
// "Free" fallback, vs MembershipPurchaseModal's fmtPrice which returns
// null when price is null).
//
// PR A2.2: fmtMoney delegates to lib/tax/taxFormatting.formatMoney for
// consistent currency handling across the product. The "Free" fallback
// stays here because parent component relies on that exact contract.
// ---------------------------------------------------------------------------

import { formatMoney } from "@/lib/tax/taxFormatting";

// Re-export shared primitives from the Membership atoms module.
export {
  HR,
  UserIcon,
  TagIcon,
  CalendarIcon,
  LBL,
  METHOD_LABELS,
} from "./MembershipPurchaseModalAtoms";

// ── Package-specific helpers ────────────────────────────────────────────────

// PR A2.2: delegates to lib/tax for currency formatting.
// Returns "Free" for null amounts — preserves the existing contract.
export function fmtMoney(amount: number | null | undefined, currency: string): string {
  if (amount == null) return "Free";
  return formatMoney(amount, currency || "JOD");
}
