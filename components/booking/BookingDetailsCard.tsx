"use client";

// components/booking/BookingDetailsCard.tsx
// ─── Production-ready booking modal card ──────────────────────────────────────
//
// Changes in this version:
//   1. Subtitle → "Here's your booking summary. A copy will be sent to you by email."
//   2. Booking code → prominent pill below the title row, not buried inline.
//   3. Status icons → hourglass (⧖) for pending, ✓ in green square for confirmed,
//      ✕ in red square for cancelled. CSS-drawn, no emoji.
//   4. Reservation grid symmetry → Service | Duration on one row,
//      Resource | Staff on the next row (each only shown when present,
//      and either one alone spans full width).
//   5. Coverage (membership / package) → "Value JOD XX" removed.
//      Only Used + Remaining are shown.
//   6. Progress bar → two-tone: full width = balance BEFORE this booking
//      (remaining + used_this_booking). Colored = remaining. Muted = used now.
//      Shows the true "pre-booking total" so the bar is never misleading.
//
// Three payment layouts:  A — Charged   B — Membership   C — Package

import React, { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import type { BookingHistoryItem } from "@/types/booking";
import { useTheme } from "@/lib/theme/ThemeContext";
import { createGlassCardStyle } from "@/lib/theme/styles";
import NightlyBookingDetails from "./NightlyBookingDetails";
import {
  toNum,
  fmtMins,
  PAYMENT_BADGES,
  StatusIcon,
  CopyCodeButton,
} from "./BookingDetailsCardAtoms";
import {
  PaymentTable,
  PaymentStacked,
  TwoToneBar,
  CoverageStrip,
} from "./BookingDetailsPaymentBreakdown";
import { BookingInfoBlock } from "./BookingInfoBlock";
import { formatMoney } from "@/lib/tax/taxFormatting";

// Re-export for callers that import CopyCodeButton from this module.
export { CopyCodeButton };

type ThemeTokenProps = {
  CARD_STYLE?: CSSProperties;
  BORDER_SUBTLE?: string;
  PAGE_BG?: string;
  TEXT_MAIN?: string;
  TEXT_MUTED?: string;
  TEXT_SOFT?: string;
};

type Props = {
  title: string;
  /** Override subtitle. Defaults to "Here's your booking summary." */
  subtitle?: string;
  booking: BookingHistoryItem;
  onClose: () => void;
  primaryButtons?: ReactNode;
  /**
   * Custom label for the resource field — comes from tenant branding settings.
   * E.g. branding.resource_display_name ?? "Resource"
   */
  resourceLabel?: string;
  /**
   * Custom label for the staff field — comes from tenant branding settings.
   * E.g. branding.staff_display_name ?? "Staff"
   */
  staffLabel?: string;
} & ThemeTokenProps;

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingDetailsCard(props: Props) {
  const theme = useTheme();

  const {
    title,
    subtitle,
    booking,
    onClose,
    primaryButtons,
    resourceLabel = "Resource",
    staffLabel    = "Staff",
    CARD_STYLE,
    BORDER_SUBTLE: BP,
    TEXT_MAIN: TMP,
    TEXT_MUTED: TMU,
    TEXT_SOFT: TSP,
  } = props;

  const BD = BP  ?? `var(--bf-border, ${theme.card.borderSubtle})`;
  const TM = TMP ?? `var(--bf-text, ${theme.text.main})`;
  const TT = TMU ?? `var(--bf-muted, ${theme.text.muted})`;
  const TS = TSP ?? theme.text.soft;

  // ── Mobile detection ───────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 520);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Dates & time ───────────────────────────────────────────────────────────
  const start    = new Date(booking.start_time);
  const duration = booking.duration_minutes || 60;
  const end      = new Date(start.getTime() + duration * 60_000);

  const dateLabel = start.toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
  const startTime = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
  const endTime   = end.toLocaleTimeString(undefined,   { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();

  // RENTAL-1: detect nightly booking
  const isNightly = (booking as any).booking_mode === "nightly"
    || !!((booking as any).checkin_date && (booking as any).checkout_date);

  // ── Status ─────────────────────────────────────────────────────────────────
  const statusRaw   = String(booking.status || "").toLowerCase();
  const statusLabel = statusRaw ? statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1) : "—";

  // ── Meta ───────────────────────────────────────────────────────────────────
  const b              = booking as any;
  const booking_code   = b.booking_code   ?? b.bookingCode   ?? null;
  const created_at_raw = b.created_at     ?? b.createdAt     ?? null;
  const customer_name  = b.customer_name  ?? b.customerName  ?? null;
  const customer_email = b.customer_email ?? b.customerEmail ?? null;
  const customer_phone = b.customer_phone ?? b.customerPhone ?? null;
  const payment_method = b.payment_method ?? b.paymentMethod ?? null;

  // ── Money ──────────────────────────────────────────────────────────────────
  const currency  = b.currency_code ?? b.price_currency ?? b.currency ?? "JOD";
  // PR-TAX-1: if tax data is stored, use subtotal_amount (pre-tax) for the Subtotal row.
  // For inclusive pricing the stored price_amount IS the total, so we show the extracted
  // pre-tax subtotal. For exclusive pricing subtotal_amount equals price_amount anyway.
  const _rawPrice = toNum(b.price_amount ?? b.price_subtotal ?? b.subtotal ?? b.total);
  const _storedSubtotal = toNum((b as any).subtotal_amount);
  const subtotal  = _storedSubtotal != null ? _storedSubtotal : _rawPrice;
  const chargeAmt = toNum(b.charge_amount);
  const paid      = chargeAmt != null && subtotal != null
    ? (chargeAmt === 0 ? subtotal : 0)
    : toNum(b.price_paid ?? b.paid);
  const balance   = chargeAmt != null
    ? chargeAmt
    : toNum(b.price_balance ?? b.balance) ??
      (subtotal != null && paid != null ? Math.max(0, subtotal - paid) : null);

  // PR A2.2: delegates to lib/tax/formatMoney for consistent rendering
  const $$ = (n: number | null) => {
    if (n == null) return "—";
    return formatMoney(n, currency, { maximumFractionDigits: 3, minimumFractionDigits: 3 });
  };

  const serviceRate   = toNum(b.service_rate ?? b.service_price ?? b.unit_price ?? b.price_amount);
  const serviceAmount = toNum(b.service_amount ?? b.line_total ?? b.price_amount ?? subtotal);

  // PR-TAX-1: read stored tax breakdown from booking row
  const vatAmt        = toNum((b as any).vat_amount);
  const scAmt         = toNum((b as any).service_charge_amount);
  const totalAmt      = toNum((b as any).total_amount);
  const taxSnap       = (b as any).tax_snapshot ?? null;
  const vatLabel      = taxSnap?.vat_label      ?? "VAT";
  const scLabel       = taxSnap?.service_charge_label ?? "Service Charge";
  const vatRate       = taxSnap?.vat_rate        ?? null;
  const scRate        = taxSnap?.service_charge_rate ?? null;
  const taxInclusive  = taxSnap?.tax_inclusive   ?? false;
  const hasTaxBreakdown = (vatAmt != null && vatAmt > 0) || (scAmt != null && scAmt > 0);

  // ── Rate segments ──────────────────────────────────────────────────────────
  const rateName = b.applied_rate_rule_name ?? null;
  const segments: Array<{ duration_minutes: number; adjusted_price_amount: number; rule?: { name?: string } }> =
    b.applied_rate_snapshot?.segments ?? [];
  const hasSegments = segments.length > 1;
  const showRateCol = !hasSegments && serviceRate != null && !isMobile;

  // ── Membership ─────────────────────────────────────────────────────────────
  const membershipPlan = b.membership_plan_name ?? b.membershipPlanName ?? null;
  const minsUsed       = toNum(b.membership_minutes_used_for_booking ?? b.membershipMinutesUsedForBooking);
  const minsRemaining  = toNum(b.membership_minutes_remaining ?? b.membershipMinutesRemaining);
  const usesUsed       = toNum(b.membership_uses_used_for_booking ?? b.membershipUsesUsedForBooking);
  const usesRemaining  = toNum(b.membership_uses_remaining ?? b.membershipUsesRemaining);

  // ── Package ────────────────────────────────────────────────────────────────
  const prepaidApplied   = Boolean(b.prepaid_applied ?? b.prepaidApplied ?? false);
  const prepaidName      = b.prepaid_product_name ?? b.prepaidProductName ?? null;
  const prepaidMode      = b.prepaid_redemption_mode ?? b.prepaidRedemptionMode ?? null;
  const prepaidUsed      = toNum(b.prepaid_quantity_used ?? b.prepaidQuantityUsed);
  const prepaidRemaining = toNum(b.prepaid_quantity_remaining ?? b.prepaidQuantityRemaining);

  // ── Layout type ────────────────────────────────────────────────────────────
  const coveredByMembership = Boolean(membershipPlan || b.customer_membership_id) && chargeAmt === 0;
  const coveredByPackage    = prepaidApplied && chargeAmt === 0 && !coveredByMembership;
  const isCharged           = !coveredByMembership && !coveredByPackage;
  const isFree              = isCharged && (subtotal == null || subtotal === 0);

  // ── Style tokens ──────────────────────────────────────────────────────────
  const HR:  CSSProperties = { border: "none", borderTop: `1px solid ${BD}`, margin: 0 };
  const LBL: CSSProperties = { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: TS, marginBottom: 3, fontWeight: 700 };
  const VAL: CSSProperties = { fontSize: isMobile ? 15 : 13, fontWeight: 600, color: TM, lineHeight: 1.3 };
  const pmInfo    = payment_method ? PAYMENT_BADGES[payment_method] : null;
  const codeStr   = booking_code ? String(booking_code) : `#${booking.id}`;
  const createdAt = created_at_raw ? new Date(created_at_raw) : null;

  // Default subtitle if caller doesn't override
  const resolvedSubtitle = subtitle ?? "Here's your booking confirmation.";

  // ── TwoToneBar + CoverageStrip components live in
  //    BookingDetailsPaymentBreakdown and are used below by Membership
  //    (plan B) and Package (plan C) layouts. Both take `color` + context
  //    tokens (TS / TM / TT) as explicit props.

  const Stat = ({ l, v, c }: { l: string; v: ReactNode; c?: string }) => (
    <div>
      <div style={LBL}>{l}</div>
      <div style={{ ...VAL, color: c ?? TM }}>{v}</div>
    </div>
  );

  // ── Payment breakdown (desktop table + mobile stacked) lives in
  //    BookingDetailsPaymentBreakdown — rendered below via isMobile switch.

  // ─────────────────────────────────────────────────────────────────────────
  // ── NIGHTLY BOOKING DETAILS LAYOUT ─────────────────────────────────────────
  if (isNightly) {
    return (
      <NightlyBookingDetails
        title={title}
        subtitle={subtitle}
        booking={booking}
        statusRaw={statusRaw}
        primaryButtons={primaryButtons}
        CARD_STYLE={CARD_STYLE}
        BD={BD}
        TM={TM}
        TT={TT}
        theme={theme}
      />
    );
  }

  // ── STANDARD TIME-SLOT BOOKING DETAILS (unchanged) ───────────────────────
  return (
    <section style={CARD_STYLE
      ? { ...CARD_STYLE, width: "100%", boxSizing: "border-box", overflow: "hidden" }
      : createGlassCardStyle(theme, { width: "100%", boxSizing: "border-box", overflow: "hidden" })
    }>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ padding: "12px 14px 10px" }}>

        {/* Row 1: title left, status badge right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: isMobile ? 16 : 14, fontWeight: 800, color: TM, whiteSpace: "nowrap" }}>{title}</span>

          {/* Status badge — top-right */}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <StatusIcon status={statusRaw} />
            <span style={{ fontSize: 11, fontWeight: 700, color: TM }}>{statusLabel}</span>
          </span>
        </div>

        {/* Booking reference code — always visible below title */}
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontFamily: "monospace", fontSize: isMobile ? 13 : 12, fontWeight: 700,
            letterSpacing: "0.06em", color: "var(--bf-brand-primary, #0d9488)",
            padding: "3px 8px", borderRadius: 6,
            background: "color-mix(in srgb, var(--bf-brand-primary, #0d9488) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--bf-brand-primary, #0d9488) 25%, transparent)",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
            </svg>
            {codeStr}
          </span>
          <CopyCodeButton code={codeStr} />
        </div>

        {/* Subtitle */}
        <div style={{ marginTop: 5, fontSize: 12, color: TT, lineHeight: 1.5 }}>
          {resolvedSubtitle}
        </div>
      </div>

      <hr style={HR} />

      {/* ── Info block: name + booking fields ────────────────────────────── */}
      <BookingInfoBlock
        booking={booking}
        customerName={customer_name}
        customerEmail={customer_email}
        customerPhone={customer_phone}
        dateLabel={dateLabel}
        startTime={startTime}
        endTime={endTime}
        duration={duration}
        resourceLabel={resourceLabel}
        staffLabel={staffLabel}
        isMobile={isMobile}
        BD={BD}
        TM={TM}
        TT={TT}
        TS={TS}
        LBL={LBL}
        VAL={VAL}
      />

      <hr style={HR} />

      {/* ── Layout A: Charged ─────────────────────────────────────────────── */}
      {isCharged && !isFree && subtotal != null && (
        <div style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={LBL}>Payment</div>
            {pmInfo && (
              <span style={{
                display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 999,
                background: pmInfo.bg, color: pmInfo.color,
                fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap",
              }}>{pmInfo.label}</span>
            )}
          </div>

          {isMobile ? (
            <PaymentStacked
              booking={booking}
              segments={segments}
              hasSegments={hasSegments}
              duration={duration}
              serviceRate={serviceRate}
              serviceAmount={serviceAmount}
              money={$$}
              BD={BD}
              TM={TM}
              TT={TT}
            />
          ) : (
            <PaymentTable
              booking={booking}
              segments={segments}
              hasSegments={hasSegments}
              showRateCol={showRateCol}
              duration={duration}
              serviceRate={serviceRate}
              serviceAmount={serviceAmount}
              money={$$}
              BD={BD}
              TM={TM}
              TT={TT}
              TS={TS}
            />
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <div style={{ minWidth: isMobile ? "100%" : 170, display: "grid", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12, color: TT }}>
                <span style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Subtotal</span>
                <span style={{ fontWeight: 600, color: TM }}>{$$(subtotal)}</span>
              </div>

              {/* PR-TAX-1: tax breakdown lines */}
              {hasTaxBreakdown && (
                <>
                  {vatAmt != null && vatAmt > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12, color: TT }}>
                      <span style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {vatLabel}{vatRate != null ? ` (${vatRate}%)` : ""}{taxInclusive ? " incl." : ""}
                      </span>
                      <span style={{ fontWeight: 600, color: TM }}>{$$(vatAmt)}</span>
                    </div>
                  )}
                  {/* Service charge: only show when rate > 0 */}
                  {scAmt != null && scAmt > 0 && (scRate ?? 0) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12, color: TT }}>
                      <span style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {scLabel}{scRate != null ? ` (${scRate}%)` : ""}{taxInclusive ? " incl." : ""}
                      </span>
                      <span style={{ fontWeight: 600, color: TM }}>{$$(scAmt)}</span>
                    </div>
                  )}
                </>
              )}

              {balance != null && balance > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, paddingTop: 6, borderTop: `1px solid ${BD}` }}>
                  <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: TT }}>Balance due</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: TM }}>{$$(balance)}</span>
                </div>
              )}
              {balance === 0 && paid != null && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, paddingTop: 6, borderTop: `1px solid ${BD}` }}>
                  <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "#0e9f6e" }}>Paid</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#0e9f6e" }}>{$$(paid)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Layout B: Membership ──────────────────────────────────────────── */}
      {coveredByMembership && (
        <CoverageStrip color="#7e3af2" label="Covered by membership" planName={membershipPlan} TT={TT}>
          {/* Hours-based */}
          {minsUsed != null && (
            <>
              <TwoToneBar
                remaining={minsRemaining}
                usedNow={minsUsed}
                color="#7e3af2"
                unitLabel={fmtMins}
                TS={TS}
                TM={TM}
              />
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <Stat l="Used this session"  v={fmtMins(Math.abs(minsUsed))} c="#7e3af2" />
                {minsRemaining != null && <Stat l="Remaining" v={fmtMins(minsRemaining)} />}
              </div>
            </>
          )}
          {/* Uses-based */}
          {usesUsed != null && minsUsed == null && (
            <>
              <TwoToneBar
                remaining={usesRemaining}
                usedNow={usesUsed}
                color="#7e3af2"
                unitLabel={(n) => `${n} session${n === 1 ? "" : "s"}`}
                TS={TS}
                TM={TM}
              />
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <Stat l="Used this booking"  v={`${Math.abs(usesUsed)} session${Math.abs(usesUsed) === 1 ? "" : "s"}`} c="#7e3af2" />
                {usesRemaining != null && <Stat l="Remaining" v={`${usesRemaining} session${usesRemaining === 1 ? "" : "s"}`} />}
              </div>
            </>
          )}
        </CoverageStrip>
      )}

      {/* ── Layout C: Package ─────────────────────────────────────────────── */}
      {coveredByPackage && (
        <CoverageStrip color="#0694a2" label="Covered by package" planName={prepaidName} TT={TT}>
          <TwoToneBar
            remaining={prepaidRemaining}
            usedNow={prepaidUsed}
            color="#0694a2"
            unitLabel={(n) => `${n} ${prepaidMode ? String(prepaidMode).replace(/_/g, " ") : "credit"}${n === 1 ? "" : "s"}`}
            TS={TS}
            TM={TM}
          />
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {prepaidUsed      != null && <Stat l="Used this booking" v={prepaidUsed}      c="#0694a2" />}
            {prepaidRemaining != null && <Stat l="Remaining"         v={prepaidRemaining} />}
            {prepaidMode               && <Stat l="Type"             v={String(prepaidMode).replace(/_/g, " ")} />}
          </div>
        </CoverageStrip>
      )}

      {/* ── Free booking ──────────────────────────────────────────────────── */}
      {isFree && (
        <div style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 20, height: 20, borderRadius: 4, background: "rgba(107,114,128,.15)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, color: TT, flexShrink: 0,
          }}>✓</span>
          <div>
            <div style={{ fontWeight: 700, color: TM, fontSize: 13 }}>No charge</div>
            <div style={{ fontSize: 11, color: TT }}>This booking has no associated cost.</div>
          </div>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      {primaryButtons && (
        <>
          <hr style={HR} />
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
