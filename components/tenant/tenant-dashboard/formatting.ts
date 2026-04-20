// ---------------------------------------------------------------------------
// TenantDashboardClient — generic formatting helpers
//
// Pure display and numeric helpers. No React, no side effects. Extracted
// verbatim from the former TenantDashboardClient.tsx monolith.
// ---------------------------------------------------------------------------

import type { TimeMode } from "@/components/shared/TimeContextBar";
import { formatMoney } from "@/lib/tax/taxFormatting";

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// PR A2.3: delegates to lib/tax/formatMoney for consistent rendering.
export function fmtMoney(amount: string | number, currency: string | null) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  if (!currency) return n.toFixed(2);
  return formatMoney(n, currency);
}



export function shiftAnchorDate(mode: TimeMode, dateStr: string) {
  const base = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) return dateStr;
  if (mode === "day") base.setUTCDate(base.getUTCDate() - 1);
  else if (mode === "week") base.setUTCDate(base.getUTCDate() - 7);
  else base.setUTCMonth(base.getUTCMonth() - 1);
  return base.toISOString().slice(0, 10);
}


export function pctDelta(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null) return null;
  const a = Number(current);
  const b = Number(previous);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a - b;
}


export function fmtDelta(delta: number | null | undefined, suffix = "") {
  if (delta == null || !Number.isFinite(delta)) return undefined;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${Math.round(delta * 10) / 10}${suffix}`;
}

export function fmtMinutes(mins: number | null | undefined) {
  const n = Number(mins);
  if (!Number.isFinite(n) || n <= 0) return "0h";
  if (n < 60) return `${Math.round(n)}m`;
  const hours = n / 60;
  return `${Math.round(hours * 10) / 10}h`;
}


export function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}


export function titleFromSlug(slug: string) {
  const cleaned = slug.replace(/[-_]+/g, " ").trim();
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

