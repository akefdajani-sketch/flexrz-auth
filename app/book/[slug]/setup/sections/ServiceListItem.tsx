"use client";

// ---------------------------------------------------------------------------
// ServiceListItem — extracted from ServicesSection.
//
// One row in the owner's services list: name + delete/edit buttons, VAT
// badge, duration/price line, scheduling controls (collapsed by default),
// availability basis selector, and image upload/remove controls. Owns its
// own edit state (interval, maxSlots, parallel, requiresConfirmation, vatRate)
// driven by an `expanded` prop from the parent — only one row is expanded
// at a time.
// ---------------------------------------------------------------------------

import React from "react";
import { formatMoney } from "@/lib/tax/taxFormatting";

export function ServiceListItem({
  service: s,
  expanded,
  onToggleExpanded,
  onDelete,
  onPatch,
  onAvailabilityBasisChange,
  handleEntityImageChange,
  handleEntityImageDelete,
  resolveAssetUrl,
  openImagePreview,
}: {
  service: any;
  expanded: boolean;
  onToggleExpanded: () => void;
  onDelete: () => void;
  onPatch: (patch: any) => void;
  onAvailabilityBasisChange: (basis: string | null) => void;
  handleEntityImageChange: (kind: "service", id: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  handleEntityImageDelete: (kind: "service", id: number) => void;
  resolveAssetUrl: (url: string) => string;
  openImagePreview: (url: string, name: string) => void;
}) {
  // Local edit form state — initialized from the service when expanded opens.
  const [svcEditInterval, setSvcEditInterval] = React.useState<string>("");
  const [svcEditMaxSlots, setSvcEditMaxSlots] = React.useState<string>("");
  const [svcEditParallel, setSvcEditParallel] = React.useState<string>("");
  const [svcEditRequiresConfirmation, setSvcEditRequiresConfirmation] = React.useState<boolean>(false);
  const [svcEditVatRate, setSvcEditVatRate] = React.useState<string>("");

  // When the row becomes expanded, prime the edit form fields from the service.
  React.useEffect(() => {
    if (!expanded) return;
    setSvcEditInterval(String(s.slot_interval_minutes ?? ""));
    setSvcEditMaxSlots(String(s.max_consecutive_slots ?? ""));
    setSvcEditParallel(String(s.max_parallel_bookings ?? ""));
    setSvcEditRequiresConfirmation(!!s.requires_confirmation);
    setSvcEditVatRate(s.vat_rate != null ? String(s.vat_rate) : ""); // PR-TAX-1
  }, [
    expanded,
    s.slot_interval_minutes,
    s.max_consecutive_slots,
    s.max_parallel_bookings,
    s.requires_confirmation,
    s.vat_rate,
  ]);

  return (
    <div
      key={s.id}
      style={{
        padding: "6px 8px",
        borderRadius: 10,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        marginBottom: 6,
        fontSize: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 600 }}>{s.name}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            onClick={onToggleExpanded}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 999,
              padding: "2px 8px",
              fontSize: 11,
              background: "#ffffff",
              color: "#0f172a",
                cursor: "pointer",
            }}
          >
            {expanded ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "2px 8px",
              fontSize: 11,
              background: "#fee2e2",
              color: "#b91c1c",
                cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* PR-TAX-1: show VAT badge on service card when override is set */}
      <div style={{ color: "#64748b", marginTop: 2 }}>
        {s.duration_minutes ? `${s.duration_minutes} min` : "—"}
        {s.price_jd != null ? ` · ${formatMoney(s.price_jd, "JD")}` : ""}
        {s.vat_rate != null && (
          <span style={{ fontSize: 11, marginLeft: 6, color: "#3b82f6", fontWeight: 600 }}>
            VAT {s.vat_rate}%
          </span>
        )}
      </div>

      <div style={{ color: "#64748b", marginTop: 2, fontSize: 11 }}>
        Interval: {s.slot_interval_minutes ?? "—"} min · Max slots: {s.max_consecutive_slots ?? "—"} · Parallel: {s.max_parallel_bookings ?? "—"}
      </div>

      {expanded && (
        <div
          style={
            {
              marginTop: 8,
              padding: 8,
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
            }
          }
        >
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>
            Scheduling controls
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <input
              type="number"
              min={5}
              step={5}
              value={svcEditInterval}
              onChange={(e) => setSvcEditInterval(e.target.value)}
              placeholder="Slot interval"
              style={{
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                padding: "7px 10px",
                fontSize: 12,
                background: "#ffffff",
              }}
            />
            <input
              type="number"
              min={1}
              step={1}
              value={svcEditMaxSlots}
              onChange={(e) => setSvcEditMaxSlots(e.target.value)}
              placeholder="Max slots"
              style={{
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                padding: "7px 10px",
                fontSize: 12,
                background: "#ffffff",
              }}
            />
            <input
              type="number"
              min={1}
              step={1}
              value={svcEditParallel}
              onChange={(e) => setSvcEditParallel(e.target.value)}
              placeholder="Parallel"
              style={{
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                padding: "7px 10px",
                fontSize: 12,
                background: "#ffffff",
              }}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
              fontSize: 12,
              color: "#475569",
            }}
          >
            <input
              type="checkbox"
              checked={svcEditRequiresConfirmation}
              onChange={(e) => setSvcEditRequiresConfirmation(e.target.checked)}
            />
            Require confirmation (public bookings start as pending)
          </label>

          {/* PR-TAX-1: VAT override inline edit */}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>
              VAT override (%) — leave blank to use business default
            </div>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={svcEditVatRate}
              onChange={(e) => setSvcEditVatRate(e.target.value)}
              placeholder="e.g. 16  or leave blank"
              style={{
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                padding: "7px 10px",
                fontSize: 12,
                background: "#ffffff",
                width: 140,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => {
                const interval = Number(svcEditInterval);
                const maxSlots = Number(svcEditMaxSlots);
                const parallel = Number(svcEditParallel);
                if (!interval || interval < 5) return alert("Slot interval must be at least 5 minutes.");
                if (!maxSlots || maxSlots < 1) return alert("Max slots must be at least 1.");
                if (!parallel || parallel < 1) return alert("Parallel bookings must be at least 1.");

                // PR-TAX-1: include vat_rate in patch (null = revert to business default)
                onPatch({
                  slot_interval_minutes: interval,
                  max_consecutive_slots: maxSlots,
                  max_parallel_bookings: parallel,
                  requires_confirmation: svcEditRequiresConfirmation,
                  vat_rate: svcEditVatRate.trim() !== "" ? Number(svcEditVatRate) : null,
                });
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                background: "#0f172a",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setSvcEditInterval(String(s.slot_interval_minutes ?? ""));
                setSvcEditMaxSlots(String(s.max_consecutive_slots ?? ""));
                setSvcEditParallel(String(s.max_parallel_bookings ?? ""));
                setSvcEditRequiresConfirmation(!!s.requires_confirmation);
                setSvcEditVatRate(s.vat_rate != null ? String(s.vat_rate) : ""); // PR-TAX-1
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <div style={{ color: "#94a3b8", marginTop: 2, marginBottom: 4 }}>
        {s.requires_staff ? "needs staff" : "no staff"} ·{" "}
        {s.requires_resource ? "needs resource" : "no resource"} ·{" "}
        {s.requires_confirmation ? "requires confirmation" : "auto-confirm"}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 2,
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 11, color: "#475569", minWidth: 150 }}>
          Availability basis
        </div>
        <select
          value={(s.availability_basis || "auto") as any}
          onChange={(e) =>
            onAvailabilityBasisChange((e.target.value as any) || null)
          }
          style={{
            flex: 1,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            padding: "6px 10px",
            fontSize: 12,
            background: "#ffffff",
            color: "#0f172a",
          }}
          title={
            "Controls what blocks time slots: Resource, Staff, Both, None, or Auto (derive from requires flags)."
          }
        >
          <option value="auto">Auto (derive from flags)</option>
          <option value="resource">Resource only</option>
          <option value="staff">Staff only</option>
          <option value="both">Both (staff + resource)</option>
          <option value="none">None (ignore overlaps)</option>
        </select>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        {s.image_url ? (
          <img
            src={resolveAssetUrl(s.image_url)}
            alt={s.name}
            onClick={() => openImagePreview(resolveAssetUrl(s.image_url), s.name)}
            style={{
                cursor: "pointer",
              width: 56,
              height: 56,
              borderRadius: 8,
              objectFit: "cover",
              border: "1px solid #e5e7eb",
            }}
          />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              border: "1px dashed #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: "#cbd5e1",
            }}
          >
            No img
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label
            style={{
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 999,
              border: "1px solid #0f172a",
              background: "#ffffff",
              color: "#0f172a",
                cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Upload image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleEntityImageChange("service", s.id, e)}
              style={{ display: "none" }}
            />
          </label>

          {s.image_url && (
            <button
              type="button"
              onClick={() => handleEntityImageDelete("service", s.id)}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 999,
                border: "1px solid #fecaca",
                background: "#ffffff",
                color: "#b91c1c",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
