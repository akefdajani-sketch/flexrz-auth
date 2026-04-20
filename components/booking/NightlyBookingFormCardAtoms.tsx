"use client";

// ---------------------------------------------------------------------------
// NightlyBookingFormCardAtoms — small presentational atoms and pure helpers
// extracted from NightlyBookingFormCard. Keeps the parent component focused
// on the main submission flow + state orchestration.
// ---------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from "react";
import type { Resource } from "@/components/owner/tabs/setup/types";
import { formatMoney } from "@/lib/tax/taxFormatting";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NightlyAddon {
  id: string; label: string; price: number;
  perNight?: boolean; icon?: string;
  price_type?: "per_night" | "flat" | "per_guest"; description?: string;
}

// ─── Pure helpers ───────────────────────────────────────────────────────────

// NIGHTLY SUITE: add-ons are now fetched live from the backend.
// No hardcoded defaults — each resource has its own configured add-ons.
export function parseAddons(json?: string | null): NightlyAddon[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

// PR A2.2: delegates to lib/tax/formatMoney for consistent currency rendering.
export function fmt(amount: number, currency?: string | null) {
  // Prefer the passed currency, fall back to JOD (not USD) for this region
  const cur = currency && currency.trim() ? currency.trim() : "JOD";
  return formatMoney(amount, cur);
}

// ─── Atoms ──────────────────────────────────────────────────────────────────

export function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, gap: 12, padding: "3px 0" }}>
      <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <span style={{ fontWeight: bold ? 600 : 400, color: accent ? "var(--bf-brand-primary,#0d9488)" : "var(--color-text-primary)", textAlign: "right" }}>{value}</span>
    </div>
  );
}

export function Dot({ c }: { c: string }) {
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block", flexShrink: 0 }} />;
}

export function AvailBadge({ available, checking }: { available: boolean | null; checking: boolean }) {
  if (checking) return <span style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 5 }}><Dot c="#9ca3af" /> Checking availability…</span>;
  if (available === null) return null;
  return available
    ? <span style={{ fontSize: 12, color: "#16a34a", display: "flex", alignItems: "center", gap: 5, fontWeight: 500 }}><Dot c="#22c55e" /> Available for your dates</span>
    : <span style={{ fontSize: 12, color: "#dc2626", display: "flex", alignItems: "center", gap: 5, fontWeight: 500 }}><Dot c="#ef4444" /> Not available — try different dates</span>;
}

export function ErrBox({ msg }: { msg: string }) {
  return <div style={{ padding: "10px 14px", background: "var(--color-background-danger)", color: "var(--color-text-danger)", borderRadius: 8, fontSize: 13 }}>{msg}</div>;
}

// ─── Custom property dropdown ───────────────────────────────────────────────
// Replaces native <select> which always renders with OS chrome (white bg) on open.
export function PropertyDropdown({
  resources,
  selectedId,
  onChange,
}: {
  resources: Resource[];
  selectedId: number | null;
  onChange: (id: number | "") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = resources.find(r => r.id === selectedId);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const btn: React.CSSProperties = {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 14px", borderRadius: 8, cursor: "pointer",
    background: "rgba(255,255,255,0.10)", border: "0.5px solid rgba(255,255,255,0.22)",
    color: selected ? "#ffffff" : "rgba(255,255,255,0.45)",
    fontSize: 14, fontWeight: selected ? 500 : 400,
  };
  const menu: React.CSSProperties = {
    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
    borderRadius: 10, overflow: "hidden",
    background: "rgba(30,50,55,0.97)", border: "0.5px solid rgba(255,255,255,0.18)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  };
  const optBase: React.CSSProperties = {
    padding: "10px 14px", cursor: "pointer", fontSize: 14,
    color: "#ffffff", transition: "background 0.1s",
  };

  return (
    <div style={{ marginBottom: 4 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>
        Select property
      </label>
      <div ref={ref} style={{ position: "relative" }}>
        <div style={btn} onClick={() => setOpen(v => !v)} role="button" aria-haspopup="listbox" aria-expanded={open}>
          <span>{selected ? selected.name : "— Choose a property —"}</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden
            style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {open && (
          <div style={menu} role="listbox">
            {resources.map(r => (
              <div
                key={r.id}
                role="option"
                aria-selected={r.id === selectedId}
                style={{
                  ...optBase,
                  background: r.id === selectedId ? "rgba(255,255,255,0.15)" : "transparent",
                  fontWeight: r.id === selectedId ? 600 : 400,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
                onMouseLeave={e => (e.currentTarget.style.background = r.id === selectedId ? "rgba(255,255,255,0.15)" : "transparent")}
                onClick={() => { onChange(r.id); setOpen(false); }}
              >
                {r.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
