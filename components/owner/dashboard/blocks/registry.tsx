"use client";

import React from "react";
import type { DashboardBlockDef, DashboardContext, TrendPoint } from "./types";
import { adminColors } from "@/components/admin/AdminStyles";
import { formatMoney } from "@/lib/tax/taxFormatting";

// ─── Shared micro-chart primitives ────────────────────────────────────────────

function SparkLine({
  points,
  color = adminColors.accent.indigo,
  height = 52,
  fill = true,
}: {
  points: number[];
  color?: string;
  height?: number;
  fill?: boolean;
}) {
  if (points.length < 2) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 11, color: adminColors.muted }}>Not enough data yet</span>
      </div>
    );
  }
  const w = 300;
  const h = height;
  const pad = 4;
  const max = Math.max(...points, 0.01);
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2));
  const ys = points.map((v) => h - pad - ((v / max) * (h - pad * 2)));
  const pathD = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const fillD = `${pathD} L${xs[xs.length - 1].toFixed(1)},${h} L${xs[0].toFixed(1)},${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height, display: "block" }} preserveAspectRatio="none">
      {fill && (
        <defs>
          <linearGradient id={`sg-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
      )}
      {fill && (
        <path d={fillD} fill={`url(#sg-${color.replace(/[^a-z0-9]/gi, "")})`} />
      )}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Last point dot */}
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill={color} />
    </svg>
  );
}

