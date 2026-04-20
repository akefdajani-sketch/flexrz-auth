"use client";

// ---------------------------------------------------------------------------
// PR A2.1 — <TaxLine> primitive.
//
// Single source of truth for rendering any monetary amount in the FlexRz
// product. Every price render — public booking, dashboard, modals, emails,
// PDFs — goes through this component.
//
// Usage examples:
//
//   // 1. Simple inline price, no breakdown:
//   <TaxLine amount={30} currency="JOD" display="total-only" />
//
//   // 2. Full breakdown (subtotal / VAT / service charge / total):
//   <TaxLine amount={30} currency="JOD" taxConfig={tenant.tax_config} display="breakdown" />
//
//   // 3. Pre-computed breakdown from backend pricing quote:
//   <TaxLine breakdown={quote.tax} display="breakdown" />
//
//   // 4. Compact variant for list rows:
//   <TaxLine amount={plan.price} currency={plan.currency} display="compact" />
//
// The ESLint rule `flexrz/no-raw-price-render` (added in PR A2.2) will
// error on any JSX that renders a number adjacent to a currency code unless
// it's inside <TaxLine /> or comes from this module's helpers.
// ---------------------------------------------------------------------------

import React from "react";
import {
  computeTaxBreakdown,
  formatMoney,
  normalizeBackendBreakdown,
  type TaxBreakdown,
  type TenantTaxConfig,
} from "@/lib/tax/taxFormatting";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TaxLineDisplay =
  | "total-only"       // just the final amount, no tax detail
  | "compact"          // amount + tax suffix (e.g. "30 JOD incl. VAT")
  | "breakdown"        // full rows: subtotal / service / VAT / total
  | "subtotal-only";   // pre-tax amount only (used in cart summaries)

