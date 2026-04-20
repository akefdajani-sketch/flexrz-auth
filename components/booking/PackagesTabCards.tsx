"use client";

// ---------------------------------------------------------------------------
// PackagesTabCards — extracted from PackagesTab
//
// Contains three presentational sub-components used by PackagesTab:
//   1) PackageHistoryModal — list of previous package entitlements, each
//      with a "View activity" button that opens the activity modal.
//   2) PackageActivityModal — ledger-item list for a single entitlement.
//   3) PackageCatalogSection — grid of catalog products for purchase.
//
// Also houses the HR + Pill + PrimaryButton UI atoms that are shared
// between these components (and in Pill's case, the parent tab).
// ---------------------------------------------------------------------------

import React, { useEffect } from "react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { createCardStyle } from "@/lib/theme/styles";
import ModalOverlay from "@/components/booking/ModalOverlay";
import {
  fmtShortDate,
  formatLedgerDelta,
  formatLedgerNote,
  formatPackageBadge,
  formatQuantity,
} from "@/components/booking/lib/packageFormatters";
import { formatMoney } from "@/lib/tax/taxFormatting";
import type {
  CustomerPackageEntitlement,
  CustomerPackageLedgerItem,
  PublicPackageProduct,
} from "@/types/booking";

// ── UI atoms ─────────────────────────────────────────────────────────────────

export function HR() {
  return <hr style={{ margin: 0, border: "none", borderTop: "1px solid var(--bf-border, rgba(0,0,0,0.08))" }} />;
}

export function Pill({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "var(--bf-radius-pill, 999px)",
        padding: "3px 10px",
        border: "1px solid var(--bf-border, rgba(0,0,0,0.12))",
        background: "var(--bf-card-bg, var(--bf-glass-bg, var(--bf-surface, rgba(255,255,255,0.06))))",
        fontSize: "var(--bf-type-caption-fs, 12px)",
        fontWeight: 700,
        color: "var(--bf-text-main, rgba(15,23,42,0.92))",
      }}
    >
      {text}
    </span>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        borderRadius: 999,
        padding: "10px 14px",
        border: "1px solid var(--bf-border, rgba(15,23,42,0.14))",
        background: "var(--bf-primary, #111827)",
        color: "white",
        fontWeight: "var(--bf-type-heading-fw)",
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
        ...(props.style || {}),
      }}
    />
  );
}

function formatPackageBalance(
  quantity: number | null | undefined,
  unitType: string | null | undefined
) {
  if (typeof quantity !== "number") return "—";
  return formatQuantity(quantity, unitType || "package_use");
}

// ── PackageHistoryModal ──────────────────────────────────────────────────────

