"use client";

// ---------------------------------------------------------------------------
// NightlyBookingDetails — extracted from BookingDetailsCard
//
// Renders the nightly-booking (hotel-style) variant of the booking details
// card. Used for bookings where isNightly is true (check-in + check-out
// dates, per-night pricing, guest count, nights count).
//
// Self-contained: owns its own `fmtMoney`, `fmtNightlyDate`, and
// `nightlyAddons` derivation. Takes only the styling/callback props
// needed from the parent.
// ---------------------------------------------------------------------------

import React, { type ReactNode, type CSSProperties } from "react";
import type { BookingHistoryItem } from "@/types/booking";
import { createGlassCardStyle } from "@/lib/theme/styles";
import { CopyCodeButton } from "./BookingDetailsCard";
import { formatMoney } from "@/lib/tax/taxFormatting";

export type NightlyBookingDetailsProps = {
  title?: string;
  subtitle?: string;
  booking: BookingHistoryItem;
  statusRaw: string;
  primaryButtons?: ReactNode;
  CARD_STYLE?: CSSProperties;
  BD: string;
  TM: string;
  TT: string;
  theme: any;
};

export default function NightlyBookingDetails({
  title,
  subtitle,
  booking,
  statusRaw,
  primaryButtons,
  CARD_STYLE,
  BD,
  TM,
  TT,
  theme,
}: NightlyBookingDetailsProps) {
  const b = booking as any;
  const booking_code = b.booking_code ?? b.bookingCode ?? null;

  const fmtNightlyDate = (d?: string | Date | null) => {
    if (!d) return "—";
    try {
      const obj = d instanceof Date ? d : new Date(String(d).slice(0, 10) + "T12:00:00");
      if (isNaN(obj.getTime())) return String(d).slice(0, 10);
      return obj.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(d).slice(0, 10);
    }
  };

  const nightlyAddons = (() => {
    try {
      const a = (booking as any).addons_json;
      return Array.isArray(a) ? a : typeof a === "string" ? JSON.parse(a) : [];
    } catch {
      return [];
    }
  })();

  const cardSt = CARD_STYLE
    ? { ...CARD_STYLE, width: "100%", boxSizing: "border-box" as const, overflow: "hidden" }
    : createGlassCardStyle(theme, { width: "100%", boxSizing: "border-box" as const, overflow: "hidden" });

  const nights  = (booking as any).nights_count ?? 0;
  const guests  = (booking as any).guests_count ?? 1;
  // price_amount is stored as the TOTAL for all nights.
  // Derive the per-night display rate so "rate × nights = total" is correct.
  const nightlyTotal = booking.price_amount ?? booking.charge_amount ?? null;
  const price   = (nightlyTotal != null && nights > 0) ? nightlyTotal / nights : nightlyTotal;
  const cur     = booking.currency_code || "JOD";
  // PR A2.2: delegates to lib/tax/formatMoney for consistent rendering.
  // Force 2-decimal places to prevent JOD's ISO 3-decimal default from
  // misleading the displayed value (100 fils ≠ 100 dinars).
  const fmtMoney = (n?: number | null) => {
    if (n == null) return "—";
    const num = Number(n);
    if (!Number.isFinite(num)) return "—";
    return formatMoney(num, cur, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const statusColor = { confirmed: "#16a34a", pending: "#ca8a04", cancelled: "#dc2626" }[statusRaw] ?? "#888";
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
      <span style={{ color: TT }}>{label}</span>
      <span style={{ fontWeight: 500, color: TM }}>{value}</span>
    </div>
  );
  const divider = <div style={{ height: 1, background: BD, margin: "8px 0" }} />;

  return (
    <section style={cardSt}>
      {/* Header */}
      <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${BD}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: TM }}>{title}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
            background: `${statusColor}18`, color: statusColor }}>
            ✓ {statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1)}
          </span>
        </div>
        {subtitle && <div style={{ fontSize: 12, color: TT, marginTop: 2 }}>{subtitle}</div>}
        {/* Booking reference code */}
        {booking_code && (
          <div style={{ marginTop: 6 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontFamily: "monospace", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.06em", color: "var(--bf-brand-primary, #0d9488)",
              padding: "3px 8px", borderRadius: 6,
              background: "color-mix(in srgb, var(--bf-brand-primary, #0d9488) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--bf-brand-primary, #0d9488) 25%, transparent)",
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
              </svg>
              {booking_code}
            </span>
            <CopyCodeButton code={booking_code} />
          </div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {/* Customer */}
        {(booking.customer_name) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bf-brand-primary,#0d9488)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>
              {(booking.customer_name[0] || "?").toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{booking.customer_name}</div>
              <div style={{ fontSize: 11, color: TT }}>{booking.customer_email}{booking.customer_phone ? ` · ${booking.customer_phone}` : ""}</div>
            </div>
          </div>
        )}

        {/* Property & Dates */}
        <div style={{ background: "var(--color-background-secondary, rgba(0,0,0,0.04))", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
          {booking.resource_name && <Row label="Property"  value={booking.resource_name} />}
          {(booking as any).checkin_date  && <Row label="Check-in"  value={`${fmtNightlyDate((booking as any).checkin_date)} · 15:00`} />}
          {(booking as any).checkout_date && <Row label="Check-out" value={`${fmtNightlyDate((booking as any).checkout_date)} · 11:00`} />}
          {guests > 0 && <Row label="Guests" value={`${guests} guest${guests !== 1 ? "s" : ""}`} />}
          {nights > 0 && <Row label="Nights" value={String(nights)} />}
        </div>

        {/* Price breakdown */}
        {price != null && nights > 0 && (
          <>
            {divider}
            <Row label={`${fmtMoney(price)} × ${nights} night${nights !== 1 ? "s" : ""}`} value={fmtMoney(price * nights)} />
            {nightlyAddons.map((a: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12, color: TT }}>
                <span>{a.icon || "+"} {a.label}</span>
                <span>+{fmtMoney(a.subtotal)}</span>
              </div>
            ))}
            {divider}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14, fontWeight: 700 }}>
              <span style={{ color: TM }}>Total</span>
              <span style={{ color: "var(--bf-brand-primary,#0d9488)" }}>
                {fmtMoney((price != null && nights > 0 ? price * nights : nightlyTotal ?? 0) + nightlyAddons.reduce((s: number, a: any) => s + (Number(a.subtotal) || 0), 0))}
              </span>
            </div>
          </>
        )}

      </div>

    {/* ── Actions — identical structure to the standard timeslot section ── */}
    {primaryButtons && (
      <>
        <hr style={{ border: "none", borderTop: `1px solid ${BD}`, margin: 0 }} />
        <div style={{
          padding: "10px 14px",
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          flexWrap: "wrap",
        }}>
          {primaryButtons}
        </div>
      </>
    )}
    </section>
  );
}