function MiniBarChart({
  items,
  color = adminColors.accent.indigo,
  maxBars = 6,
}: {
  items: { label: string; value: number }[];
  color?: string;
  maxBars?: number;
}) {
  const top = items.slice(0, maxBars);
  if (!top.length) return <div style={{ fontSize: 11, color: adminColors.muted }}>No data yet</div>;
  const max = Math.max(...top.map((i) => i.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {top.map((item) => {
        const pct = Math.max(4, (item.value / max) * 100);
        return (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                fontSize: 11,
                color: adminColors.muted,
                width: 100,
                flexShrink: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontWeight: 700,
              }}
              title={item.label}
            >
              {item.label}
            </div>
            <div style={{ flex: 1, height: 10, background: adminColors.border, borderRadius: 999, overflow: "hidden" }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: color,
                  borderRadius: 999,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <div style={{ fontSize: 11, fontWeight: 900, color: adminColors.text, width: 24, textAlign: "right" }}>
              {item.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatRow({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" | "bad" | "neutral" }) {
  const toneColor =
    tone === "good" ? adminColors.accent.emerald
    : tone === "warn" ? adminColors.accent.amber
    : tone === "bad"  ? adminColors.accent.rose
    : adminColors.text;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
      <div style={{ fontSize: 12, color: adminColors.muted, fontWeight: 700 }}>{label}</div>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontSize: 22, fontWeight: 950, color: toneColor, letterSpacing: "-0.02em" }}>{value}</span>
        {sub && <div style={{ fontSize: 11, color: adminColors.muted, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function WindowBadge({ days }: { days: number }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 800,
      padding: "2px 7px", borderRadius: 999,
      background: "rgba(79,70,229,0.10)",
      color: adminColors.accent.indigo,
      letterSpacing: "0.02em",
    }}>
      {days}d
    </span>
  );
}

function buildDayTrend(points: TrendPoint[], key: "count" | "amount", days: number): number[] {
  if (!points.length) return [];
  // Build a date→value map
  const map = new Map<string, number>();
  for (const p of points) map.set(p.date, key === "count" ? (p.count ?? 0) : (p.amount ?? 0));
  // Fill every day in the window
  const result: number[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    result.push(map.get(iso) ?? 0);
  }
  return result;
}

// PR A2.3: delegates to lib/tax/formatMoney for consistent rendering.
// Dashboard KPIs render whole-dollar amounts so we keep the 0-dp defaults.
function formatCurrency(amount: number, code: string): string {
  if (!amount && amount !== 0) return "—";
  return formatMoney(amount, code || "USD", {
    locale: "en-US",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// ─── Block definitions ────────────────────────────────────────────────────────

export const DASHBOARD_BLOCKS: DashboardBlockDef[] = [
  // ── Existing: Today snapshot ──────────────────────────────────────────────
  {
    id: "snapshot",
    title: "Today snapshot",
    description: "At-a-glance operational metrics.",
    size: "lg",
    defaultEnabled: true,
    defaultOrder: 10,
    render: (ctx) => {
      const today    = ctx.kpiCountsLoading ? "…" : String(ctx.kpiCounts.today);
      const upcoming = ctx.kpiCountsLoading ? "…" : String(ctx.kpiCounts.upcoming);
      const all      = ctx.kpiCountsLoading ? "…" : String(ctx.kpiCounts.all);
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
          {[
            { label: "Date",             value: ctx.dayViewDate },
            { label: "Bookings today",   value: today },
            { label: "Upcoming",         value: upcoming, sub: `Loaded: ${ctx.bookingsLoaded}` },
            { label: "Customers",        value: String(ctx.customersCount) },
            { label: "Catalog items",    value: String(ctx.catalogCount) },
            { label: "All bookings",     value: all },
          ].map(({ label, value, sub }) => (
            <div key={label}>
              <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7 }}>{label}</div>
              <div style={{ fontWeight: 950, fontSize: 17, marginTop: 2 }}>{value}</div>
              {sub && <div style={{ fontSize: 11, opacity: 0.65, marginTop: 1 }}>{sub}</div>}
            </div>
          ))}
        </div>
      );
    },
  },

  // ── PR-DASH-1: Revenue ────────────────────────────────────────────────────
  {
    id: "revenue",
    title: "Revenue",
    description: "Confirmed booking revenue in the selected window.",
    size: "md",
    defaultEnabled: true,
    defaultOrder: 15,
    render: (ctx) => {
      const s = ctx.stats;
      const loading = ctx.statsLoading;
      const amount = s ? formatCurrency(s.revenue_total, ctx.currencyCode) : "…";
      const trend = s ? buildDayTrend(s.revenue_by_day, "amount", s.window_days) : [];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: adminColors.muted, fontWeight: 800, marginBottom: 2 }}>
                Total confirmed revenue
              </div>
              <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: "-0.03em", color: adminColors.accent.emerald }}>
                {loading ? "…" : amount}
              </div>
            </div>
            <WindowBadge days={ctx.statsWindowDays} />
          </div>
          {!loading && trend.length > 1 && (
            <SparkLine points={trend} color={adminColors.accent.emerald} height={44} />
          )}
          {s && (
            <div style={{ fontSize: 11, color: adminColors.muted, fontWeight: 700 }}>
              {s.confirmed_count} confirmed booking{s.confirmed_count !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      );
    },
  },

  // ── PR-DASH-1: Cancellation rate ──────────────────────────────────────────
  {
    id: "cancellationRate",
    title: "Cancellation rate",
    description: "Cancelled bookings as a % of total in the window.",
    size: "md",
    defaultEnabled: true,
    defaultOrder: 20,
    render: (ctx) => {
      const s = ctx.stats;
      const loading = ctx.statsLoading;
      const rate = s?.cancellation_rate ?? 0;
      const tone: "good" | "warn" | "bad" =
        rate < 10 ? "good" : rate < 25 ? "warn" : "bad";
      const toneColor =
        tone === "good" ? adminColors.accent.emerald
        : tone === "warn" ? adminColors.accent.amber
        : adminColors.accent.rose;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, color: adminColors.muted, fontWeight: 800, marginBottom: 2 }}>
                Cancellation rate
              </div>
              <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: "-0.03em", color: toneColor }}>
                {loading ? "…" : `${rate}%`}
              </div>
            </div>
            <WindowBadge days={ctx.statsWindowDays} />
          </div>
          {/* Progress bar */}
          <div style={{ height: 8, background: adminColors.border, borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(rate, 100)}%`,
              height: "100%",
              background: toneColor,
              borderRadius: 999,
              transition: "width 0.5s ease",
            }} />
          </div>
          {s && !loading && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[
                { label: "Confirmed", value: s.confirmed_count, color: adminColors.accent.emerald },
                { label: "Cancelled", value: s.cancelled_count, color: adminColors.accent.rose },
                { label: "Pending",   value: s.pending_count,   color: adminColors.accent.amber },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 950, color }}>{value}</div>
                  <div style={{ fontSize: 10, color: adminColors.muted, fontWeight: 700 }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    },
  },

  // ── PR-DASH-1: Bookings trend chart ───────────────────────────────────────
  {
    id: "bookingsTrend",
    title: "Bookings trend",
    description: "Daily booking volume over the selected window.",
    size: "lg",
    defaultEnabled: true,
    defaultOrder: 25,
    render: (ctx) => {
      const s = ctx.stats;
      const loading = ctx.statsLoading;
      const trend = s ? buildDayTrend(s.bookings_by_day, "count", s.window_days) : [];
      const total = trend.reduce((a, b) => a + b, 0);
      const avg = trend.length > 0 ? (total / trend.length).toFixed(1) : "0";
      const peak = trend.length > 0 ? Math.max(...trend) : 0;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: adminColors.muted, fontWeight: 800 }}>
              Bookings over last {ctx.statsWindowDays} days
            </div>
            <WindowBadge days={ctx.statsWindowDays} />
          </div>
          {loading
            ? <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", color: adminColors.muted, fontSize: 12 }}>Loading…</div>
            : <SparkLine points={trend} color={adminColors.accent.indigo} height={64} />
          }
          {!loading && (
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Total", value: String(total) },
                { label: "Daily avg", value: avg },
                { label: "Peak day", value: String(peak) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 17, fontWeight: 950, color: adminColors.text }}>{value}</div>
                  <div style={{ fontSize: 11, color: adminColors.muted, fontWeight: 700 }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    },
  },

  // ── PR-DASH-1: Revenue trend chart ────────────────────────────────────────
  {
    id: "revenueTrend",
    title: "Revenue trend",
    description: "Daily confirmed revenue over the selected window.",
    size: "lg",
    defaultEnabled: false,
    defaultOrder: 30,
    render: (ctx) => {
      const s = ctx.stats;
      const loading = ctx.statsLoading;
      const trend = s ? buildDayTrend(s.revenue_by_day, "amount", s.window_days) : [];
      const peak = trend.length > 0 ? formatCurrency(Math.max(...trend), ctx.currencyCode) : "—";
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: adminColors.muted, fontWeight: 800 }}>
              Daily revenue over last {ctx.statsWindowDays} days
            </div>
            <WindowBadge days={ctx.statsWindowDays} />
          </div>
          {loading
            ? <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", color: adminColors.muted, fontSize: 12 }}>Loading…</div>
            : <SparkLine points={trend} color={adminColors.accent.emerald} height={64} />
          }
          {!loading && s && (
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Total", value: formatCurrency(s.revenue_total, ctx.currencyCode) },
                { label: "Peak day", value: peak },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 17, fontWeight: 950, color: adminColors.accent.emerald }}>{value}</div>
                  <div style={{ fontSize: 11, color: adminColors.muted, fontWeight: 700 }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    },
  },

  // ── PR-DASH-1: Top services ───────────────────────────────────────────────
  {
    id: "topServices",
    title: "Top services",
    description: "Most booked services in the selected window.",
    size: "lg",
    defaultEnabled: true,
    defaultOrder: 35,
    render: (ctx) => {
      const s = ctx.stats;
      const loading = ctx.statsLoading;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: adminColors.muted, fontWeight: 800 }}>
              Bookings by service — last {ctx.statsWindowDays} days
            </div>
            <WindowBadge days={ctx.statsWindowDays} />
          </div>
          {loading
            ? <div style={{ fontSize: 12, color: adminColors.muted }}>Loading…</div>
            : !s?.bookings_by_service.length
            ? <div style={{ fontSize: 12, color: adminColors.muted }}>No bookings in this window yet.</div>
            : <MiniBarChart
                items={s.bookings_by_service.map((r) => ({ label: r.service_name, value: r.count }))}
                color={adminColors.accent.cyan}
              />
          }
        </div>
      );
    },
  },

  // ── Existing: Getting started ─────────────────────────────────────────────
  {
    id: "gettingStarted",
    title: "Getting started",
    description: "Recommended setup checklist for a smooth launch.",
    size: "md",
    defaultEnabled: true,
    defaultOrder: 90,
    render: () => (
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: 13 }}>
        <li>Confirm business hours + breaks.</li>
        <li>Add services, staff, and resources.</li>
        <li>Test a booking from the public booking page.</li>
        <li>Review memberships (if you use them).</li>
      </ul>
    ),
  },

  // ── Existing: Notes ───────────────────────────────────────────────────────
  {
    id: "notes",
    title: "Notes",
    description: "Lightweight scratchpad (saved locally).",
    size: "md",
    defaultEnabled: false,
    defaultOrder: 100,
    render: () => (
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        Enable this block in "Customize" to keep simple notes on your dashboard.
      </div>
    ),
  },
];