export function PackageHistoryModal({
  open,
  onClose,
  onOpenChange,
  history,
  onOpenLedger,
}: {
  open: boolean;
  onClose: () => void;
  onOpenChange?: (open: boolean) => void;
  history: CustomerPackageEntitlement[];
  onOpenLedger: (e: CustomerPackageEntitlement) => void;
}) {
  useEffect(() => {
    if (!open) return;
    onOpenChange?.(true);
    return () => onOpenChange?.(false);
  }, [open, onOpenChange]);

  const theme = useTheme();
  const cardStyle = createCardStyle(theme);

  if (!open) return null;

  const BD = "var(--bf-border, rgba(0,0,0,0.08))";
  const TM = "var(--bf-text-main, rgba(15,23,42,0.92))";
  const TT = "var(--bf-text-muted, #6b7280)";

  return (
    <ModalOverlay onClose={onClose} closeOnBackdrop>
      <div style={{
        ...(cardStyle as React.CSSProperties),
        padding: 0,
        width: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        maxHeight: "min(82vh, 720px)",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 16px 12px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: TM }}>Package history</div>
              <div style={{ fontSize: 12, color: TT, marginTop: 3 }}>Previous packages and their activity.</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                flexShrink: 0, border: `1px solid ${BD}`, background: "transparent",
                borderRadius: 999, width: 30, height: 30, cursor: "pointer",
                fontWeight: 700, fontSize: 16, color: TM,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >×</button>
          </div>
        </div>

        <HR />

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0 16px" }}>
          {history.length === 0 ? (
            <p style={{ padding: "12px 0", fontSize: 13, color: TT }}>No package history found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {history.map((p, idx) => {
                const isLast = idx === history.length - 1;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 0",
                      borderBottom: isLast ? "none" : `1px solid ${BD}`,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: TM }}>{p.name || "Package"}</div>
                      <div style={{ marginTop: 3, fontSize: 12, color: TT }}>
                        {fmtShortDate(p.starts_at)} → {fmtShortDate(p.expires_at)}
                        {p.status ? ` · ${String(p.status)}` : ""}
                      </div>
                      <div style={{ marginTop: 3, fontSize: 12, color: TT }}>
                        Balance:{" "}
                        <span style={{ fontWeight: 600, color: TM }}>
                          {formatPackageBalance(p.remaining_quantity, p.unit_type)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenLedger(p)}
                      style={{
                        flexShrink: 0,
                        padding: "6px 14px",
                        borderRadius: 999,
                        border: `1px solid ${BD}`,
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        color: TM,
                        whiteSpace: "nowrap",
                      }}
                    >
                      View activity
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── PackageActivityModal ─────────────────────────────────────────────────────

export function PackageActivityModal({
  open,
  onClose,
  onOpenChange,
  entitlement,
  items,
  loading,
  error,
  onViewBooking,
}: {
  open: boolean;
  onClose: () => void;
  onOpenChange?: (open: boolean) => void;
  entitlement: CustomerPackageEntitlement;
  items: CustomerPackageLedgerItem[];
  loading: boolean;
  error: string | null;
  onViewBooking?: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    onOpenChange?.(true);
    return () => onOpenChange?.(false);
  }, [open, onOpenChange]);

  const theme = useTheme();
  const cardStyle = createCardStyle(theme);

  if (!open) return null;

  const BD = "var(--bf-border, rgba(0,0,0,0.08))";
  const TM = "var(--bf-text-main, rgba(15,23,42,0.92))";
  const TT = "var(--bf-text-muted, #6b7280)";

  return (
    <ModalOverlay onClose={onClose} closeOnBackdrop>
      <div style={{
        ...(cardStyle as React.CSSProperties),
        padding: 0,
        width: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        maxHeight: "min(82vh, 720px)",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 16px 12px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: TM }}>Package activity</div>
              <div style={{ fontSize: 12, color: TT, marginTop: 3 }}>{entitlement.name || "Package"}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                flexShrink: 0, border: `1px solid ${BD}`, background: "transparent",
                borderRadius: 999, width: 30, height: 30, cursor: "pointer",
                fontWeight: 700, fontSize: 16, color: TM,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >×</button>
          </div>
        </div>

        <HR />

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px" }}>
          {loading ? (
            <div style={{ fontSize: 13, color: TT }}>Loading activity…</div>
          ) : error ? (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(220,38,38,0.08)", color: "#b91c1c", fontSize: 12 }}>{error}</div>
          ) : items.length === 0 ? (
            <div style={{ fontSize: 13, color: TT }}>No activity yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {items.map((it, idx) => {
                const delta = Number(it.delta_quantity || 0);
                const isLast = idx === items.length - 1;
                const isGrant = delta > 0;
                const isDebit = delta < 0;
                const deltaColor = isGrant ? "#16a34a" : isDebit ? TM : TT;
                const deltaLabel = formatLedgerDelta(it);

                // Clean note: remove "plan N" pattern
                const cleanNote = it.note
                  ? formatLedgerNote(it.note)
                  : null;

                return (
                  <div
                    key={it.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: isLast ? "none" : `1px solid ${BD}`,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, color: TT }}>
                        {it.created_at ? new Date(it.created_at).toLocaleString() : "—"}
                      </div>
                      {cleanNote && (
                        <div style={{ fontSize: 13, color: TM, marginTop: 2, fontWeight: 500 }}>
                          {cleanNote}
                        </div>
                      )}
                      {it.booking_id && onViewBooking && (
                        <button
                          type="button"
                          onClick={() => { onClose(); onViewBooking(); }}
                          style={{
                            marginTop: 4,
                            fontSize: 11,
                            color: "var(--bf-brand-primary, #0d9488)",
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            fontWeight: 600,
                            textDecoration: "underline",
                            textDecorationStyle: "dotted" as const,
                            textUnderlineOffset: 2,
                          }}
                        >
                          View booking #{it.booking_id}
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: deltaColor, flexShrink: 0, textAlign: "right" as const }}>
                      {deltaLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── PackageCatalogSection ────────────────────────────────────────────────────

export function PackageCatalogSection({
  catalog,
  loadingCatalog,
  catalogError,
  purchasingProductId,
  activeEntitlementProductIds,
  onSelectProduct,
}: {
  catalog: PublicPackageProduct[];
  loadingCatalog: boolean;
  catalogError: string | null;
  purchasingProductId: number | null;
  activeEntitlementProductIds: Set<number>;
  onSelectProduct: (p: PublicPackageProduct) => void;
}) {
  if (loadingCatalog) {
    return <div style={{ color: "var(--bf-text-muted)", fontSize: 13 }}>Loading packages…</div>;
  }
  if (catalogError) {
    return <div style={{ color: "crimson", fontSize: 13 }}>{catalogError}</div>;
  }
  if (catalog.length === 0) {
    return <div style={{ color: "var(--bf-text-muted)", fontSize: 13 }}>No packages are available right now.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {catalog.map((p) => {
        const badge = formatPackageBadge(p);
        const qty = formatQuantity(p.included_quantity, p.unit_type);
        const validity =
          typeof p.validity_days === "number" && p.validity_days > 0
            ? `${p.validity_days} days validity`
            : null;
        const price =
          p.price_amount == null
            ? null
            : formatMoney(p.price_amount, p.currency || "");
        const isOwned = activeEntitlementProductIds.has(p.id);

        return (
          <div
            key={p.id}
            style={{
              border: isOwned
                ? "2px solid var(--bf-brand-primary, #356e35)"
                : "1px solid var(--bf-border, rgba(15,23,42,0.14))",
              borderRadius: 16,
              padding: 14,
              background: isOwned
                ? "rgba(53,110,53,0.04)"
                : "var(--bf-card-bg, var(--bf-glass-bg, var(--bf-surface, rgba(255,255,255,0.06))))",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <Pill text={badge} />
                {isOwned && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(22,163,74,0.12)", color: "#16a34a" }}>
                    ✓ Active
                  </span>
                )}
              </div>
              {p.description && (
                <div style={{ color: "var(--bf-text-muted)", fontSize: 13, marginTop: 4 }}>{p.description}</div>
              )}
              <div style={{ color: "var(--bf-text-muted)", fontSize: 13, marginTop: 6 }}>
                {qty}
                {validity ? ` · ${validity}` : ""}
                {price ? ` · ${price}` : ""}
              </div>
            </div>

            <div style={{ flexShrink: 0 }}>
              <PrimaryButton
                disabled={!!purchasingProductId || isOwned}
                onClick={() => onSelectProduct(p)}
                style={
                  isOwned
                    ? { background: "transparent", color: "var(--bf-text-muted, #6b7280)", border: "1px solid var(--bf-border, rgba(0,0,0,0.12))" }
                    : {}
                }
              >
                {purchasingProductId === p.id ? "Purchasing…" : isOwned ? "Active" : "Select"}
              </PrimaryButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}
