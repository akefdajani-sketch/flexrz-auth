// lib/tax/taxFormatting.ts
// ---------------------------------------------------------------------------
// PR A2.1 — Pure formatting + math helpers for the <TaxLine> primitive.
//
// All price rendering in FlexRz routes through <TaxLine>. This file owns the
// math and currency-formatting; the JSX component lives at
// components/ui/TaxLine.tsx.
//
// NO React imports. Pure functions only — easy to test, easy to use in
// hooks, emails, and backend contexts.
// ---------------------------------------------------------------------------

export type TaxMode = "inclusive" | "exclusive";

// Matches the tenant tax config shape already in use across the codebase
// (see routes/bookings/..., app/book/[slug]/setup/sections/TaxSection.tsx).
export type TenantTaxConfig = {
  tax_inclusive: boolean;
  vat_rate: number | null;          // decimal, e.g. 0.16 for 16%
  vat_label: string | null;         // "VAT", "GST", etc.
  service_charge_rate: number | null;
  service_charge_label: string | null;
  show_breakdown: boolean;          // tenant preference: show breakdown or totals-only
};

// Output shape for a single line breakdown
export type TaxBreakdown = {
  subtotal: number;
  vatAmount: number;
  vatLabel: string;
  vatRate: number;
  serviceChargeAmount: number;
  serviceChargeLabel: string;
  serviceChargeRate: number;
  total: number;
  currency: string;
  mode: TaxMode;
  hasAnyTax: boolean;
};

export const ZERO_BREAKDOWN: TaxBreakdown = {
  subtotal: 0,
  vatAmount: 0,
  vatLabel: "",
  vatRate: 0,
  serviceChargeAmount: 0,
  serviceChargeLabel: "",
  serviceChargeRate: 0,
  total: 0,
  currency: "",
  mode: "exclusive",
  hasAnyTax: false,
};

// ─── Core math ───────────────────────────────────────────────────────────────

/**
 * Given a base amount (what the customer is charged before taxes in exclusive
 * mode, or the FINAL total-including-tax in inclusive mode) and a tenant tax
 * config, compute the full breakdown.
 *
 * Inclusive mode: `amount` is the tax-included total. We back out VAT and
 *                 service charge so the display can show them separately.
 * Exclusive mode: `amount` is the pre-tax subtotal. We add VAT and service
 *                 charge on top.
 *
 * Service charge is computed on the pre-VAT subtotal (standard MENA practice).
 * VAT is then computed on (subtotal + service_charge).
 * In inclusive mode, that order is reversed when backing out.
 */
export function computeTaxBreakdown(
  amount: number | null | undefined,
  config: Partial<TenantTaxConfig> | null | undefined,
  currency: string | null | undefined = null,
): TaxBreakdown {
  const amt = safeNum(amount);
  if (amt <= 0 || !config) {
    return { ...ZERO_BREAKDOWN, currency: currency || "" };
  }

  const vatRate = clampRate(config.vat_rate);
  const scRate = clampRate(config.service_charge_rate);
  const vatLabel = String(config.vat_label || "VAT").trim() || "VAT";
  const scLabel = String(config.service_charge_label || "Service charge").trim() || "Service charge";
  const inclusive = !!config.tax_inclusive;

  let subtotal: number;
  let scAmount: number;
  let vatAmount: number;
  let total: number;

  if (inclusive) {
    // amount = subtotal * (1 + scRate) * (1 + vatRate)
    // Back out: subtotal = amount / ((1 + scRate) * (1 + vatRate))
    const divisor = (1 + scRate) * (1 + vatRate);
    subtotal = divisor > 0 ? amt / divisor : amt;
    scAmount = subtotal * scRate;
    vatAmount = (subtotal + scAmount) * vatRate;
    total = amt;
  } else {
    subtotal = amt;
    scAmount = subtotal * scRate;
    vatAmount = (subtotal + scAmount) * vatRate;
    total = subtotal + scAmount + vatAmount;
  }

  // Round to 2 dp AFTER all computations to avoid compounding fp errors.
  return {
    subtotal: round2(subtotal),
    vatAmount: round2(vatAmount),
    vatLabel,
    vatRate,
    serviceChargeAmount: round2(scAmount),
    serviceChargeLabel: scLabel,
    serviceChargeRate: scRate,
    total: round2(total),
    currency: currency || "",
    mode: inclusive ? "inclusive" : "exclusive",
    hasAnyTax: vatRate > 0 || scRate > 0,
  };
}

