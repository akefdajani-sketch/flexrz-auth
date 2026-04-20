"use client";

// ---------------------------------------------------------------------------
// MembershipsTabSupport — helpers, atoms, and active-membership scoring
// extracted from MembershipsTab. Pure presentational + data utilities; no
// stateful logic. The component file retains all React state, effects, and
// the main render.
//
// PR A2.2: planPriceText() delegates to lib/tax/taxFormatting.formatMoney.
// Callers that want tax breakdown should use <TaxLine /> directly.
// ---------------------------------------------------------------------------

import React from "react";
import type {
  MembershipPlan,
  CustomerMembership,
} from "@/types/booking";
import { formatMoney } from "@/lib/tax/taxFormatting";

// ─── Formatting helpers ──────────────────────────────────────────────────────

export function formatBalance(m: CustomerMembership) {
  if (typeof (m as any).minutes_remaining === "number") {
    const hrs = Math.round((((m as any).minutes_remaining as number) / 60) * 10) / 10;
    return `${hrs} hrs`;
  }
  if (typeof (m as any).uses_remaining === "number") {
    return `${(m as any).uses_remaining} uses`;
  }
  if (typeof (m as any).remaining_minutes === "number") {
    const hrs = Math.round((((m as any).remaining_minutes as number) / 60) * 10) / 10;
    return `${hrs} hrs`;
  }
  if (typeof (m as any).remaining_uses === "number") {
    return `${(m as any).remaining_uses} uses`;
  }
  return "—";
}

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export function planCreditsText(p: MembershipPlan) {
  if (typeof p.included_minutes === "number" && p.included_minutes > 0) {
    const hrs = Math.round((p.included_minutes / 60) * 10) / 10;
    return `${hrs} hrs`;
  }
  if (typeof (p as any).hours === "number") return `${(p as any).hours} hrs`;
  if (typeof p.included_uses === "number" && p.included_uses! > 0) return `${p.included_uses} uses`;
  if (typeof (p as any).uses === "number") return `${(p as any).uses} uses`;
  return "";
}

export function planValidityText(p: MembershipPlan) {
  const days = p.validity_days ?? (p as any).validityDays ?? null;
  if (typeof days === "number" && days > 0) {
    if (days % 30 === 0) {
      const months = days / 30;
      return months === 1 ? "1 month" : `${months} months`;
    }
    return days === 1 ? "1 day" : `${days} days`;
  }
  return "";
}

// PR A2.2: uses formatMoney for consistent currency rendering across product.
export function planPriceText(p: MembershipPlan) {
  if (p.price == null) return "";
  const cur = String(p.currency || "").trim();
  return formatMoney(p.price, cur);
}

export function getPlanForMembership(m: CustomerMembership, plans: MembershipPlan[]) {
  return plans.find((p) => p.id === (m as any).plan_id) || null;
}

export function formatAmount(minutes: number | null | undefined, uses: number | null | undefined) {
  if (typeof minutes === "number") {
    const hrs = Math.round((minutes / 60) * 10) / 10;
    return `${hrs} hrs`;
  }
  if (typeof uses === "number") return `${uses} uses`;
  return "—";
}

export function membershipStartingBalance(m: CustomerMembership, plans: MembershipPlan[]) {
  const plan = getPlanForMembership(m, plans);
  if (plan) {
    if (typeof plan.included_minutes === "number" && plan.included_minutes > 0)
      return { minutes: plan.included_minutes, uses: null as number | null };
    if (typeof plan.included_uses === "number" && plan.included_uses! > 0)
      return { minutes: null as number | null, uses: plan.included_uses! };
  }
  if (typeof (m as any).minutes_granted === "number")
    return { minutes: (m as any).minutes_granted, uses: null as number | null };
  if (typeof (m as any).uses_granted === "number")
    return { minutes: null as number | null, uses: (m as any).uses_granted };
  return { minutes: null as number | null, uses: null as number | null };
}

export function membershipUsedBalance(m: CustomerMembership, plans: MembershipPlan[]) {
  const start = membershipStartingBalance(m, plans);
  const remainingMinutes =
    typeof (m as any).minutes_remaining === "number"
      ? (m as any).minutes_remaining
      : typeof (m as any).remaining_minutes === "number"
      ? (m as any).remaining_minutes
      : null;
  const remainingUses =
    typeof (m as any).uses_remaining === "number"
      ? (m as any).uses_remaining
      : typeof (m as any).remaining_uses === "number"
      ? (m as any).remaining_uses
      : null;
  if (typeof start.minutes === "number" && typeof remainingMinutes === "number")
    return { minutes: Math.max(0, start.minutes - remainingMinutes), uses: null as number | null };
  if (typeof start.uses === "number" && typeof remainingUses === "number")
    return { minutes: null as number | null, uses: Math.max(0, start.uses - remainingUses) };
  return { minutes: null as number | null, uses: null as number | null };
}

// ─── Active-membership scoring ───────────────────────────────────────────────

export function pickActiveMembership(ms: CustomerMembership[]) {
  const now = Date.now();
  const scored = ms
    .map((m) => {
      const status = String((m as any).status || "").toLowerCase();
      const end = (m as any).end_at || (m as any).endAt || null;
      const start =
        (m as any).start_at ||
        (m as any).startAt ||
        (m as any).started_at ||
        (m as any).startedAt ||
        (m as any).created_at ||
        (m as any).createdAt ||
        null;
      const endMs = end ? new Date(end).getTime() : NaN;
      const startMs = start ? new Date(start).getTime() : NaN;
      const notExpiredByDate = !Number.isNaN(endMs) ? endMs > now : true;
      const notExpiredByStatus = status && status !== "expired" && status !== "cancelled";
      const isActive =
        (status === "active" || (!status && true)) && notExpiredByDate && notExpiredByStatus;
      const score = (isActive ? 10_000_000_000 : 0) + (Number.isNaN(startMs) ? 0 : startMs);
      return { m, isActive, score };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return { active: null as CustomerMembership | null, history: [] as CustomerMembership[] };
  const active = best.isActive ? best.m : null;
  const history = active ? ms.filter((x) => x.id !== active.id) : ms;
  return { active, history };
}

// ─── Tiny atoms ──────────────────────────────────────────────────────────────

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", columnGap: 10, alignItems: "start" }}>
      <div style={{ fontWeight: 700, color: "var(--bf-text-main, rgba(15,23,42,0.92))" }}>{label}</div>
      <div style={{ color: "var(--bf-text-main, rgba(15,23,42,0.92))" }}>{value || "—"}</div>
    </div>
  );
}

export function PlanLogo({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) return null;
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid var(--bf-border, rgba(0,0,0,0.12))",
        background: "var(--bf-surface, rgba(255,255,255,0.10))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );
}
