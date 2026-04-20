// __tests__/ui/TaxLine.test.tsx
// ---------------------------------------------------------------------------
// PR A2.1 — Tests for the <TaxLine> primitive and its math helpers.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import TaxLine from "@/components/ui/TaxLine";
import {
  computeTaxBreakdown,
  formatMoney,
  normalizeBackendBreakdown,
} from "@/lib/tax/taxFormatting";

// ─── Math helpers ────────────────────────────────────────────────────────────

describe("computeTaxBreakdown", () => {
  it("returns zeroes when amount is null/undefined/0", () => {
    expect(computeTaxBreakdown(null, { vat_rate: 0.16 })).toMatchObject({
      subtotal: 0,
      vatAmount: 0,
      total: 0,
    });
    expect(computeTaxBreakdown(undefined, { vat_rate: 0.16 })).toMatchObject({
      total: 0,
    });
    expect(computeTaxBreakdown(0, { vat_rate: 0.16 })).toMatchObject({
      total: 0,
    });
  });

  it("returns zeroes when config is null", () => {
    expect(computeTaxBreakdown(100, null)).toMatchObject({
      total: 0,
    });
  });

  it("exclusive mode: adds VAT on top", () => {
    const result = computeTaxBreakdown(
      100,
      { tax_inclusive: false, vat_rate: 0.16, vat_label: "VAT" },
      "JOD",
    );
    expect(result.subtotal).toBe(100);
    expect(result.vatAmount).toBe(16);
    expect(result.total).toBe(116);
    expect(result.currency).toBe("JOD");
    expect(result.mode).toBe("exclusive");
    expect(result.hasAnyTax).toBe(true);
  });

  it("inclusive mode: backs out VAT from total", () => {
    // 116 inclusive → subtotal 100, VAT 16
    const result = computeTaxBreakdown(
      116,
      { tax_inclusive: true, vat_rate: 0.16 },
      "JOD",
    );
    expect(result.subtotal).toBe(100);
    expect(result.vatAmount).toBe(16);
    expect(result.total).toBe(116);
    expect(result.mode).toBe("inclusive");
  });

  it("exclusive mode: compound service charge + VAT", () => {
    // 100 subtotal, 10% service charge (= 10), VAT on 110 (= 17.6)
    const result = computeTaxBreakdown(
      100,
      {
        tax_inclusive: false,
        vat_rate: 0.16,
        service_charge_rate: 0.10,
        vat_label: "VAT",
        service_charge_label: "Service charge",
      },
      "JOD",
    );
    expect(result.subtotal).toBe(100);
    expect(result.serviceChargeAmount).toBe(10);
    expect(result.vatAmount).toBe(17.6);
    expect(result.total).toBe(127.6);
  });

  it("zero-rated: no tax when rates are 0", () => {
    const result = computeTaxBreakdown(
      50,
      { tax_inclusive: false, vat_rate: 0, service_charge_rate: 0 },
      "JOD",
    );
    expect(result.total).toBe(50);
    expect(result.hasAnyTax).toBe(false);
  });

  it("handles rate stored as percentage (data-entry error recovery)", () => {
    // If someone stores 16 instead of 0.16, we recover gracefully
    const result = computeTaxBreakdown(
      100,
      { tax_inclusive: false, vat_rate: 16 as any },
      "JOD",
    );
    expect(result.vatAmount).toBe(16);
    expect(result.vatRate).toBe(0.16);
  });

  it("rejects negative rates", () => {
    const result = computeTaxBreakdown(
      100,
      { tax_inclusive: false, vat_rate: -0.16 as any },
      "JOD",
    );
    expect(result.vatAmount).toBe(0);
  });

  it("uses default labels when missing", () => {
    const result = computeTaxBreakdown(
      100,
      { tax_inclusive: false, vat_rate: 0.16 },
      "JOD",
    );
    expect(result.vatLabel).toBe("VAT");
  });
});

describe("formatMoney", () => {
  it("returns — for null/undefined", () => {
    expect(formatMoney(null, "JOD")).toBe("—");
    expect(formatMoney(undefined, "JOD")).toBe("—");
    expect(formatMoney(NaN, "JOD")).toBe("—");
  });

  it("formats with 2 decimals by default", () => {
    const result = formatMoney(100, "USD", { locale: "en-US" });
    // Intl will render $100.00 for known currencies
    expect(result).toMatch(/100\.00/);
  });

  it("falls back gracefully for unknown currency", () => {
    const result = formatMoney(50, "JD");
    expect(result).toBe("50.00 JD");
  });

  it("renders without currency when empty", () => {
    expect(formatMoney(42, "")).toBe("42.00");
  });
});