/**
 * Some data sources (the pricing quote endpoint) return the breakdown already
 * computed by the backend. This function normalizes that payload into the
 * same TaxBreakdown shape so the primitive can consume either source.
 */
export function normalizeBackendBreakdown(
  backend: {
    subtotal?: number | null;
    vat_amount?: number | null;
    vat_label?: string | null;
    vat_rate?: number | null;
    service_charge_amount?: number | null;
    service_charge_label?: string | null;
    service_charge_rate?: number | null;
    total?: number | null;
    tax_inclusive?: boolean;
    currency_code?: string | null;
  } | null | undefined,
  fallbackCurrency: string = "",
): TaxBreakdown | null {
  if (!backend) return null;

  const subtotal = safeNum(backend.subtotal);
  const vatAmount = safeNum(backend.vat_amount);
  const scAmount = safeNum(backend.service_charge_amount);
  const total = safeNum(backend.total);

  if (subtotal <= 0 && total <= 0) return null;

  return {
    subtotal: round2(subtotal),
    vatAmount: round2(vatAmount),
    vatLabel: String(backend.vat_label || "VAT").trim() || "VAT",
    vatRate: clampRate(backend.vat_rate),
    serviceChargeAmount: round2(scAmount),
    serviceChargeLabel: String(backend.service_charge_label || "Service charge").trim() || "Service charge",
    serviceChargeRate: clampRate(backend.service_charge_rate),
    total: round2(total || subtotal + vatAmount + scAmount),
    currency: backend.currency_code || fallbackCurrency || "",
    mode: backend.tax_inclusive ? "inclusive" : "exclusive",
    hasAnyTax: (safeNum(backend.vat_rate) > 0) || (safeNum(backend.service_charge_rate) > 0),
  };
}

// ─── Currency formatting ─────────────────────────────────────────────────────

/**
 * Format a money amount with a currency code. Uses Intl when possible,
 * falls back to `<amount> <currency>` if the currency code isn't recognized
 * (common for "JD", "JOD" variations).
 *
 * Always returns 2 decimal places. Returns "—" for non-finite inputs.
 */
export function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined = "",
  opts: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    locale?: string;
  } = {},
): string {
  if (amount == null) return "—";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";

  const cur = String(currency || "").trim();
  const maxFd = opts.maximumFractionDigits ?? 2;
  const minFd = opts.minimumFractionDigits ?? 2;

  if (!cur) {
    return n.toFixed(maxFd);
  }

  try {
    return new Intl.NumberFormat(opts.locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: maxFd,
      minimumFractionDigits: minFd,
    }).format(n);
  } catch {
    // Unknown currency code (e.g. "JD") — fall back to plain + suffix.
    return `${n.toFixed(maxFd)} ${cur}`;
  }
}

/**
 * Format a percentage (takes decimal input e.g. 0.16 → "16%").
 */
export function formatPercent(rate: number | null | undefined, digits = 0): string {
  const n = safeNum(rate);
  return `${(n * 100).toFixed(digits)}%`;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function safeNum(v: any): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clampRate(v: any): number {
  const n = safeNum(v);
  // Sanity: tax rates should be 0–1. Reject anything over 100% (probably a
  // data error — could be stored as percentage instead of decimal).
  if (n < 0) return 0;
  if (n > 1) return n / 100;  // interpret as percentage; recover gracefully
  return n;
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  // Standard round-half-away-from-zero to 2 dp
  return Math.round(n * 100) / 100;
}
