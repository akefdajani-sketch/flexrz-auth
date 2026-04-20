"use client";

import React, { useEffect, useMemo, useState } from "react";
import { adminColors, adminZ } from "./AdminStyles";
import { SectionCard } from "./SectionCard";
import { PlanEditorModal } from "./PlanEditorModal";
import { KpiCard } from "./KpiCard";
import { StatusPill } from "./StatusPill";
import {
  AdminPlan,
  BillingInterval,
  createEmptyPlan,
  loadPlans,
  savePlans,
  upsertPlan,
} from "@/lib/admin/plansStore";
import { formatMoney as formatMoneyPrimitive } from "@/lib/tax/taxFormatting";

// Local spacing tokens for this panel (kept here to avoid coupling to other admin modules).
const adminSpace = {
  gap: 12,
};

// PR A2.3: delegates to lib/tax/formatMoney for consistent rendering.
// Renamed from `formatMoney` so it doesn't shadow the primitive's exported name.
// Cents-in ↔ major-unit conversion stays here since it's admin-plans-specific.
function formatPlanPrice(cents: number, currency: string) {
  const v = (cents || 0) / 100;
  return formatMoneyPrimitive(v, currency, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

function intervalLabel(i: BillingInterval) {
  return i === "year" ? "/yr" : "/mo";
}

function normalizeCode(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function PlansBillingPanel() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlans(loadPlans());
  }, []);

  useEffect(() => {
    if (!plans.length) return;
    savePlans(plans);
  }, [plans]);

  const kpis = useMemo(() => {
    // Mock numbers for now, but “feel” consistent.
    const active = plans.filter((p) => p.active).length;
    const mrr = 4320;
    const trials = 12;
    const subs = 58;
    const pastDue = 3;
    return {
      active,
      mrr,
      arr: mrr * 12,
      subs,
      trials,
      pastDue,
    };
  }, [plans]);

  function openCreate() {
    setError(null);
    setEditing(createEmptyPlan());
    setOpen(true);
  }

  function openEdit(plan: AdminPlan) {
    setError(null);
    setEditing({ ...plan });
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setError(null);
  }

  function toggleActive(plan: AdminPlan) {
    const next = { ...plan, active: !plan.active };
    setPlans((prev) => upsertPlan(prev, next));
  }

  function deletePlan(plan: AdminPlan) {
    const ok = window.confirm(`Delete plan "${plan.name || plan.code}"?`);
    if (!ok) return;
    setPlans((prev) => prev.filter((p) => p.id !== plan.id));
  }

  function onSave() {
    if (!editing) return;
    const code = normalizeCode(editing.code);
    const name = editing.name.trim();
    if (!name) {
      setError("Plan name is required.");
      return;
    }
    if (!code) {
      setError("Plan code is required (e.g. starter, growth, pro).");
      return;
    }
    const duplicate = plans.find((p) => p.code === code && p.id !== editing.id);
    if (duplicate) {
      setError("Plan code must be unique.");
      return;
    }
    const cleaned: AdminPlan = {
      ...editing,
      code,
      name,
      currency: (editing.currency || "USD").toUpperCase(),
      priceCents: Math.max(0, Math.round(editing.priceCents || 0)),
      trialDays: Math.max(0, Math.round(editing.trialDays || 0)),
      features: (editing.features || []).filter((f) => f.trim().length > 0),
    };
    setPlans((prev) => upsertPlan(prev, cleaned));
    closeModal();
  }

  return (
    <div style={{ display: "grid", gap: adminSpace.gap }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 950 }}>Plans & Billing</div>
          <div style={{ fontSize: 13, color: adminColors.muted, marginTop: 4 }}>
            Manage subscription plans, limits, and (later) billing lifecycle.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <button
            onClick={openCreate}
            style={{
              border: `1px solid ${adminColors.text}`,
              background: adminColors.text,
              color: "white",
              borderRadius: 12,
              padding: "10px 12px",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 13,
            }}
          >
            + Add plan
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: adminSpace.gap,
        }}
      >
        <KpiCard label="MRR" value={`$${kpis.mrr.toLocaleString()}`} sublabel="subscriptions" tone="good" deltaLabel="+3.2%" />
        <KpiCard label="ARR" value={`$${kpis.arr.toLocaleString()}`} sublabel="annualized" tone="neutral" deltaLabel="" />
        <KpiCard label="Active subs" value={kpis.subs} sublabel="paying tenants" tone="good" deltaLabel="+4" />
        <KpiCard label="Trials" value={kpis.trials} sublabel="in progress" tone="warn" deltaLabel="" />
        <KpiCard label="Past due" value={kpis.pastDue} sublabel="needs attention" tone={kpis.pastDue ? "warn" : "good"} deltaLabel="" />
        <KpiCard label="Active plans" value={kpis.active} sublabel="available for sale" tone="neutral" deltaLabel="" />
      </div>

      {/* Plans table */}
      <SectionCard
        title="Plans"
        subtitle="These are the products you will sell to tenants. Dummy data is stored in your browser for now."
        right={
          <div style={{ fontSize: 12, color: adminColors.muted }}>
            Tip: use unique codes like <b>starter</b>, <b>growth</b>, <b>pro</b>
          </div>
        }
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: adminColors.muted }}>
                <th style={{ padding: "10px 8px" }}>Plan</th>
                <th style={{ padding: "10px 8px" }}>Code</th>
                <th style={{ padding: "10px 8px" }}>Price</th>
                <th style={{ padding: "10px 8px" }}>Trial</th>
                <th style={{ padding: "10px 8px" }}>Status</th>
                <th style={{ padding: "10px 8px" }}>Limits</th>
                <th style={{ padding: "10px 8px" }} />
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                const limits = p.limits || {};
                const limitsLabel = [
                  limits.maxServices != null ? `Services ${limits.maxServices || 0}` : "Services ∞",
                  limits.maxStaff != null ? `Staff ${limits.maxStaff || 0}` : "Staff ∞",
                  limits.maxResources != null ? `Res ${limits.maxResources || 0}` : "Res ∞",
                ].join(" · ");
                return (
                  <tr key={p.id} style={{ borderTop: `1px solid ${adminColors.border}` }}>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ fontWeight: 900 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: adminColors.muted, marginTop: 3 }}>
                        Updated {new Date(p.updatedAt).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px", fontFamily: "ui-monospace, SFMono-Regular" }}>
                      {p.code}
                    </td>
                    <td style={{ padding: "12px 8px", fontWeight: 900 }}>
                      {formatPlanPrice(p.priceCents, p.currency)}{intervalLabel(p.interval)}
                    </td>
                    <td style={{ padding: "12px 8px" }}>{p.trialDays} days</td>
                    <td style={{ padding: "12px 8px" }}>
                      <StatusPill status={p.active ? "healthy" : "unknown"} label={p.active ? "Active" : "Hidden"} />
                    </td>
                    <td style={{ padding: "12px 8px", color: adminColors.muted }}>
                      {limitsLabel}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => toggleActive(p)}
                          style={{
                            border: `1px solid ${adminColors.border}`,
                            background: "white",
                            borderRadius: 10,
                            padding: "8px 10px",
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                        >
                          {p.active ? "Hide" : "Show"}
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          style={{
                            border: `1px solid ${adminColors.border}`,
                            background: "white",
                            borderRadius: 10,
                            padding: "8px 10px",
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deletePlan(p)}
                          style={{
                            border: `1px solid ${adminColors.border}`,
                            background: "white",
                            borderRadius: 10,
                            padding: "8px 10px",
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!plans.length && (
                <tr>
                  <td colSpan={7} style={{ padding: "14px 8px", color: adminColors.muted }}>
                    No plans yet. Click <b>Add plan</b> to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Edit/Create Modal */}
      <PlanEditorModal
        open={open}
        editing={editing}
        setEditing={setEditing}
        plans={plans}
        error={error}
        onClose={closeModal}
        onSave={onSave}
      />
    </div>
  );
}

