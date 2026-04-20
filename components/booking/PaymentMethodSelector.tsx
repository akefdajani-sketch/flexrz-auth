"use client";

// components/booking/PaymentMethodSelector.tsx
// PAY-2: Let customer choose payment method before confirming a priced booking.
// Only shown when the service has a price AND the customer isn't paying with
// membership or package credits.
//
// Tenant controls which methods are available via their payment settings.

import React from "react";
import { formatMoney } from "@/lib/tax/taxFormatting";

export type PaymentMethod = "card" | "cliq" | "cash";

type MethodConfig = {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: string;
};

const METHODS: MethodConfig[] = [
  {
    id:          "card",
    label:       "Credit / Debit card",
    description: "Pay securely online via Visa or Mastercard",
    icon:        "💳",
  },
  {
    id:          "cliq",
    label:       "CliQ",
    description: "Pay instantly via Jordan's CliQ network",
    icon:        "⚡",
  },
  {
    id:          "cash",
    label:       "Cash",
    description: "Pay in person at the venue",
    icon:        "💵",
  },
];

type Props = {
  availableMethods: PaymentMethod[];
  selected: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  amount: number;
  currency?: string;
  disabled?: boolean;
};

export function PaymentMethodSelector({
  availableMethods,
  selected,
  onChange,
  amount,
  currency = "JOD",
  disabled = false,
}: Props) {
  const visibleMethods = METHODS.filter((m) => availableMethods.includes(m.id));

  if (visibleMethods.length === 0) return null;

  // PR A2.3: delegates to lib/tax/formatMoney for consistent rendering.
  const fmtAmount = () => formatMoney(amount, currency);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--bf-text, inherit)", marginBottom: 4 }}>
        Payment method
      </div>

      {/* 3 equal tiles in a row */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${visibleMethods.length}, 1fr)`, gap: 8 }}>
        {visibleMethods.map((method) => {
          const isSelected = selected === method.id;
          return (
            <button
              key={method.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(method.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "14px 8px",
                borderRadius: 12,
                border: isSelected
                  ? "2px solid var(--bf-brand-primary, #356e35)"
                  : "1px solid var(--bf-border, rgba(255,255,255,0.12))",
                background: isSelected
                  ? "var(--bf-brand-primary-alpha, rgba(53,110,53,0.08))"
                  : "var(--bf-surface, rgba(255,255,255,0.04))",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
                transition: "border-color 0.15s, background 0.15s",
                position: "relative" as const,
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{method.icon}</span>
              <div style={{
                fontSize: 11,
                fontWeight: isSelected ? 800 : 600,
                color: isSelected
                  ? "var(--bf-brand-primary, #356e35)"
                  : "var(--bf-text, inherit)",
                textAlign: "center" as const,
                lineHeight: 1.2,
              }}>
                {method.label}
              </div>
              {isSelected && (
                <div style={{
                  position: "absolute" as const,
                  top: 6, right: 6,
                  width: 16, height: 16,
                  borderRadius: 999,
                  background: "var(--bf-brand-primary, #356e35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                }}>✓</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
