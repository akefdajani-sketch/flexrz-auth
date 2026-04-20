"use client";

// ---------------------------------------------------------------------------
// MembershipPurchaseModalAtoms — pure helpers + small presentational primitives
// extracted from MembershipPurchaseModal. All stateless, all pure; parent
// keeps the two-phase purchase flow + wiring.
//
// PR A2.2: fmtPrice() now delegates to lib/tax/taxFormatting.formatMoney so
// all price rendering uses the same rounding + Intl + fallback behavior as
// the <TaxLine> primitive. Callers that still need a plain string can keep
// using fmtPrice(); callers that want tax breakdown should use <TaxLine />
// directly.
// ---------------------------------------------------------------------------

import React from "react";
import type { MembershipPlan } from "@/types/booking";
import { formatMoney } from "@/lib/tax/taxFormatting";

// ── Helpers ────────────────────────────────────────────────────────────────

export function fmtCredits(p: MembershipPlan): string | null {
  if (typeof p.included_minutes === "number" && p.included_minutes > 0) {
    const hrs = Math.round((p.included_minutes / 60) * 10) / 10;
    return `${hrs} hrs`;
  }
  if (typeof p.included_uses === "number" && (p.included_uses as number) > 0)
    return `${p.included_uses} uses`;
  return null;
}

export function fmtValidity(p: MembershipPlan): string | null {
  const days = p.validity_days;
  if (!days) return null;
  if (days % 30 === 0) {
    const m = days / 30;
    return m === 1 ? "1 month" : `${m} months`;
  }
  return `${days} days`;
}

// PR A2.2: delegates to the TaxLine primitive's formatter.
// Returns null (caller renders "Free") when price is null — preserves the
// existing contract so the parent modal can branch on hasPrice.
export function fmtPrice(p: MembershipPlan): string | null {
  if (p.price == null) return null;
  const cur = String(p.currency || "JOD").trim();
  return formatMoney(p.price, cur);
}

export const METHOD_LABELS: Record<string, string> = {
  card: "Credit / Debit card",
  cliq: "CliQ",
  cash: "Cash",
};

// ── Shared layout primitives ───────────────────────────────────────────────

export const HR = () => (
  <div style={{ height: 1, background: "var(--bf-border, rgba(0,0,0,0.08))", margin: 0 }} />
);

export function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="var(--bf-text-muted, #9ca3af)" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function TagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="var(--bf-text-soft, #9ca3af)" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" fill="var(--bf-text-soft, #9ca3af)" stroke="none" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="var(--bf-text-soft, #9ca3af)" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export const LBL: React.CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--bf-text-soft, #9ca3af)",
  marginBottom: 2,
  fontWeight: 700,
};
