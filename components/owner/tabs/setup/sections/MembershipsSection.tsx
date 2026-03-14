"use client";

import React from "react";

type PrepaidProductType = "service_package" | "credit_bundle" | "time_pass";

type MembershipPlan = {
  id: number;
  name: string;
  description?: string | null;
  billing_type?: string | null;
  price: number | null;
  currency: string | null;
  included_minutes: number | null;
  included_uses: number | null;
  validity_days: number | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type PrepaidProduct = {
  id: string;
  name: string;
  type: PrepaidProductType;
  description?: string;
  isActive: boolean;
  price: number;
  currency: string | null;
  validityDays: number;
  creditAmount: number | null;
  sessionCount: number | null;
  minutesTotal: number | null;
  eligibleServiceIds: number[];
  allowMembershipBundle: boolean;
  stackable: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const EMPTY_DRAFT: PrepaidProduct = {
  id: "",
  name: "",
  type: "service_package",
  description: "",
  isActive: true,
  price: 0,
  currency: null,
  validityDays: 30,
  creditAmount: null,
  sessionCount: 5,
  minutesTotal: null,
  eligibleServiceIds: [],
  allowMembershipBundle: false,
  stackable: false,
};

function formatProductType(type: PrepaidProductType): string {
  if (type === "credit_bundle") return "Credit bundle";
  if (type === "time_pass") return "Time pass";
  return "Service package";
}

function typeHint(type: PrepaidProductType): string {
  if (type === "credit_bundle") return "Sell credits that can be redeemed later.";
  if (type === "time_pass") return "Sell time-based access such as 6 months off-peak play.";
  return "Sell bundles such as 5 golf lessons or 10 simulator sessions.";
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function formatDateTime(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatTransactionType(value?: string): string {
  const text = String(value || "").replace(/_/g, " ").trim();
  if (!text) return "Activity";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function quantityTone(value: number): string {
  if (value > 0) return "#166534";
  if (value < 0) return "#b91c1c";
  return "#64748b";
}

export default function MembershipsSection({ ctx }: { ctx: any }) {
  const services: any[] = Array.isArray(ctx?.services) ? ctx.services : [];
  const handlePatchService: ((id: number, patch: Record<string, any>) => void) | null =
    typeof ctx?.handlePatchService === "function" ? ctx.handlePatchService : null;

  const membershipPlans: MembershipPlan[] = Array.isArray(ctx?.membershipPlans) ? ctx.membershipPlans : [];
  const membershipPlansLoading = Boolean(ctx?.membershipPlansLoading);
  const membershipPlansSaving = Boolean(ctx?.membershipPlansSaving);
  const membershipPlansError: string = ctx?.membershipPlansError ?? "";
  const membershipPlansMessage: string = ctx?.membershipPlansMessage ?? "";
  const createMembershipPlan = typeof ctx?.createMembershipPlan === "function" ? ctx.createMembershipPlan : async () => {};
  const updateMembershipPlan = typeof ctx?.updateMembershipPlan === "function" ? ctx.updateMembershipPlan : async () => {};
  const archiveMembershipPlan = typeof ctx?.archiveMembershipPlan === "function" ? ctx.archiveMembershipPlan : async () => {};

  const membershipCheckoutPolicy =
    ctx?.membershipCheckoutPolicy ?? {
      mode: "smart_top_up",
      topUp: {
        enabled: false,
        allowSelfServe: false,
        currency: ctx?.membershipCheckoutCurrency ?? null,
        pricePerMinute: 0,
        roundToMinutes: 30,
        minPurchaseMinutes: 30,
      },
      renewUpgrade: { enabled: false },
      strict: { enabled: false },
    };

  const setMembershipCheckoutPolicy = ctx?.setMembershipCheckoutPolicy ?? (() => {});
  const saveMembershipCheckoutPolicy = ctx?.saveMembershipCheckoutPolicy ?? (async () => {});

  const membershipCheckoutLoading = Boolean(ctx?.membershipCheckoutLoading);
  const membershipCheckoutSaving = Boolean(ctx?.membershipCheckoutSaving);
  const membershipCheckoutError: string = ctx?.membershipCheckoutError ?? "";
  const membershipCheckoutMessage: string = ctx?.membershipCheckoutMessage ?? "";

  const prepaidProducts: PrepaidProduct[] = Array.isArray(ctx?.prepaidProducts) ? ctx.prepaidProducts : [];
  const prepaidLoading = Boolean(ctx?.prepaidLoading);
  const prepaidSaving = Boolean(ctx?.prepaidSaving);
  const prepaidMessage: string = ctx?.prepaidMessage ?? "";
  const prepaidError: string = ctx?.prepaidError ?? "";
  const savePrepaidProducts = typeof ctx?.savePrepaidProducts === "function" ? ctx.savePrepaidProducts : async () => {};
  const prepaidLedgerLoading = Boolean(ctx?.prepaidLedgerLoading);
  const prepaidLedgerError: string = ctx?.prepaidLedgerError ?? "";
  const prepaidLedgerSummary = ctx?.prepaidLedgerSummary && typeof ctx.prepaidLedgerSummary === "object" ? ctx.prepaidLedgerSummary : {};
  const prepaidTransactions: any[] = Array.isArray(ctx?.prepaidTransactions) ? ctx.prepaidTransactions : [];
  const prepaidRedemptions: any[] = Array.isArray(ctx?.prepaidRedemptions) ? ctx.prepaidRedemptions : [];
  const prepaidCustomers: any[] = Array.isArray(ctx?.prepaidCustomers) ? ctx.prepaidCustomers : [];
  const prepaidCustomersLoading = Boolean(ctx?.prepaidCustomersLoading);
  const prepaidEntitlements: any[] = Array.isArray(ctx?.prepaidEntitlements) ? ctx.prepaidEntitlements : [];
  const prepaidEntitlementsLoading = Boolean(ctx?.prepaidEntitlementsLoading);
  const prepaidEntitlementsSaving = Boolean(ctx?.prepaidEntitlementsSaving);
  const prepaidEntitlementsError: string = ctx?.prepaidEntitlementsError ?? "";
  const prepaidEntitlementsMessage: string = ctx?.prepaidEntitlementsMessage ?? "";
  const grantPrepaidEntitlement = typeof ctx?.grantPrepaidEntitlement === "function" ? ctx.grantPrepaidEntitlement : async () => {};
  const adjustPrepaidEntitlement = typeof ctx?.adjustPrepaidEntitlement === "function" ? ctx.adjustPrepaidEntitlement : async () => {};
  const reloadPrepaidLedger = typeof ctx?.reloadPrepaidLedger === "function" ? ctx.reloadPrepaidLedger : async () => {};

  const [prepaidTab, setPrepaidTab] = React.useState<"plans" | "packages" | "ledger" | "rules">("plans");
  const [draft, setDraft] = React.useState<PrepaidProduct>(EMPTY_DRAFT);
  const [isEditing, setIsEditing] = React.useState(false);
  const [planDraft, setPlanDraft] = React.useState<any>(null);
  const [isEditingPlan, setIsEditingPlan] = React.useState(false);
  const [grantDraft, setGrantDraft] = React.useState({ customerId: "", prepaidProductId: "", quantity: 1, startsAt: "", expiresAt: "", notes: "" });
  const [adjustDrafts, setAdjustDrafts] = React.useState<Record<string, string>>({});

  const defaultCurrency = membershipCheckoutPolicy?.topUp?.currency || ctx?.membershipCheckoutCurrency || "JOD";

  const resetDraft = React.useCallback(() => {
    setDraft({ ...EMPTY_DRAFT, currency: defaultCurrency });
    setIsEditing(false);
  }, [defaultCurrency]);

  const emptyPlanDraft = React.useCallback(() => ({
    id: null,
    name: "",
    description: "",
    billing_type: "manual",
    price: "",
    currency: defaultCurrency,
    included_minutes: "",
    included_uses: "",
    validity_days: "",
    is_active: true,
  }), [defaultCurrency]);

  const resetPlanDraft = React.useCallback(() => {
    setPlanDraft(emptyPlanDraft());
    setIsEditingPlan(false);
  }, [emptyPlanDraft]);

  React.useEffect(() => {
    if (!isEditing && !draft.currency) {
      setDraft((prev) => ({ ...prev, currency: defaultCurrency }));
    }
  }, [defaultCurrency, draft.currency, isEditing]);

  React.useEffect(() => {
    if (!planDraft) {
      setPlanDraft(emptyPlanDraft());
      return;
    }
    if (!isEditingPlan && !planDraft.currency) {
      setPlanDraft((prev: any) => ({ ...(prev || emptyPlanDraft()), currency: defaultCurrency }));
    }
  }, [defaultCurrency, emptyPlanDraft, isEditingPlan, planDraft]);

  const subTabPill = (key: "plans" | "packages" | "ledger" | "rules", label: string, icon: string) => {
    const active = prepaidTab === key;
    return (
      <button
        type="button"
        className={"bf-setup-subtabpill" + (active ? " is-active" : "")}
        onClick={() => setPrepaidTab(key)}
        style={{ borderColor: active ? "#0f172a" : "#cbd5e1" }}
      >
        <span className="bf-setup-subtabicon" aria-hidden="true">{icon}</span>
        <span className="bf-setup-subtablabel">{label}</span>
      </button>
    );
  };

  const enabledMembershipServices = services.filter((s: any) => !!s?.allow_membership);
  const activeProducts = prepaidProducts.filter((p) => p?.isActive);
  const inactiveProducts = prepaidProducts.filter((p) => !p?.isActive);
  const activeMembershipPlans = membershipPlans.filter((plan) => plan?.is_active);
  const membershipPlansWithMinutes = membershipPlans.filter((plan) => Number(plan?.included_minutes || 0) > 0);
  const membershipPlansWithUses = membershipPlans.filter((plan) => Number(plan?.included_uses || 0) > 0);

  const startCreate = (type: PrepaidProductType) => {
    setDraft({
      ...EMPTY_DRAFT,
      id: "",
      type,
      currency: defaultCurrency,
      sessionCount: type === "service_package" ? 5 : null,
      creditAmount: type === "credit_bundle" ? 100 : null,
      minutesTotal: type === "time_pass" ? 600 : null,
      validityDays: type === "time_pass" ? 180 : 30,
    });
    setPrepaidTab("packages");
    setIsEditing(true);
  };

  const editProduct = (product: PrepaidProduct) => {
    setDraft({ ...EMPTY_DRAFT, ...product, eligibleServiceIds: Array.isArray(product.eligibleServiceIds) ? product.eligibleServiceIds : [] });
    setPrepaidTab("packages");
    setIsEditing(true);
  };

  const toggleEligibleService = (serviceId: number, checked: boolean) => {
    setDraft((prev) => ({
      ...prev,
      eligibleServiceIds: checked
        ? Array.from(new Set([...(prev.eligibleServiceIds || []), serviceId]))
        : (prev.eligibleServiceIds || []).filter((id) => id !== serviceId),
    }));
  };

  const upsertDraft = async () => {
    const trimmed = String(draft.name || "").trim();
    if (!trimmed) return;

    const next: PrepaidProduct = {
      ...draft,
      id: draft.id || `pp_${Date.now()}`,
      name: trimmed,
      currency: draft.currency || defaultCurrency,
      description: String(draft.description || "").trim(),
      validityDays: Number(draft.validityDays || 0),
      price: Number(draft.price || 0),
      creditAmount: draft.type === "credit_bundle" ? Number(draft.creditAmount || 0) : null,
      sessionCount: draft.type === "service_package" ? Number(draft.sessionCount || 0) : null,
      minutesTotal: draft.type === "time_pass" ? Number(draft.minutesTotal || 0) : null,
      eligibleServiceIds: Array.isArray(draft.eligibleServiceIds) ? draft.eligibleServiceIds.map((x) => Number(x)).filter(Boolean) : [],
      updatedAt: new Date().toISOString(),
      createdAt: draft.createdAt || new Date().toISOString(),
    };

    const sorted = [...prepaidProducts];
    const index = sorted.findIndex((item) => item.id === next.id);
    if (index >= 0) sorted[index] = next;
    else sorted.unshift(next);

    await savePrepaidProducts(sorted);
    resetDraft();
  };

  const archiveProduct = async (id: string) => {
    const sorted = prepaidProducts.map((item) =>
      item.id === id ? { ...item, isActive: false, updatedAt: new Date().toISOString() } : item
    );
    await savePrepaidProducts(sorted);
    if (draft.id === id) resetDraft();
  };

  const restoreProduct = async (id: string) => {
    const sorted = prepaidProducts.map((item) =>
      item.id === id ? { ...item, isActive: true, updatedAt: new Date().toISOString() } : item
    );
    await savePrepaidProducts(sorted);
  };

  const startCreatePlan = () => {
    setPlanDraft(emptyPlanDraft());
    setPrepaidTab("plans");
    setIsEditingPlan(true);
  };

  const startEditPlan = (plan: MembershipPlan) => {
    setPlanDraft({
      id: plan.id,
      name: plan.name || "",
      description: plan.description || "",
      billing_type: plan.billing_type || "manual",
      price: plan.price == null ? "" : String(plan.price),
      currency: plan.currency || defaultCurrency,
      included_minutes: plan.included_minutes == null ? "" : String(plan.included_minutes),
      included_uses: plan.included_uses == null ? "" : String(plan.included_uses),
      validity_days: plan.validity_days == null ? "" : String(plan.validity_days),
      is_active: plan.is_active !== false,
    });
    setPrepaidTab("plans");
    setIsEditingPlan(true);
  };

  const submitPlanDraft = async () => {
    const trimmed = String(planDraft?.name || "").trim();
    if (!trimmed) return;

    const payload = {
      name: trimmed,
      description: String(planDraft?.description || "").trim() || null,
      billing_type: String(planDraft?.billing_type || "manual"),
      price: planDraft?.price === "" ? 0 : Number(planDraft?.price || 0),
      currency: String(planDraft?.currency || defaultCurrency || "JOD"),
      included_minutes: planDraft?.included_minutes === "" ? null : Number(planDraft?.included_minutes || 0),
      included_uses: planDraft?.included_uses === "" ? null : Number(planDraft?.included_uses || 0),
      validity_days: planDraft?.validity_days === "" ? null : Number(planDraft?.validity_days || 0),
      is_active: !!planDraft?.is_active,
    };

    if (planDraft?.id) await updateMembershipPlan(Number(planDraft.id), payload);
    else await createMembershipPlan(payload);
    resetPlanDraft();
  };

  const togglePlanArchive = async (plan: MembershipPlan) => {
    await archiveMembershipPlan(Number(plan.id), !plan.is_active);
    if (Number(planDraft?.id || 0) === Number(plan.id)) resetPlanDraft();
  };

  const productMetricLabel = (product: PrepaidProduct): string => {
    if (product.type === "credit_bundle") return `${product.creditAmount || 0} credits`;
    if (product.type === "time_pass") return `${product.minutesTotal || 0} min total`;
    return `${product.sessionCount || 0} sessions`;
  };

  const customerLabel = (customer: any): string => {
    const name = String(customer?.name || "").trim();
    const email = String(customer?.email || "").trim();
    if (name && email) return `${name} · ${email}`;
    return name || email || `Customer #${customer?.id || ""}`;
  };

  const submitGrant = async () => {
    const customerId = Number(grantDraft.customerId || 0);
    const prepaidProductId = Number(grantDraft.prepaidProductId || 0);
    const quantity = Math.max(1, Number(grantDraft.quantity || 0));
    if (!customerId || !prepaidProductId || !quantity) return;
    await grantPrepaidEntitlement({
      customerId,
      prepaidProductId,
      quantity,
      startsAt: grantDraft.startsAt || null,
      expiresAt: grantDraft.expiresAt || null,
      notes: grantDraft.notes || null,
      status: "active",
    });
    setGrantDraft({ customerId: "", prepaidProductId: "", quantity: 1, startsAt: "", expiresAt: "", notes: "" });
  };

  const submitAdjust = async (entitlementId: number) => {
    const raw = String(adjustDrafts[String(entitlementId)] || "").trim();
    const delta = Number(raw || 0);
    if (!delta) return;
    await adjustPrepaidEntitlement(entitlementId, delta, "Manual ledger adjustment");
    setAdjustDrafts((prev) => ({ ...prev, [String(entitlementId)]: "" }));
  };

  return (
    <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f9fafb" }}>
      <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e2e8f0", background: "#ffffff" }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 950, color: "#0f172a" }}>Prepaid</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Memberships stay intact, while standalone prepaid products let tenants sell bundles, passes, and credits.
          </div>

          <div className="bf-setup-subtabs" style={{ marginTop: 10 }}>
            {subTabPill("plans", "Plans", "✅")}
            {subTabPill("packages", "Packages", "🎟️")}
            {subTabPill("ledger", "Ledger", "🧾")}
            {subTabPill("rules", "Rules", "🛡️")}
          </div>
        </div>

        {(prepaidMessage || prepaidError) && prepaidTab !== "rules" ? (
          <div
            style={{
              marginBottom: 12,
              padding: "9px 12px",
              borderRadius: 12,
              border: `1px solid ${prepaidError ? "#fecaca" : "#bbf7d0"}`,
              background: prepaidError ? "#fef2f2" : "#f0fdf4",
              color: prepaidError ? "#b91c1c" : "#166534",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {prepaidError || prepaidMessage}
          </div>
        ) : null}

        {prepaidTab === "plans" ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>Membership plans</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Real membership plans shown to the tenant dashboard. Packages stay separate in the Packages tab.
                </div>
              </div>
              <button type="button" onClick={startCreatePlan} style={{ border: "1px solid #0f172a", background: "#0f172a", color: "#fff", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 900 }}>
                + New plan
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc" }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Active plans</div><div style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 950, color: "#0f172a", marginTop: 6 }}>{activeMembershipPlans.length}</div></div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc" }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Plans with minutes</div><div style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 950, color: "#0f172a", marginTop: 6 }}>{membershipPlansWithMinutes.length}</div></div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc" }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Plans with uses</div><div style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 950, color: "#0f172a", marginTop: 6 }}>{membershipPlansWithUses.length}</div></div>
            </div>

            {membershipPlansError ? <div style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 12, fontWeight: 800 }}>{membershipPlansError}</div> : null}
            {membershipPlansMessage ? <div style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", fontSize: 12, fontWeight: 800 }}>{membershipPlansMessage}</div> : null}

            <div style={{ display: "grid", gridTemplateColumns: isEditingPlan ? "minmax(0, 1.15fr) minmax(320px, 0.85fr)" : "1fr", gap: 12 }}>
              <div style={{ display: "grid", gap: 10 }}>
                {membershipPlansLoading ? (
                  <div style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, color: "#64748b", fontWeight: 700 }}>Loading membership plans…</div>
                ) : null}

                {!membershipPlans.length && !membershipPlansLoading ? (
                  <div style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                    No membership plans yet. Create your first plan to make memberships visible in the tenant dashboard.
                  </div>
                ) : null}

                {membershipPlans.map((plan) => (
                  <div key={plan.id} style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc", display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 14, fontWeight: 950, color: "#0f172a" }}>{plan.name}</div>
                          <span style={{ padding: "3px 8px", borderRadius: 999, background: plan.is_active ? "#dcfce7" : "#e2e8f0", color: plan.is_active ? "#166534" : "#475569", fontSize: 11, fontWeight: 900 }}>{plan.is_active ? "Active" : "Archived"}</span>
                          <span style={{ padding: "3px 8px", borderRadius: 999, background: "#eef2ff", color: "#3730a3", fontSize: 11, fontWeight: 900 }}>{plan.billing_type || "manual"}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{plan.description || "Membership plan"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => startEditPlan(plan)} style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", borderRadius: 999, padding: "7px 12px", fontSize: 12, fontWeight: 900 }}>Edit</button>
                        <button type="button" onClick={() => void togglePlanArchive(plan)} disabled={membershipPlansSaving} style={{ border: "1px solid " + (plan.is_active ? "#cbd5e1" : "#0f172a"), background: plan.is_active ? "#fff" : "#0f172a", color: plan.is_active ? "#0f172a" : "#fff", borderRadius: 999, padding: "7px 12px", fontSize: 12, fontWeight: 900 }}>{plan.is_active ? "Archive" : "Restore"}</button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                      <div><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Price</div><div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", marginTop: 3 }}>{plan.price ?? 0} {plan.currency || defaultCurrency}</div></div>
                      <div><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Minutes</div><div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", marginTop: 3 }}>{plan.included_minutes ?? 0}</div></div>
                      <div><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Uses</div><div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", marginTop: 3 }}>{plan.included_uses ?? 0}</div></div>
                      <div><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Validity</div><div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", marginTop: 3 }}>{plan.validity_days ?? 0} days</div></div>
                    </div>
                  </div>
                ))}
              </div>

              {isEditingPlan ? (
                <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#ffffff", display: "grid", gap: 10, alignSelf: "start", position: "sticky", top: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 950, color: "#0f172a" }}>{planDraft?.id ? "Edit membership plan" : "Create membership plan"}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Define what this plan includes, how long it lasts, and whether it is active.</div>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}><div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Plan name</div><input type="text" value={planDraft?.name || ""} onChange={(e) => setPlanDraft((prev: any) => ({ ...(prev || emptyPlanDraft()), name: e.target.value }))} className="bf-input" style={{ height: 40 }} placeholder="Example: Birdie Monthly" /></div>
                  <div style={{ display: "grid", gap: 6 }}><div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Description</div><textarea value={planDraft?.description || ""} onChange={(e) => setPlanDraft((prev: any) => ({ ...(prev || emptyPlanDraft()), description: e.target.value }))} className="bf-input" style={{ minHeight: 80, paddingTop: 10 }} placeholder="Short owner-facing description" /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}><div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Billing type</div><select value={planDraft?.billing_type || "manual"} onChange={(e) => setPlanDraft((prev: any) => ({ ...(prev || emptyPlanDraft()), billing_type: e.target.value }))} className="bf-input" style={{ height: 40 }}><option value="manual">Manual</option><option value="recurring">Recurring</option><option value="one_time">One time</option></select></div>
                    <div style={{ display: "grid", gap: 6 }}><div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Currency</div><input type="text" value={planDraft?.currency || ""} onChange={(e) => setPlanDraft((prev: any) => ({ ...(prev || emptyPlanDraft()), currency: e.target.value }))} className="bf-input" style={{ height: 40 }} placeholder="JOD" /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}><div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Price</div><input type="number" min="0" step="0.01" value={planDraft?.price || ""} onChange={(e) => setPlanDraft((prev: any) => ({ ...(prev || emptyPlanDraft()), price: e.target.value }))} className="bf-input" style={{ height: 40 }} placeholder="0" /></div>
                    <div style={{ display: "grid", gap: 6 }}><div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Validity days</div><input type="number" min="0" step="1" value={planDraft?.validity_days || ""} onChange={(e) => setPlanDraft((prev: any) => ({ ...(prev || emptyPlanDraft()), validity_days: e.target.value }))} className="bf-input" style={{ height: 40 }} placeholder="30" /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}><div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Included minutes</div><input type="number" min="0" step="1" value={planDraft?.included_minutes || ""} onChange={(e) => setPlanDraft((prev: any) => ({ ...(prev || emptyPlanDraft()), included_minutes: e.target.value }))} className="bf-input" style={{ height: 40 }} placeholder="0" /></div>
                    <div style={{ display: "grid", gap: 6 }}><div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Included uses</div><input type="number" min="0" step="1" value={planDraft?.included_uses || ""} onChange={(e) => setPlanDraft((prev: any) => ({ ...(prev || emptyPlanDraft()), included_uses: e.target.value }))} className="bf-input" style={{ height: 40 }} placeholder="0" /></div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, color: "#0f172a" }}><input type="checkbox" checked={!!planDraft?.is_active} onChange={(e) => setPlanDraft((prev: any) => ({ ...(prev || emptyPlanDraft()), is_active: e.target.checked }))} /> Active plan</label>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button type="button" onClick={resetPlanDraft} style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 900 }}>Cancel</button>
                    <button type="button" onClick={() => void submitPlanDraft()} disabled={membershipPlansSaving || !String(planDraft?.name || "").trim()} style={{ border: "1px solid #0f172a", background: "#0f172a", color: "#fff", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 900, opacity: membershipPlansSaving ? 0.7 : 1 }}>{membershipPlansSaving ? "Saving…" : "Save plan"}</button>
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>Service eligibility</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Services still need to opt in before bookings can consume memberships.</div>
              </div>
              {!services.length ? (
                <div style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, color: "#64748b" }}>Add services first, then enable membership redemption per service.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {services.map((s: any) => {
                    const enabled = !!s?.allow_membership;
                    return (
                      <div key={String(s?.id || s?.name)} style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "grid", gap: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 950, color: "#0f172a" }}>{s?.name || "Service"}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{enabled ? "Membership / plan redemption enabled" : "Membership / plan redemption disabled"}</div>
                        </div>
                        <button type="button" disabled={!handlePatchService} onClick={() => handlePatchService?.(Number(s.id), { allow_membership: !enabled })} style={{ border: "1px solid " + (enabled ? "#0f172a" : "#cbd5e1"), background: enabled ? "#0f172a" : "#ffffff", color: enabled ? "#ffffff" : "#0f172a", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 950, cursor: handlePatchService ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>{enabled ? "Disable" : "Enable"}</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {prepaidTab === "packages" ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>Packages (real prepaid products)</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Each prepaid item is an independent product. Memberships can optionally bundle them later.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => startCreate("service_package")} style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 900 }}>+ Service package</button>
                <button type="button" onClick={() => startCreate("credit_bundle")} style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 900 }}>+ Credit bundle</button>
                <button type="button" onClick={() => startCreate("time_pass")} style={{ border: "1px solid #0f172a", background: "#0f172a", color: "#fff", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 900 }}>+ Time pass</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isEditing ? "minmax(0, 1.15fr) minmax(320px, 0.85fr)" : "1fr", gap: 12 }}>
              <div style={{ display: "grid", gap: 10 }}>
                {prepaidLoading ? (
                  <div style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, color: "#64748b", fontWeight: 700 }}>Loading prepaid products…</div>
                ) : null}

                {!prepaidProducts.length && !prepaidLoading ? (
                  <div style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                    No prepaid products yet. Start with a lesson package, credit bundle, or usage pass.
                  </div>
                ) : null}

                {prepaidProducts.map((product) => (
                  <div key={product.id} style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc", display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 14, fontWeight: 950, color: "#0f172a" }}>{product.name}</div>
                          <span style={{ padding: "3px 8px", borderRadius: 999, background: product.isActive ? "#dcfce7" : "#e2e8f0", color: product.isActive ? "#166534" : "#475569", fontSize: 11, fontWeight: 900 }}>
                            {product.isActive ? "Active" : "Archived"}
                          </span>
                          <span style={{ padding: "3px 8px", borderRadius: 999, background: "#eef2ff", color: "#3730a3", fontSize: 11, fontWeight: 900 }}>{formatProductType(product.type)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{product.description || typeHint(product.type)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => editProduct(product)} style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", borderRadius: 999, padding: "7px 12px", fontSize: 12, fontWeight: 900 }}>Edit</button>
                        {product.isActive ? (
                          <button type="button" onClick={() => void archiveProduct(product.id)} disabled={prepaidSaving} style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", borderRadius: 999, padding: "7px 12px", fontSize: 12, fontWeight: 900 }}>Archive</button>
                        ) : (
                          <button type="button" onClick={() => void restoreProduct(product.id)} disabled={prepaidSaving} style={{ border: "1px solid #0f172a", background: "#0f172a", color: "#fff", borderRadius: 999, padding: "7px 12px", fontSize: 12, fontWeight: 900 }}>Restore</button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                      <div><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Price</div><div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", marginTop: 3 }}>{product.price} {product.currency || defaultCurrency}</div></div>
                      <div><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Value</div><div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", marginTop: 3 }}>{productMetricLabel(product)}</div></div>
                      <div><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Validity</div><div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", marginTop: 3 }}>{product.validityDays || 0} days</div></div>
                      <div><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Eligible services</div><div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", marginTop: 3 }}>{product.eligibleServiceIds?.length || 0}</div></div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {product.allowMembershipBundle ? <span style={{ padding: "3px 8px", borderRadius: 999, background: "#ecfeff", color: "#155e75", fontSize: 11, fontWeight: 900 }}>Membership bundle allowed</span> : null}
                      {product.stackable ? <span style={{ padding: "3px 8px", borderRadius: 999, background: "#f5f3ff", color: "#6d28d9", fontSize: 11, fontWeight: 900 }}>Stackable</span> : null}
                      <span style={{ padding: "3px 8px", borderRadius: 999, background: "#f8fafc", color: "#475569", fontSize: 11, fontWeight: 900 }}>Updated {formatDate(product.updatedAt || product.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {isEditing ? (
                <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#ffffff", display: "grid", gap: 10, alignSelf: "start", position: "sticky", top: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 950, color: "#0f172a" }}>{draft.id ? "Edit prepaid product" : "Create prepaid product"}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{typeHint(draft.type)}</div>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Product type</div>
                    <select value={draft.type} onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value as PrepaidProductType }))} className="bf-input" style={{ height: 40 }}>
                      <option value="service_package">Service package</option>
                      <option value="credit_bundle">Credit bundle</option>
                      <option value="time_pass">Time pass</option>
                    </select>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Name</div>
                    <input type="text" value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} className="bf-input" style={{ height: 40 }} placeholder="Example: 5 Lesson Package" />
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Description</div>
                    <textarea value={draft.description || ""} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} className="bf-input" style={{ minHeight: 80, paddingTop: 10 }} placeholder="Short tenant-facing description" />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Price</div>
                      <input type="number" inputMode="decimal" value={String(draft.price ?? 0)} onChange={(e) => setDraft((prev) => ({ ...prev, price: Number(e.target.value || 0) }))} className="bf-input" style={{ height: 40 }} />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Currency</div>
                      <input type="text" value={draft.currency || defaultCurrency} onChange={(e) => setDraft((prev) => ({ ...prev, currency: e.target.value }))} className="bf-input" style={{ height: 40 }} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Validity (days)</div>
                      <input type="number" inputMode="numeric" value={String(draft.validityDays ?? 0)} onChange={(e) => setDraft((prev) => ({ ...prev, validityDays: Number(e.target.value || 0) }))} className="bf-input" style={{ height: 40 }} />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Status</div>
                      <select value={draft.isActive ? "active" : "archived"} onChange={(e) => setDraft((prev) => ({ ...prev, isActive: e.target.value === "active" }))} className="bf-input" style={{ height: 40 }}>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  {draft.type === "service_package" ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Included sessions</div>
                      <input type="number" inputMode="numeric" value={String(draft.sessionCount ?? 0)} onChange={(e) => setDraft((prev) => ({ ...prev, sessionCount: Number(e.target.value || 0) }))} className="bf-input" style={{ height: 40 }} />
                    </div>
                  ) : null}

                  {draft.type === "credit_bundle" ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Credits included</div>
                      <input type="number" inputMode="numeric" value={String(draft.creditAmount ?? 0)} onChange={(e) => setDraft((prev) => ({ ...prev, creditAmount: Number(e.target.value || 0) }))} className="bf-input" style={{ height: 40 }} />
                    </div>
                  ) : null}

                  {draft.type === "time_pass" ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Minutes included</div>
                      <input type="number" inputMode="numeric" value={String(draft.minutesTotal ?? 0)} onChange={(e) => setDraft((prev) => ({ ...prev, minutesTotal: Number(e.target.value || 0) }))} className="bf-input" style={{ height: 40 }} />
                    </div>
                  ) : null}

                  <div style={{ padding: 10, borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>Eligible services</div>
                    {services.length ? services.map((service: any) => {
                      const checked = draft.eligibleServiceIds.includes(Number(service.id));
                      return (
                        <label key={String(service.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 12, color: "#0f172a" }}>
                          <span>{service.name}</span>
                          <input type="checkbox" checked={checked} onChange={(e) => toggleEligibleService(Number(service.id), e.target.checked)} />
                        </label>
                      );
                    }) : <div style={{ fontSize: 12, color: "#64748b" }}>Create services first to target package redemption.</div>}
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 12, color: "#0f172a", fontWeight: 800 }}>
                      <span>Allow membership bundling</span>
                      <input type="checkbox" checked={!!draft.allowMembershipBundle} onChange={(e) => setDraft((prev) => ({ ...prev, allowMembershipBundle: e.target.checked }))} />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 12, color: "#0f172a", fontWeight: 800 }}>
                      <span>Allow stacking with other prepaid</span>
                      <input type="checkbox" checked={!!draft.stackable} onChange={(e) => setDraft((prev) => ({ ...prev, stackable: e.target.checked }))} />
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" onClick={resetDraft} style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 900 }}>Cancel</button>
                    <button type="button" onClick={() => void upsertDraft()} disabled={prepaidSaving || !String(draft.name || "").trim()} style={{ border: "1px solid #0f172a", background: "#0f172a", color: "#fff", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 900, opacity: prepaidSaving || !String(draft.name || "").trim() ? 0.6 : 1 }}>
                      {prepaidSaving ? "Saving…" : draft.id ? "Save changes" : "Create product"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {prepaidTab === "ledger" ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>Ledger</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Real prepaid activity from the accounting backend: summary, transaction lines, and redemptions.
                </div>
              </div>
              <button
                type="button"
                onClick={() => void reloadPrepaidLedger()}
                disabled={prepaidLedgerLoading}
                style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 900, cursor: prepaidLedgerLoading ? "not-allowed" : "pointer" }}
              >
                {prepaidLedgerLoading ? "Refreshing…" : "Refresh ledger"}
              </button>
            </div>

            {prepaidLedgerError ? (
              <div style={{ padding: "9px 12px", borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 12, fontWeight: 800 }}>
                {prepaidLedgerError}
              </div>
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc" }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Active products</div><div style={{ fontSize: 24, fontWeight: 950, color: "#0f172a", marginTop: 4 }}>{Number(prepaidLedgerSummary?.active_products || activeProducts.length || 0)}</div></div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc" }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Active entitlements</div><div style={{ fontSize: 24, fontWeight: 950, color: "#0f172a", marginTop: 4 }}>{Number(prepaidLedgerSummary?.active_entitlements || 0)}</div></div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc" }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Transactions</div><div style={{ fontSize: 24, fontWeight: 950, color: "#0f172a", marginTop: 4 }}>{Number(prepaidLedgerSummary?.transaction_count || prepaidTransactions.length || 0)}</div></div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc" }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Redemptions</div><div style={{ fontSize: 24, fontWeight: 950, color: "#0f172a", marginTop: 4 }}>{Number(prepaidLedgerSummary?.redemption_count || prepaidRedemptions.length || 0)}</div></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)", gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#ffffff", display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>Recent transactions</div>
                {prepaidLedgerLoading && !prepaidTransactions.length ? (
                  <div style={{ fontSize: 12, color: "#64748b" }}>Loading transactions…</div>
                ) : prepaidTransactions.length ? prepaidTransactions.map((item) => (
                  <div key={`txn_${item.id}`} style={{ display: "grid", gridTemplateColumns: "150px 1.1fr 0.7fr 0.7fr", gap: 10, padding: "10px 0", borderTop: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{formatDateTime(item.created_at)}</div>
                    <div style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 800 }}>{item.prepaid_product_name || "Prepaid product"}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{item.customer_name || item.customer_email || "No customer yet"}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{formatTransactionType(item.transaction_type)}</div>
                    <div style={{ fontSize: 12, color: quantityTone(Number(item.quantity_delta || 0)), fontWeight: 900 }}>
                      {Number(item.quantity_delta || 0) > 0 ? "+" : ""}{Number(item.quantity_delta || 0)}
                    </div>
                  </div>
                )) : <div style={{ fontSize: 12, color: "#64748b" }}>No prepaid transactions yet.</div>}
              </div>

              <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#ffffff", display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>Recent redemptions</div>
                {prepaidLedgerLoading && !prepaidRedemptions.length ? (
                  <div style={{ fontSize: 12, color: "#64748b" }}>Loading redemptions…</div>
                ) : prepaidRedemptions.length ? prepaidRedemptions.map((item) => (
                  <div key={`red_${item.id}`} style={{ display: "grid", gap: 4, padding: "10px 0", borderTop: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 800 }}>{item.prepaid_product_name || "Prepaid product"}</div>
                      <div style={{ fontSize: 12, color: "#b45309", fontWeight: 900 }}>-{Number(item.redeemed_quantity || 0)}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{item.customer_name || item.customer_email || "No customer"}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{formatTransactionType(item.redemption_mode)}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{formatDateTime(item.created_at)}</div>
                    </div>
                  </div>
                )) : <div style={{ fontSize: 12, color: "#64748b" }}>No prepaid redemptions yet.</div>}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 0.95fr) minmax(0, 1.05fr)", gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#ffffff", display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>Grant entitlement</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: -4 }}>Give a customer prepaid balance from one of your real prepaid products.</div>

                {(prepaidEntitlementsError || prepaidEntitlementsMessage) ? (
                  <div style={{ padding: "9px 10px", borderRadius: 12, border: `1px solid ${prepaidEntitlementsError ? "#fecaca" : "#bbf7d0"}`, background: prepaidEntitlementsError ? "#fef2f2" : "#f0fdf4", color: prepaidEntitlementsError ? "#b91c1c" : "#166534", fontSize: 12, fontWeight: 800 }}>
                    {prepaidEntitlementsError || prepaidEntitlementsMessage}
                  </div>
                ) : null}

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Customer</div>
                    <select className="bf-input" style={{ height: 40 }} value={grantDraft.customerId} onChange={(e) => setGrantDraft((prev) => ({ ...prev, customerId: e.target.value }))}>
                      <option value="">Select customer</option>
                      {prepaidCustomers.map((customer) => (
                        <option key={customer.id} value={String(customer.id)}>{customerLabel(customer)}</option>
                      ))}
                    </select>
                    {prepaidCustomersLoading ? <div style={{ fontSize: 11, color: "#64748b" }}>Loading customers…</div> : null}
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Prepaid product</div>
                    <select className="bf-input" style={{ height: 40 }} value={grantDraft.prepaidProductId} onChange={(e) => setGrantDraft((prev) => ({ ...prev, prepaidProductId: e.target.value }))}>
                      <option value="">Select product</option>
                      {activeProducts.map((product) => (
                        <option key={product.id} value={String(product.id)}>{product.name} · {formatProductType(product.type)}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Packages to grant</div>
                      <input className="bf-input" style={{ height: 40 }} type="number" min={1} value={grantDraft.quantity} onChange={(e) => setGrantDraft((prev) => ({ ...prev, quantity: Number(e.target.value || 1) }))} />
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        One package grants the product value configured above, such as 5 sessions or 600 minutes.
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Notes</div>
                      <input className="bf-input" style={{ height: 40 }} type="text" value={grantDraft.notes} onChange={(e) => setGrantDraft((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Optional note" />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Starts at</div>
                      <input className="bf-input" style={{ height: 40 }} type="date" value={grantDraft.startsAt} onChange={(e) => setGrantDraft((prev) => ({ ...prev, startsAt: e.target.value }))} />
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Expires at</div>
                      <input className="bf-input" style={{ height: 40 }} type="date" value={grantDraft.expiresAt} onChange={(e) => setGrantDraft((prev) => ({ ...prev, expiresAt: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <button type="button" onClick={() => void submitGrant()} disabled={prepaidEntitlementsSaving || !grantDraft.customerId || !grantDraft.prepaidProductId} style={{ border: "1px solid #0f172a", background: "#0f172a", color: "#fff", borderRadius: 999, padding: "9px 12px", fontSize: 12, fontWeight: 900, opacity: prepaidEntitlementsSaving || !grantDraft.customerId || !grantDraft.prepaidProductId ? 0.65 : 1 }}>
                  {prepaidEntitlementsSaving ? "Granting…" : "Grant entitlement"}
                </button>
              </div>

              <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#ffffff", display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>Entitlements</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: -4 }}>Live entitlement balances by customer. Quick adjustments write to the accounting ledger.</div>

                {prepaidEntitlementsLoading && !prepaidEntitlements.length ? (
                  <div style={{ fontSize: 12, color: "#64748b" }}>Loading entitlements…</div>
                ) : prepaidEntitlements.length ? prepaidEntitlements.map((item) => (
                  <div key={`ent_${item.id}`} style={{ padding: 12, borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ display: "grid", gap: 2 }}>
                        <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 900 }}>{item.prepaidProductName || "Prepaid product"}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{item.customerName || item.customerEmail || `Customer #${item.customerId}`}</div>
                      </div>
                      <span style={{ padding: "3px 8px", borderRadius: 999, background: item.status === "active" ? "#dcfce7" : "#e2e8f0", color: item.status === "active" ? "#166534" : "#475569", fontSize: 11, fontWeight: 900 }}>
                        {String(item.status || "active").replace(/_/g, " ")}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                      <div style={{ padding: 10, borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Original</div><div style={{ fontSize: 18, color: "#0f172a", fontWeight: 950, marginTop: 4 }}>{Number(item.originalQuantity || 0)}</div></div>
                      <div style={{ padding: 10, borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Remaining</div><div style={{ fontSize: 18, color: "#0f172a", fontWeight: 950, marginTop: 4 }}>{Number(item.remainingQuantity || 0)}</div></div>
                      <div style={{ padding: 10, borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Starts</div><div style={{ fontSize: 12, color: "#0f172a", fontWeight: 800, marginTop: 6 }}>{formatDate(item.startsAt)}</div></div>
                      <div style={{ padding: 10, borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>Expires</div><div style={{ fontSize: 12, color: "#0f172a", fontWeight: 800, marginTop: 6 }}>{formatDate(item.expiresAt)}</div></div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <input className="bf-input" style={{ width: 120, height: 38 }} type="number" step="1" placeholder="+/- qty" value={adjustDrafts[String(item.id)] || ""} onChange={(e) => setAdjustDrafts((prev) => ({ ...prev, [String(item.id)]: e.target.value }))} />
                      <button type="button" onClick={() => void submitAdjust(Number(item.id || 0))} disabled={prepaidEntitlementsSaving || !String(adjustDrafts[String(item.id)] || "").trim()} style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 900 }}>
                        Apply adjustment
                      </button>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Use positive numbers to add balance and negative numbers to reduce balance.</div>
                    </div>
                  </div>
                )) : <div style={{ fontSize: 12, color: "#64748b" }}>No prepaid entitlements yet. Grant one from the panel on the left.</div>}
              </div>
            </div>
          </div>
        ) : null}

{prepaidTab === "rules" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Prepaid: checkout policy</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  What happens when a customer tries to book with insufficient prepaid balance.
                </div>
              </div>

              <button
                type="button"
                onClick={() => void saveMembershipCheckoutPolicy()}
                disabled={membershipCheckoutSaving || membershipCheckoutLoading}
                style={{ border: "none", borderRadius: 999, padding: "8px 12px", fontWeight: 900, fontSize: 12, background: membershipCheckoutSaving ? "#94a3b8" : "#0f172a", color: "#fff", cursor: membershipCheckoutSaving ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
              >
                {membershipCheckoutSaving ? "Saving…" : "Save policy"}
              </button>
            </div>

            {membershipCheckoutLoading ? (
              <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>Loading policy…</div>
            ) : (
              <>
                {membershipCheckoutError && (
                  <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 12, fontWeight: 800 }}>
                    {membershipCheckoutError}
                  </div>
                )}

                {membershipCheckoutMessage && (
                  <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 12, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", fontSize: 12, fontWeight: 800 }}>
                    {membershipCheckoutMessage}
                  </div>
                )}

                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Default behavior</div>
                      <select
                        value={membershipCheckoutPolicy.mode}
                        onChange={(e) =>
                          setMembershipCheckoutPolicy((p: any) => ({
                            ...p,
                            mode: e.target.value,
                            strict: {
                              enabled: e.target.value === "strict" ? true : !!p?.strict?.enabled,
                            },
                          }))
                        }
                        className="bf-input"
                        style={{ height: 40 }}
                      >
                        <option value="smart_top_up">Smart Top-Up (recommended)</option>
                        <option value="renew_upgrade">Renew / Upgrade only</option>
                        <option value="strict">Strict (block booking)</option>
                        <option value="off">Off (no assistance)</option>
                      </select>
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Currency (for top-up)</div>
                      <input
                        type="text"
                        value={membershipCheckoutPolicy?.topUp?.currency || ""}
                        onChange={(e) =>
                          setMembershipCheckoutPolicy((p: any) => ({
                            ...p,
                            topUp: { ...(p?.topUp || {}), currency: e.target.value || null },
                          }))
                        }
                        placeholder={String(ctx?.membershipCheckoutCurrency || "e.g. JOD")}
                        className="bf-input"
                        style={{ height: 40 }}
                      />
                    </div>
                  </div>

                  <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Smart Top-Up controls</div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Enable top-up</span>
                        <input type="checkbox" checked={!!membershipCheckoutPolicy?.topUp?.enabled} onChange={(e) => setMembershipCheckoutPolicy((p: any) => ({ ...p, topUp: { ...(p?.topUp || {}), enabled: e.target.checked } }))} />
                      </label>

                      <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Allow self-serve</span>
                        <input type="checkbox" checked={!!membershipCheckoutPolicy?.topUp?.allowSelfServe} onChange={(e) => setMembershipCheckoutPolicy((p: any) => ({ ...p, topUp: { ...(p?.topUp || {}), allowSelfServe: e.target.checked } }))} />
                      </label>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Price / minute</div>
                          <input type="number" inputMode="decimal" value={String(membershipCheckoutPolicy?.topUp?.pricePerMinute ?? 0)} onChange={(e) => setMembershipCheckoutPolicy((p: any) => ({ ...p, topUp: { ...(p?.topUp || {}), pricePerMinute: Number(e.target.value || 0) } }))} className="bf-input" style={{ height: 40 }} />
                        </div>

                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Round to (min)</div>
                          <input type="number" inputMode="numeric" value={String(membershipCheckoutPolicy?.topUp?.roundToMinutes ?? 30)} onChange={(e) => setMembershipCheckoutPolicy((p: any) => ({ ...p, topUp: { ...(p?.topUp || {}), roundToMinutes: Number(e.target.value || 0) } }))} className="bf-input" style={{ height: 40 }} />
                        </div>

                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Min purchase (min)</div>
                          <input type="number" inputMode="numeric" value={String(membershipCheckoutPolicy?.topUp?.minPurchaseMinutes ?? 30)} onChange={(e) => setMembershipCheckoutPolicy((p: any) => ({ ...p, topUp: { ...(p?.topUp || {}), minPurchaseMinutes: Number(e.target.value || 0) } }))} className="bf-input" style={{ height: 40 }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Renew / Upgrade controls</div>
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Enable renew/upgrade path</span>
                      <input type="checkbox" checked={!!membershipCheckoutPolicy?.renewUpgrade?.enabled} onChange={(e) => setMembershipCheckoutPolicy((p: any) => ({ ...p, renewUpgrade: { enabled: e.target.checked } }))} />
                    </label>
                  </div>

                  <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Strict controls</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>If enabled, customers must have enough membership balance to confirm a booking.</div>
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Require sufficient balance</span>
                      <input type="checkbox" checked={!!membershipCheckoutPolicy?.strict?.enabled} onChange={(e) => setMembershipCheckoutPolicy((p: any) => ({ ...p, strict: { enabled: e.target.checked } }))} />
                    </label>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>Tip: set <b>Default behavior</b> = <b>Strict</b> to enforce this policy.</div>
                  </div>

                  {membershipCheckoutPolicy?.mode === "off" && (
                    <div style={{ padding: 12, borderRadius: 14, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", fontSize: 12, lineHeight: 1.35 }}>
                      Default behavior is set to <b>Off</b>. Membership balance will not affect booking checkout.
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    This policy affects the <b>public booking flow</b> when a customer tries to book with insufficient prepaid balance.
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Membership eligibility (per service)</h3>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                      Choose which services are allowed to consume membership credits. This prevents accidental credit debits on non-membership products.
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                      {services.length ? (
                        services.map((s: any) => {
                          const enabled = !!s?.allow_membership;
                          const canToggle = !!handlePatchService && typeof s?.id === "number";
                          return (
                            <div key={String(s.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#ffffff" }}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>{s?.name || `Service ${s.id}`}</div>
                                <div style={{ fontSize: 12, color: "#64748b" }}>{enabled ? "Eligible" : "Not eligible"}</div>
                              </div>

                              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                                <span style={{ color: enabled ? "#16a34a" : "#64748b", fontWeight: 900 }}>{enabled ? "ON" : "OFF"}</span>
                                <input type="checkbox" checked={enabled} disabled={!canToggle} onChange={(e) => handlePatchService?.(s.id, { allow_membership: e.target.checked })} />
                              </label>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ fontSize: 12, color: "#64748b" }}>No services yet. Create a service first, then enable membership eligibility here.</div>
                      )}
                    </div>

                    {!handlePatchService && (
                      <div style={{ marginTop: 10, fontSize: 12, color: "#b45309" }}>
                        Note: service eligibility toggles are read-only right now because <b>handlePatchService</b> isn’t available in this build.
                      </div>
                    )}

                    <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>Tip: only eligible services will show “Use membership credits” in the public booking flow.</div>
                  </div>
                </div>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
