"use client";

// ---------------------------------------------------------------------------
// MembershipResolutionModal — extracted from PublicBookingClient
//
// Phase G: shown when a user tries to book using membership credits but the
// balance is insufficient. Offers up to 3 resolution paths:
//   1. Smart Top-Up — add exactly the missing minutes, then retry booking.
//   2. Renew / Upgrade — deep-link into the memberships tab.
//   3. Pay regular — retry booking without membership credits.
//
// The modal owns no state; it consumes visibility + handlers via props and
// orchestrates async calls to the top-up API and createBooking.
// ---------------------------------------------------------------------------

import React from "react";
import ModalOverlay from "@/components/booking/ModalOverlay";
import { formatHoursFromMinutes } from "@/lib/booking/utils";
import { formatMoney } from "@/lib/tax/taxFormatting";
import type { CreateBookingInput } from "@/lib/booking/hooks/useCreateBooking";
import type { ActiveTab } from "@/components/booking/BottomNav";

export type MembershipResolutionModalProps = {
  // visibility
  membershipResolutionOpen: boolean;
  membershipResolution: any | null;

  // pending booking to retry after resolution
  pendingBookingInput: CreateBookingInput | null;

  // resolution progress
  resolutionBusy: boolean;
  setResolutionBusy: (v: boolean) => void;

  // close / reset
  setMembershipResolutionOpen: (v: boolean) => void;
  setMembershipResolution: (v: any | null) => void;
  setPendingBookingInput: (v: CreateBookingInput | null) => void;

  // side-effects
  setSubmitError: (v: string | null) => void;
  setUseMembershipCredits: (v: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;

  // dependencies
  createBooking: (input: CreateBookingInput) => Promise<any>;
  slug: string;

  // theme tokens
  cardBg: string;
  borderSubtle: string;
  textMain: string;
  textMuted: string;
};

export default function MembershipResolutionModal({
  membershipResolutionOpen,
  membershipResolution,
  pendingBookingInput,
  resolutionBusy,
  setResolutionBusy,
  setMembershipResolutionOpen,
  setMembershipResolution,
  setPendingBookingInput,
  setSubmitError,
  setUseMembershipCredits,
  setActiveTab,
  createBooking,
  slug,
  cardBg,
  borderSubtle,
  textMain,
  textMuted,
}: MembershipResolutionModalProps) {
  if (!membershipResolutionOpen || !membershipResolution) return null;

  return (
    <ModalOverlay
      onClose={() => {
        if (resolutionBusy) return;
        setMembershipResolutionOpen(false);
        setMembershipResolution(null);
        setPendingBookingInput(null);
      }}
      closeOnBackdrop={false}
    >
      <div
        style={{
          background: cardBg,
          borderRadius: 16,
          border: `1px solid ${borderSubtle}`,
          boxShadow: "0 18px 40px rgba(15,23,42,0.35)",
          padding: 16,
          maxWidth: 560,
          margin: "0 auto",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "var(--bf-type-title-fs)",
            fontWeight: "var(--bf-type-title-fw)",
            color: textMain,
          }}
        >
          Not enough membership balance
        </h3>

        <p
          style={{
            marginTop: 8,
            fontSize: "var(--bf-type-body-fs)",
            color: textMuted,
            lineHeight: 1.5,
          }}
        >
          Choose how you want to continue. Your selected time is still available right now, but it
          may change if you wait too long.
        </p>

        {/* Option 1: Smart Top-Up */}
        {membershipResolution?.topUp?.enabled &&
        membershipResolution?.topUp?.allowSelfServe &&
        membershipResolution?.membershipId ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              border: `1px solid ${borderSubtle}`,
              background: "var(--bf-surface, rgba(255,255,255,0.9))",
            }}
          >
            <div
              style={{
                fontWeight: "var(--bf-type-heading-fw)",
                fontSize: "var(--bf-type-heading-fs)",
                color: textMain,
              }}
            >
              Smart Top-Up
            </div>
            <div style={{ marginTop: 4, fontSize: "var(--bf-type-body-fs)", color: textMuted }}>
              Add{" "}
              <strong>
                {formatHoursFromMinutes(Number(membershipResolution?.topUp?.minutesNeeded || 0))}
              </strong>
              {membershipResolution?.topUp?.price != null ? (
                <>
                  {" "}
                  •{" "}
                  <strong>
                    {formatMoney(
                      membershipResolution.topUp.price,
                      membershipResolution.topUp.currency || "",
                    )}
                  </strong>
                </>
              ) : null}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={resolutionBusy}
                onClick={async () => {
                  if (!pendingBookingInput) return;
                  const membershipId = Number(membershipResolution?.membershipId);
                  const minutesToAdd = Number(membershipResolution?.topUp?.minutesNeeded || 0);
                  if (!membershipId || minutesToAdd <= 0) return;

                  try {
                    setResolutionBusy(true);
                    // 1) Apply top-up (ledger credit) — route through /api/proxy so auth is
                    // handled server-side (no Bearer tokens in the browser).
                    const r = await fetch(
                      `/api/proxy/customer-memberships/${membershipId}/top-up?tenantSlug=${encodeURIComponent(slug)}`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ minutesToAdd }),
                      },
                    );
                    const j = await r.json().catch(() => ({}));
                    if (!r.ok)
                      throw new Error(j?.message || j?.error || `Top-up failed (${r.status})`);

                    // 2) Retry booking (membership checkbox stays on)
                    await createBooking(pendingBookingInput);

                    setMembershipResolutionOpen(false);
                    setMembershipResolution(null);
                    setPendingBookingInput(null);
                  } catch (e: any) {
                    setSubmitError(e?.message || "Top-up failed.");
                  } finally {
                    setResolutionBusy(false);
                  }
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: "var(--bf-primary, #22c55e)",
                  color: "var(--bf-primary-contrast, #ffffff)",
                  cursor: resolutionBusy ? "not-allowed" : "pointer",
                  fontSize: "var(--bf-type-body-fs)",
                  fontWeight: "var(--bf-type-heading-fw)",
                  opacity: resolutionBusy ? 0.7 : 1,
                }}
              >
                {resolutionBusy ? "Processing..." : "Top up & book"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Option 2: Renew / Upgrade */}
        {membershipResolution?.renewUpgrade?.enabled ? (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              disabled={resolutionBusy}
              onClick={() => {
                setMembershipResolutionOpen(false);
                setMembershipResolution(null);
                setPendingBookingInput(null);
                setActiveTab("memberships");
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 14,
                border: `1px solid ${borderSubtle}`,
                background: "transparent",
                color: textMain,
                cursor: resolutionBusy ? "not-allowed" : "pointer",
                fontSize: "var(--bf-type-body-fs)",
                fontWeight: "var(--bf-type-heading-fw)",
              }}
            >
              View membership plans
            </button>
          </div>
        ) : null}

        {/* Option 3: Pay regular (book without membership) */}
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            disabled={resolutionBusy}
            onClick={async () => {
              if (!pendingBookingInput) return;
              try {
                setResolutionBusy(true);
                setUseMembershipCredits(false);

                const retry: CreateBookingInput = {
                  ...pendingBookingInput,
                  autoConsumeMembership: false,
                  requireMembership: false,
                  customerMembershipId: null,
                };

                await createBooking(retry);
                setMembershipResolutionOpen(false);
                setMembershipResolution(null);
                setPendingBookingInput(null);
              } catch (e: any) {
                setSubmitError(e?.message || "Booking failed.");
              } finally {
                setResolutionBusy(false);
              }
            }}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 14,
              border: "none",
              background: "var(--bf-surface, #ffffff)",
              color: textMain,
              cursor: resolutionBusy ? "not-allowed" : "pointer",
              fontSize: "var(--bf-type-body-fs)",
              fontWeight: "var(--bf-type-heading-fw)",
            }}
          >
            Book without membership (pay regular rate)
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: "var(--bf-type-caption-fs)", color: textMuted }}>
          Tip: If you want this to be enforced for everyone, enable <strong>Strict</strong> mode in
          the tenant settings.
        </div>
      </div>
    </ModalOverlay>
  );
}