describe("normalizeBackendBreakdown", () => {
  it("returns null for empty input", () => {
    expect(normalizeBackendBreakdown(null)).toBeNull();
    expect(normalizeBackendBreakdown(undefined)).toBeNull();
  });

  it("normalizes backend pricing quote payload", () => {
    const backend = {
      subtotal: 100,
      vat_amount: 16,
      vat_label: "VAT",
      vat_rate: 0.16,
      service_charge_amount: 10,
      service_charge_label: "Service",
      service_charge_rate: 0.10,
      total: 126,
      tax_inclusive: false,
      currency_code: "JOD",
    };
    const result = normalizeBackendBreakdown(backend);
    expect(result).toMatchObject({
      subtotal: 100,
      vatAmount: 16,
      serviceChargeAmount: 10,
      total: 126,
      currency: "JOD",
      mode: "exclusive",
      hasAnyTax: true,
    });
  });

  it("handles missing fields gracefully", () => {
    const result = normalizeBackendBreakdown({ subtotal: 50 });
    expect(result).toMatchObject({
      subtotal: 50,
      vatAmount: 0,
      total: 50,
    });
  });
});

// ─── Component rendering ─────────────────────────────────────────────────────

describe("<TaxLine /> — total-only", () => {
  it("renders Free when amount is 0", () => {
    render(<TaxLine amount={0} currency="JOD" display="total-only" />);
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("renders the total amount", () => {
    render(<TaxLine amount={100} currency="JOD" display="total-only" />);
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });
});

describe("<TaxLine /> — compact", () => {
  it("renders amount with '+ tax' suffix in exclusive mode", () => {
    render(
      <TaxLine
        amount={100}
        currency="JOD"
        taxConfig={{ tax_inclusive: false, vat_rate: 0.16 }}
        display="compact"
      />,
    );
    expect(screen.getByText(/116/)).toBeInTheDocument();
    expect(screen.getByText(/\+ tax/)).toBeInTheDocument();
  });

  it("renders amount with 'incl. tax' suffix in inclusive mode", () => {
    render(
      <TaxLine
        amount={116}
        currency="JOD"
        taxConfig={{ tax_inclusive: true, vat_rate: 0.16 }}
        display="compact"
      />,
    );
    expect(screen.getByText(/116/)).toBeInTheDocument();
    expect(screen.getByText(/incl\. tax/)).toBeInTheDocument();
  });

  it("no suffix when no tax config", () => {
    render(<TaxLine amount={100} currency="JOD" display="compact" />);
    expect(screen.queryByText(/\+ tax/)).not.toBeInTheDocument();
    expect(screen.queryByText(/incl\. tax/)).not.toBeInTheDocument();
  });
});

describe("<TaxLine /> — breakdown", () => {
  it("shows subtotal, VAT, and total rows", () => {
    render(
      <TaxLine
        amount={100}
        currency="JOD"
        taxConfig={{ tax_inclusive: false, vat_rate: 0.16, vat_label: "VAT" }}
        display="breakdown"
      />,
    );
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("VAT")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("adds service charge row when rate > 0", () => {
    render(
      <TaxLine
        amount={100}
        currency="JOD"
        taxConfig={{
          tax_inclusive: false,
          vat_rate: 0.16,
          service_charge_rate: 0.10,
          service_charge_label: "Service charge",
        }}
        display="breakdown"
      />,
    );
    expect(screen.getByText("Service charge")).toBeInTheDocument();
  });

  it("shows 'Prices include tax' footnote in inclusive mode", () => {
    render(
      <TaxLine
        amount={116}
        currency="JOD"
        taxConfig={{ tax_inclusive: true, vat_rate: 0.16 }}
        display="breakdown"
      />,
    );
    expect(screen.getByText(/Prices include tax/i)).toBeInTheDocument();
  });

  it("uses custom total label", () => {
    render(
      <TaxLine
        amount={100}
        currency="JOD"
        taxConfig={{ tax_inclusive: false, vat_rate: 0.16 }}
        display="breakdown"
        totalLabel="Grand total"
      />,
    );
    expect(screen.getByText("Grand total")).toBeInTheDocument();
  });
});

describe("<TaxLine /> — edge cases", () => {
  it("accepts pre-computed breakdown from backend", () => {
    const breakdown = normalizeBackendBreakdown({
      subtotal: 100,
      vat_amount: 16,
      total: 116,
      tax_inclusive: false,
      currency_code: "JOD",
    });
    render(<TaxLine breakdown={breakdown} display="total-only" />);
    expect(screen.getByText(/116/)).toBeInTheDocument();
  });

  it("renders Free for zero-amount compact", () => {
    render(<TaxLine amount={0} currency="JOD" display="compact" />);
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("honors showFreeWhenZero=false", () => {
    render(
      <TaxLine
        amount={0}
        currency="JOD"
        display="total-only"
        showFreeWhenZero={false}
      />,
    );
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
  });

  it("forwards data-testid", () => {
    render(
      <TaxLine
        amount={100}
        currency="JOD"
        display="total-only"
        data-testid="my-price"
      />,
    );
    expect(screen.getByTestId("my-price")).toBeInTheDocument();
  });
});