export type TaxLineProps = {
  /**
   * The amount to render. Interpretation depends on tenant tax config:
   * - If `tax_inclusive=true`, this is the customer-facing total.
   * - If `tax_inclusive=false`, this is the pre-tax subtotal.
   * Use EITHER `amount` OR `breakdown` — not both.
   */
  amount?: number | null;

  /**
   * Pre-computed breakdown (from backend pricing quote or other source).
   * Takes precedence over `amount` if both are provided.
   */
  breakdown?: TaxBreakdown | null;

  /** Currency code ("JOD", "USD", etc). Required unless breakdown carries it. */
  currency?: string | null;

  /**
   * Tenant tax configuration. If omitted, renders as zero-tax (just the amount).
   * Fetched from tenant.tax_config on most pages — or passed from parent.
   */
  taxConfig?: Partial<TenantTaxConfig> | null;

  /** Rendering variant. Defaults to `compact`. */
  display?: TaxLineDisplay;

  /** Optional className for the outer wrapper. */
  className?: string;

  /** Optional inline style for the outer wrapper. */
  style?: React.CSSProperties;

  /**
   * When true and amount <= 0, renders "Free" instead of "0.00".
   * Defaults to true.
   */
  showFreeWhenZero?: boolean;

  /**
   * Optional locale override. Defaults to browser locale.
   */
  locale?: string;

  /**
   * Override the "total" label when display="breakdown".
   * Default: "Total"
   */
  totalLabel?: string;

  /** Test-id passthrough for tests. */
  "data-testid"?: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function TaxLine(props: TaxLineProps) {
  const {
    amount,
    breakdown: preComputedBreakdown,
    currency,
    taxConfig,
    display = "compact",
    className,
    style,
    showFreeWhenZero = true,
    locale,
    totalLabel = "Total",
    "data-testid": testId,
  } = props;

  // ── Resolve the breakdown ─────────────────────────────────────────────────
  const breakdown: TaxBreakdown = React.useMemo(() => {
    if (preComputedBreakdown) return preComputedBreakdown;
    return computeTaxBreakdown(amount, taxConfig, currency);
  }, [amount, preComputedBreakdown, taxConfig, currency]);

  const resolvedCurrency = breakdown.currency || currency || "";
  const isFree = breakdown.total <= 0 && showFreeWhenZero && amount !== undefined;

  // ── display="total-only" ──────────────────────────────────────────────────
  if (display === "total-only") {
    if (isFree) {
      return (
        <span className={className} style={style} data-testid={testId}>
          Free
        </span>
      );
    }
    return (
      <span className={className} style={style} data-testid={testId}>
        {formatMoney(breakdown.total, resolvedCurrency, { locale })}
      </span>
    );
  }

  // ── display="subtotal-only" ───────────────────────────────────────────────
  if (display === "subtotal-only") {
    if (isFree) {
      return (
        <span className={className} style={style} data-testid={testId}>
          Free
        </span>
      );
    }
    return (
      <span className={className} style={style} data-testid={testId}>
        {formatMoney(breakdown.subtotal, resolvedCurrency, { locale })}
      </span>
    );
  }

  // ── display="compact" ─────────────────────────────────────────────────────
  if (display === "compact") {
    if (isFree) {
      return (
        <span className={className} style={style} data-testid={testId}>
          Free
        </span>
      );
    }

    const mainAmount = formatMoney(breakdown.total, resolvedCurrency, { locale });
    let suffix: string | null = null;

    if (breakdown.hasAnyTax) {
      suffix = breakdown.mode === "inclusive" ? "incl. tax" : "+ tax";
    }

    return (
      <span className={className} style={style} data-testid={testId}>
        <span>{mainAmount}</span>
        {suffix ? (
          <span
            style={{
              marginLeft: 6,
              fontSize: "0.82em",
              opacity: 0.72,
              fontWeight: "normal",
            }}
          >
            {suffix}
          </span>
        ) : null}
      </span>
    );
  }

  // ── display="breakdown" ───────────────────────────────────────────────────
  // Renders as a vertical stack of rows.
  if (isFree) {
    return (
      <div
        className={className}
        style={{ display: "flex", justifyContent: "space-between", ...style }}
        data-testid={testId}
      >
        <span>{totalLabel}</span>
        <span style={{ fontWeight: 700 }}>Free</span>
      </div>
    );
  }

  const rows: Array<{ label: string; value: number; isTotal?: boolean; muted?: boolean }> = [];

  if (breakdown.hasAnyTax) {
    rows.push({ label: "Subtotal", value: breakdown.subtotal, muted: true });
    if (breakdown.serviceChargeAmount > 0) {
      rows.push({
        label: breakdown.serviceChargeLabel,
        value: breakdown.serviceChargeAmount,
        muted: true,
      });
    }
    if (breakdown.vatAmount > 0) {
      rows.push({
        label: breakdown.vatLabel,
        value: breakdown.vatAmount,
        muted: true,
      });
    }
  }
  rows.push({ label: totalLabel, value: breakdown.total, isTotal: true });

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}
      data-testid={testId}
    >
      {rows.map((row, i) => (
        <div
          key={`${row.label}-${i}`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
            fontSize: row.isTotal ? "1em" : "0.9em",
            fontWeight: row.isTotal ? 700 : 400,
            color: row.muted
              ? "var(--bf-text-muted, #6b7280)"
              : "var(--bf-text-main, inherit)",
            paddingTop: row.isTotal && rows.length > 1 ? 4 : 0,
            borderTop: row.isTotal && rows.length > 1
              ? "1px solid var(--bf-border, rgba(0,0,0,0.08))"
              : "none",
            marginTop: row.isTotal && rows.length > 1 ? 4 : 0,
          }}
        >
          <span>{row.label}</span>
          <span>{formatMoney(row.value, resolvedCurrency, { locale })}</span>
        </div>
      ))}
      {breakdown.mode === "inclusive" && breakdown.hasAnyTax ? (
        <div
          style={{
            fontSize: "0.75em",
            color: "var(--bf-text-muted, #6b7280)",
            marginTop: 2,
            fontStyle: "italic",
          }}
        >
          Prices include tax
        </div>
      ) : null}
    </div>
  );
}

// Re-export helpers so consumers don't need two imports.
export {
  computeTaxBreakdown,
  formatMoney,
  normalizeBackendBreakdown,
  type TaxBreakdown,
  type TenantTaxConfig,
} from "@/lib/tax/taxFormatting";
