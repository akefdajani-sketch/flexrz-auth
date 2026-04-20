"use client";

import React from "react";
import { formatMoney } from "@/lib/tax/taxFormatting";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ServiceWindow { day_of_week: number; open_time: string; close_time: string; }
interface ServiceHoursPayload { windows?: ServiceWindow[]; disabled_days?: number[]; }

export default function ServicesSection({ ctx }: { ctx: any }) {
  const {
    tenant,
    tenantSlug,
    apiBase,
    isPending,
    services,
    showServiceForm,
    setShowServiceForm,
    resetServiceForm,
    atServicesLimit,
    svcLimit,
    setPlanUiMessage,
    handleCreateService,
    svcName, setSvcName,
    svcDuration, setSvcDuration,
    svcInterval, setSvcInterval,
    svcMinSlots, setSvcMinSlots,
    svcMaxSlots, setSvcMaxSlots,
    svcParallel, setSvcParallel,
    svcPrice, setSvcPrice,
    svcReqStaff, setSvcReqStaff,
    svcReqRes, setSvcReqRes,
    svcRequiresConfirmation, setSvcRequiresConfirmation,
    svcEditOpenId, setSvcEditOpenId,
    handleDeleteService,
    handlePatchService,
    handleUpdateServiceAvailabilityBasis,
    resolveAssetUrl,
    openImagePreview,
    handleEntityImageChange,
    handleEntityImageDelete,
  } = ctx;

  // Is this tenant running in nightly/rental mode?
  const isNightlyTenant = !!(tenant?.rental_mode_enabled);

  const pending = (key: string) => (typeof isPending === "function" ? Boolean(isPending(key)) : false);
  const creating = pending("service:create");

  // Full edit draft — includes both timeslot and nightly fields
  const [editDraft, setEditDraft] = React.useState<null | {
    id: number;
    name: string;
    // Timeslot fields
    duration_minutes: string;
    slot_interval_minutes: string;
    min_consecutive_slots: string;
    max_consecutive_slots: string;
    max_parallel_bookings: string;
    price_amount: string;
    // Nightly fields
    min_nights: string;
    max_nights: string;
    checkin_time: string;
    checkout_time: string;
    // Shared
    requires_staff: boolean;
    requires_resource: boolean;
    requires_confirmation: boolean;
    // PR-TAX-1
    vat_rate: string;
  }>(null);

  const [editTab, setEditTab] = React.useState<Record<number, "scheduling" | "hours">>({});
  const [hoursData, setHoursData] = React.useState<Record<number, ServiceWindow[]>>({});
  const [hoursDisabledDays, setHoursDisabledDays] = React.useState<Record<number, number[]>>({});
  const [hoursLoading, setHoursLoading] = React.useState<Record<number, boolean>>({});
  const [hoursSaving, setHoursSaving] = React.useState<Record<number, boolean>>({});
  const [hoursMsg, setHoursMsg] = React.useState<Record<number, string>>({});

  const loadHours = async (serviceId: number) => {
    if (!apiBase || !tenantSlug) return;
    setHoursLoading((p) => ({ ...p, [serviceId]: true }));
    try {
      const res = await fetch(`${apiBase}/tenant/${tenantSlug}/services/${serviceId}/hours`, { credentials: "include" });
      if (res.ok) {
        const data: ServiceHoursPayload = await res.json();
        setHoursData((p) => ({ ...p, [serviceId]: data.windows ?? [] }));
        setHoursDisabledDays((p) => ({ ...p, [serviceId]: Array.isArray(data.disabled_days) ? data.disabled_days : [] }));
      }
    } finally {
      setHoursLoading((p) => ({ ...p, [serviceId]: false }));
    }
  };

  const saveHours = async (serviceId: number) => {
    if (!apiBase || !tenantSlug) return;
    setHoursSaving((p) => ({ ...p, [serviceId]: true }));
    setHoursMsg((p) => ({ ...p, [serviceId]: "" }));
    try {
      const res = await fetch(`${apiBase}/tenant/${tenantSlug}/services/${serviceId}/hours`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windows: hoursData[serviceId] ?? [], disabled_days: hoursDisabledDays[serviceId] ?? [] }),
      });
      setHoursMsg((p) => ({ ...p, [serviceId]: res.ok ? "Saved ✓" : "Save failed" }));
    } finally {
      setHoursSaving((p) => ({ ...p, [serviceId]: false }));
    }
  };

  const openEdit = (s: any) => {
    setSvcEditOpenId?.(s.id);
    setEditDraft({
      id: s.id,
      name: String(s.name ?? ""),
      // Timeslot
      duration_minutes:      s.duration_minutes      != null ? String(s.duration_minutes)      : "1440",
      slot_interval_minutes: s.slot_interval_minutes != null ? String(s.slot_interval_minutes) : "1440",
      min_consecutive_slots: s.min_consecutive_slots != null ? String(s.min_consecutive_slots) : "",
      max_consecutive_slots: s.max_consecutive_slots != null ? String(s.max_consecutive_slots) : "1",
      max_parallel_bookings: s.max_parallel_bookings != null ? String(s.max_parallel_bookings) : "1",
      price_amount: s.price_amount != null ? String(s.price_amount) : s.price != null ? String(s.price) : "",
      // Nightly
      min_nights:    s.min_nights    != null ? String(s.min_nights)    : "1",
      max_nights:    s.max_nights    != null ? String(s.max_nights)    : "",
      checkin_time:  s.checkin_time  ? String(s.checkin_time).slice(0, 5)  : "15:00",
      checkout_time: s.checkout_time ? String(s.checkout_time).slice(0, 5) : "11:00",
      // Shared
      requires_staff:         !!s.requires_staff,
      requires_resource:      !!s.requires_resource,
      requires_confirmation:  !!s.requires_confirmation,
      vat_rate:               s.vat_rate != null ? String(s.vat_rate) : "",
    });
    if (!hoursData[s.id]) loadHours(s.id);
  };

  const closeEdit = () => { setSvcEditOpenId?.(null); setEditDraft(null); };

  const sortedServices = [...(services || [])].sort((a: any, b: any) =>
    String(a.name ?? "").localeCompare(String(b.name ?? ""))
  );

  // ── Input style helpers ───────────────────────────────────────────────────
  const inp = "bf-input bf-input-compact";
  const lbl = "bf-field-label";

  // ── Nightly badge ─────────────────────────────────────────────────────────
  const NightlyBadge = () => (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
      background: "#ede9fe", color: "#7c3aed", letterSpacing: "0.04em" }}>
      Nightly
    </span>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Services</h3>
        <button type="button" onClick={() => setShowServiceForm((v: boolean) => { const next = !v; if (!next) resetServiceForm(); return next; })}
          disabled={creating}
          style={{ border: "1px solid rgba(0,0,0,0.12)", background: "#fff", borderRadius: 999, padding: "6px 10px", fontWeight: 800, fontSize: 12, cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.75 : 1 }}>
          {showServiceForm ? "Hide" : "Add service"}
        </button>
      </div>

      {/* ── Add form ─────────────────────────────────────────────────────── */}
      {showServiceForm && (
        <form onSubmit={(e) => {
          if (atServicesLimit) { e.preventDefault(); setPlanUiMessage(`Your current plan allows up to ${svcLimit} services. Upgrade to add more.`); return; }
          setPlanUiMessage(null);
          handleCreateService(e);
        }}
          style={{ display: "grid", gap: 8, marginBottom: 12, padding: 12, borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc" }}>

          <div className="bf-form-stack">
            <div className="bf-field-row">
              <div className="bf-field-label">Service name</div>
              <input type="text" value={svcName} onChange={(e) => setSvcName(e.target.value)}
                placeholder={isNightlyTenant ? "e.g. Nightly rental" : "e.g. 60 min session"} className="bf-input" />
            </div>

            {/* Nightly tenant: only min/max nights + check-in/out times */}
            {isNightlyTenant ? (
              <div className="bf-grid-2">
                <div className="bf-field-row">
                  <div className="bf-field-label">Min nights</div>
                  <input type="number" min={1} step={1} value={svcMinSlots ?? "1"}
                    onChange={(e) => setSvcMinSlots(e.target.value)} placeholder="1" className={inp} />
                </div>
                <div className="bf-field-row">
                  <div className="bf-field-label">Max nights <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span></div>
                  <input type="number" min={1} step={1} value={svcMaxSlots ?? ""}
                    onChange={(e) => setSvcMaxSlots(e.target.value)} placeholder="—" className={inp} />
                </div>
                <div className="bf-field-row">
                  <div className="bf-field-label">Check-in time</div>
                  <input type="time" value={"15:00"} readOnly className={inp} style={{ color: "#94a3b8" }} />
                </div>
                <div className="bf-field-row">
                  <div className="bf-field-label">Check-out time</div>
                  <input type="time" value={"11:00"} readOnly className={inp} style={{ color: "#94a3b8" }} />
                </div>
              </div>
            ) : (
              /* Timeslot tenant: full scheduling grid */
              <div className="bf-grid-2">
                <div className="bf-field-row"><div className={lbl}>Duration (min)</div><input type="number" min={10} step={5} value={svcDuration} onChange={(e) => setSvcDuration(e.target.value)} placeholder="60" className={inp} /></div>
                <div className="bf-field-row"><div className={lbl}>Slot interval (min)</div><input type="number" min={5} step={5} value={svcInterval} onChange={(e) => setSvcInterval(e.target.value)} placeholder="60" className={inp} /></div>
                <div className="bf-field-row"><div className={lbl}>Min slots</div><input type="number" min={1} step={1} value={svcMinSlots ?? ""} onChange={(e) => setSvcMinSlots(e.target.value)} placeholder="1" className={inp} /></div>
                <div className="bf-field-row"><div className={lbl}>Max slots</div><input type="number" min={1} step={1} value={svcMaxSlots} onChange={(e) => setSvcMaxSlots(e.target.value)} placeholder="4" className={inp} /></div>
                <div className="bf-field-row"><div className={lbl}>Max bookings/slot</div><input type="number" min={1} step={1} value={svcParallel} onChange={(e) => setSvcParallel(e.target.value)} placeholder="1" className={inp} /></div>
                <div className="bf-field-row"><div className={lbl}>Price (JD)</div><input type="number" min={0} step={0.5} value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} placeholder="0" className={inp} /></div>
                {/* PR-TAX-1: per-service VAT override */}
                <div className="bf-field-row"><div className={lbl}>VAT override (%)</div><input type="number" min={0} max={100} step={0.1} value={ctx.svcVatRate ?? ""} onChange={(e) => ctx.setSvcVatRate?.(e.target.value)} placeholder="Business default" className={inp} /></div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#475569", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" checked={svcReqStaff} onChange={(e) => setSvcReqStaff(e.target.checked)} />needs staff</label>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" checked={svcReqRes} onChange={(e) => setSvcReqRes(e.target.checked)} />needs resource</label>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" checked={svcRequiresConfirmation} onChange={(e) => setSvcRequiresConfirmation(e.target.checked)} />require confirmation</label>
          </div>

          {isNightlyTenant && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 11, color: "#166534" }}>
              💡 Nightly pricing is set in the <strong>Rates</strong> tab — create a rule for this service after saving.
            </div>
          )}

          <button type="submit" disabled={atServicesLimit || creating}
            style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 999, border: "none",
              background: atServicesLimit || creating ? "#94a3b8" : "#0f172a", color: "#fff",
              fontSize: 12, fontWeight: 500, cursor: atServicesLimit || creating ? "not-allowed" : "pointer" }}>
            {creating ? "Adding..." : "Add service"}
          </button>
        </form>
      )}

      {/* ── Service list ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {sortedServices.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af" }}>No services yet.</div>}

        {sortedServices.map((s: any) => {
          const patching = pending(`service:patch:${s.id}`) || pending(`service:update:${s.id}`);
          const deleting = pending(`service:delete:${s.id}`);
          const busy     = patching || deleting;
          const isOpen   = svcEditOpenId === s.id;
          const currentTab = editTab[s.id] ?? "scheduling";
          const imgUrl   = s.image_url ? resolveAssetUrl(s.image_url) : null;
          const isNightly = String(s.booking_mode || "").toLowerCase() === "nightly" || isNightlyTenant;

          return (
            <div key={s.id} style={{ padding: "10px", borderRadius: 12, background: "#ffffff", border: "1px solid #e5e7eb", marginBottom: 8, fontSize: 12 }}>

              {/* Collapsed row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div onClick={() => imgUrl && openImagePreview(imgUrl, s.name)}
                  style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 10, overflow: "hidden", border: "1px solid #e5e7eb", cursor: imgUrl ? "pointer" : "default", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {imgUrl ? <img src={imgUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                           : <span style={{ fontSize: 18, opacity: 0.3 }}>✦</span>}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                    {isNightly && <NightlyBadge />}
                  </div>
                  <div style={{ color: "#64748b", marginTop: 2, fontSize: 12 }}>
                    {isNightly
                      ? `Min ${s.min_nights ?? 1} night${(s.min_nights ?? 1) !== 1 ? "s" : ""}${s.max_nights ? ` · max ${s.max_nights}` : ""} · Check-in ${(s.checkin_time || "15:00").slice(0,5)}`
                      : `${s.duration_minutes ? `${s.duration_minutes} min` : "—"}${s.price_jd != null ? ` · ${formatMoney(s.price_jd, "JD")}` : ""}`
                    }
                    {/* PR-TAX-1: show VAT badge when override is set */}
                    {!isNightly && s.vat_rate != null && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", marginLeft: 4 }}>
                        VAT {s.vat_rate}%
                      </span>
                    )}
                  </div>
                </div>

                <button type="button" onClick={() => { if (busy) return; isOpen ? closeEdit() : openEdit(s); }} disabled={busy}
                  style={{ flexShrink: 0, border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 700,
                    background: isOpen ? "#0f172a" : "#fff", color: isOpen ? "#fff" : "#0f172a",
                    cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 }}>
                  {isOpen ? "Close" : "Edit"}
                </button>
              </div>

              {/* Expanded edit panel */}
              {isOpen && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc" }}>

                  {/* Tab pills — hide Available Hours for nightly */}
                  {!isNightly && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {(["scheduling", "hours"] as const).map((tab) => (
                        <button key={tab} type="button" onClick={() => setEditTab((p) => ({ ...p, [s.id]: tab }))}
                          style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                            border: currentTab === tab ? "none" : "1px solid #e2e8f0",
                            background: currentTab === tab ? "#0f172a" : "#fff",
                            color: currentTab === tab ? "#fff" : "#64748b", cursor: "pointer" }}>
                          {tab === "scheduling" ? "Scheduling" : "Available Hours"}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ── Nightly scheduling ──────────────────────────────── */}
                  {isNightly && editDraft && editDraft.id === s.id && (
                    <>
                      {/* Rates info banner */}
                      <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8,
                        background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 12, color: "#166534" }}>
                        💡 <strong>Pricing is managed in the Rates tab.</strong> Create a rate rule for this service to set the nightly price. Day-of-week and seasonal pricing are supported.
                      </div>

                      <div className="bf-form-stack">
                        <div className="bf-field-row">
                          <div className="bf-field-label">Service name</div>
                          <input type="text" value={editDraft.name}
                            onChange={(e) => setEditDraft((d) => d ? { ...d, name: e.target.value } : d)}
                            className="bf-input" />
                        </div>

                        <div className="bf-grid-2">
                          <div className="bf-field-row">
                            <div className="bf-field-label">Min nights</div>
                            <input type="number" min={1} step={1} value={editDraft.min_nights}
                              onChange={(e) => setEditDraft((d) => d ? { ...d, min_nights: e.target.value } : d)}
                              className={inp} />
                          </div>
                          <div className="bf-field-row">
                            <div className="bf-field-label">Max nights <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span></div>
                            <input type="number" min={1} step={1} value={editDraft.max_nights}
                              onChange={(e) => setEditDraft((d) => d ? { ...d, max_nights: e.target.value } : d)}
                              placeholder="—" className={inp} />
                          </div>
                          <div className="bf-field-row">
                            <div className="bf-field-label">Check-in time</div>
                            <input type="time" value={editDraft.checkin_time}
                              onChange={(e) => setEditDraft((d) => d ? { ...d, checkin_time: e.target.value } : d)}
                              className={inp} />
                          </div>
                          <div className="bf-field-row">
                            <div className="bf-field-label">Check-out time</div>
                            <input type="time" value={editDraft.checkout_time}
                              onChange={(e) => setEditDraft((d) => d ? { ...d, checkout_time: e.target.value } : d)}
                              className={inp} />
                          </div>
                        </div>
                      </div>

                      {/* Checkboxes */}
                      <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#475569", marginTop: 8, flexWrap: "wrap" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input type="checkbox" checked={!!editDraft.requires_staff}
                            onChange={(e) => setEditDraft((d) => d ? { ...d, requires_staff: e.target.checked } : d)} />
                          needs staff
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input type="checkbox" checked={!!editDraft.requires_resource}
                            onChange={(e) => setEditDraft((d) => d ? { ...d, requires_resource: e.target.checked } : d)} />
                          needs resource
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input type="checkbox" checked={!!editDraft.requires_confirmation}
                            onChange={(e) => setEditDraft((d) => d ? { ...d, requires_confirmation: e.target.checked } : d)} />
                          require confirmation
                        </label>
                      </div>

                      {/* Image */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                        <div onClick={() => imgUrl && openImagePreview(imgUrl, s.name)}
                          style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb", flexShrink: 0, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", cursor: imgUrl ? "pointer" : "default" }}>
                          {imgUrl ? <img src={imgUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  : <span style={{ fontSize: 16, opacity: 0.3 }}>✦</span>}
                        </div>
                        <label style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, border: "1px solid #0f172a", background: "#fff", color: "#0f172a", cursor: "pointer", whiteSpace: "nowrap" }}>
                          Upload image
                          <input type="file" accept="image/*" onChange={(e) => handleEntityImageChange("service", s.id, e)} style={{ display: "none" }} />
                        </label>
                        {s.image_url && (
                          <button type="button" onClick={() => handleEntityImageDelete("service", s.id)}
                            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", cursor: "pointer", whiteSpace: "nowrap" }}>
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Save / Reset / Delete */}
                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        <button type="button" disabled={patching}
                          onClick={() => {
                            if (patching || !editDraft || editDraft.id !== s.id) return;
                            const name = editDraft.name.trim();
                            if (!name) return alert("Service name is required.");
                            const minNights = editDraft.min_nights ? Number(editDraft.min_nights) : 1;
                            const maxNights = editDraft.max_nights ? Number(editDraft.max_nights) : null;
                            // For nightly: duration = min_nights * 1440, slot_interval = 1440
                            handlePatchService(s.id, {
                              name,
                              booking_mode:        "nightly",
                              min_nights:          minNights,
                              max_nights:          maxNights,
                              checkin_time:        editDraft.checkin_time || "15:00",
                              checkout_time:       editDraft.checkout_time || "11:00",
                              duration_minutes:    minNights * 1440,
                              slot_interval_minutes: 1440,
                              max_consecutive_slots: maxNights ?? 365,
                              max_parallel_bookings: 1,
                              price_amount:        null,  // pricing via rates tab
                              requires_staff:      editDraft.requires_staff,
                              requires_resource:   editDraft.requires_resource,
                              requires_confirmation: editDraft.requires_confirmation,
                              availability_basis:  "resource",
                            });
                            closeEdit();
                          }}
                          style={{ padding: "6px 14px", borderRadius: 999, border: "none",
                            background: patching ? "#94a3b8" : "#0f172a", color: "#fff",
                            fontSize: 12, fontWeight: 700, cursor: patching ? "not-allowed" : "pointer" }}>
                          {patching ? "Saving..." : "Save"}
                        </button>
                        <button type="button" onClick={() => openEdit(s)}
                          style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Reset
                        </button>
                        <button type="button" onClick={() => handleDeleteService(s.id)} disabled={deleting || patching}
                          style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 999, border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", fontSize: 12, fontWeight: 600, cursor: deleting || patching ? "not-allowed" : "pointer", opacity: deleting || patching ? 0.6 : 1 }}>
                          {deleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── Timeslot scheduling ─────────────────────────────── */}
                  {!isNightly && currentTab === "scheduling" && editDraft && editDraft.id === s.id && (
                    <>
                      <div className="bf-form-stack">
                        <div className="bf-field-row">
                          <div className="bf-field-label">Service name</div>
                          <input type="text" value={editDraft.name}
                            onChange={(e) => setEditDraft((d) => d ? { ...d, name: e.target.value } : d)}
                            className="bf-input" />
                        </div>
                        <div className="bf-grid-2">
                          <div className="bf-field-row"><div className={lbl}>Duration (min)</div><input type="number" min={10} step={5} value={editDraft.duration_minutes} onChange={(e) => setEditDraft((d) => d ? { ...d, duration_minutes: e.target.value } : d)} className={inp} /></div>
                          <div className="bf-field-row"><div className={lbl}>Slot interval (min)</div><input type="number" min={5} step={5} value={editDraft.slot_interval_minutes} onChange={(e) => setEditDraft((d) => d ? { ...d, slot_interval_minutes: e.target.value } : d)} className={inp} /></div>
                          <div className="bf-field-row"><div className={lbl}>Min slots</div><input type="number" min={1} step={1} value={editDraft.min_consecutive_slots} onChange={(e) => setEditDraft((d) => d ? { ...d, min_consecutive_slots: e.target.value } : d)} className={inp} /></div>
                          <div className="bf-field-row"><div className={lbl}>Max slots</div><input type="number" min={1} step={1} value={editDraft.max_consecutive_slots} onChange={(e) => setEditDraft((d) => d ? { ...d, max_consecutive_slots: e.target.value } : d)} className={inp} /></div>
                          <div className="bf-field-row"><div className={lbl}>Max bookings/slot</div><input type="number" min={1} step={1} value={editDraft.max_parallel_bookings} onChange={(e) => setEditDraft((d) => d ? { ...d, max_parallel_bookings: e.target.value } : d)} className={inp} /></div>
                          <div className="bf-field-row"><div className={lbl}>Price (JD)</div><input type="number" min={0} step={0.5} value={editDraft.price_amount} onChange={(e) => setEditDraft((d) => d ? { ...d, price_amount: e.target.value } : d)} className={inp} /></div>
                          {/* PR-TAX-1: per-service VAT override */}
                          <div className="bf-field-row"><div className={lbl}>VAT override (%)</div><input type="number" min={0} max={100} step={0.1} value={editDraft.vat_rate} onChange={(e) => setEditDraft((d) => d ? { ...d, vat_rate: e.target.value } : d)} placeholder="Business default" className={inp} /></div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#475569", marginTop: 8, flexWrap: "wrap" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" checked={!!editDraft.requires_staff} onChange={(e) => setEditDraft((d) => d ? { ...d, requires_staff: e.target.checked } : d)} />needs staff</label>
                        <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" checked={!!editDraft.requires_resource} onChange={(e) => setEditDraft((d) => d ? { ...d, requires_resource: e.target.checked } : d)} />needs resource</label>
                        <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" checked={!!editDraft.requires_confirmation} onChange={(e) => setEditDraft((d) => d ? { ...d, requires_confirmation: e.target.checked } : d)} />require confirmation</label>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                        <div style={{ fontSize: 11, color: "#475569", minWidth: 120 }}>Availability basis</div>
                        <select value={(s.availability_basis || "auto") as any}
                          onChange={(e) => handleUpdateServiceAvailabilityBasis(s.id, (e.target.value as any) || null)}
                          disabled={patching}
                          style={{ flex: 1, borderRadius: 10, border: "1px solid #cbd5e1", padding: "6px 10px", fontSize: 12, background: "#ffffff", opacity: patching ? 0.7 : 1 }}>
                          <option value="auto">Auto (derive from flags)</option>
                          <option value="resource">Resource only</option>
                          <option value="staff">Staff only</option>
                          <option value="both">Both (staff + resource)</option>
                          <option value="none">None (ignore overlaps)</option>
                        </select>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                        <div onClick={() => imgUrl && openImagePreview(imgUrl, s.name)}
                          style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb", flexShrink: 0, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", cursor: imgUrl ? "pointer" : "default" }}>
                          {imgUrl ? <img src={imgUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  : <span style={{ fontSize: 16, opacity: 0.3 }}>✦</span>}
                        </div>
                        <label style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, border: "1px solid #0f172a", background: "#fff", color: "#0f172a", cursor: "pointer", whiteSpace: "nowrap" }}>
                          Upload image
                          <input type="file" accept="image/*" onChange={(e) => handleEntityImageChange("service", s.id, e)} style={{ display: "none" }} />
                        </label>
                        {s.image_url && (
                          <button type="button" onClick={() => handleEntityImageDelete("service", s.id)}
                            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", cursor: "pointer", whiteSpace: "nowrap" }}>
                            Remove
                          </button>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        <button type="button" disabled={patching}
                          onClick={() => {
                            if (patching || !editDraft || editDraft.id !== s.id) return;
                            const name = editDraft.name.trim();
                            if (!name) return alert("Service name is required.");
                            const duration = Number(editDraft.duration_minutes);
                            const interval = Number(editDraft.slot_interval_minutes);
                            const minSlots = editDraft.min_consecutive_slots === "" ? null : Number(editDraft.min_consecutive_slots);
                            const maxSlots = Number(editDraft.max_consecutive_slots);
                            const parallel = Number(editDraft.max_parallel_bookings);
                            const price    = editDraft.price_amount === "" ? null : Number(editDraft.price_amount);
                            if (!duration || duration < 10) return alert("Duration must be at least 10 minutes.");
                            if (!interval || interval < 5) return alert("Slot interval must be at least 5 minutes.");
                            if (!maxSlots || maxSlots < 1) return alert("Max slots must be at least 1.");
                            if (!parallel || parallel < 1) return alert("Parallel must be at least 1.");
                            // PR-TAX-1: include vat_rate override (null = use business default)
                            const vatRate = editDraft.vat_rate === "" ? null : Number(editDraft.vat_rate);
                            handlePatchService(s.id, { name, duration_minutes: duration, slot_interval_minutes: interval, min_consecutive_slots: minSlots, max_consecutive_slots: maxSlots, max_parallel_bookings: parallel, price_amount: price, requires_staff: editDraft.requires_staff, requires_resource: editDraft.requires_resource, requires_confirmation: editDraft.requires_confirmation, vat_rate: vatRate });
                            closeEdit();
                          }}
                          style={{ padding: "6px 14px", borderRadius: 999, border: "none", background: patching ? "#94a3b8" : "#0f172a", color: "#fff", fontSize: 12, fontWeight: 700, cursor: patching ? "not-allowed" : "pointer" }}>
                          {patching ? "Saving..." : "Save"}
                        </button>
                        <button type="button" onClick={() => openEdit(s)}
                          style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Reset
                        </button>
                        <button type="button" onClick={() => handleDeleteService(s.id)} disabled={deleting || patching}
                          style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 999, border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", fontSize: 12, fontWeight: 600, cursor: deleting || patching ? "not-allowed" : "pointer", opacity: deleting || patching ? 0.6 : 1 }}>
                          {deleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── Available Hours tab (timeslot only) ─────────────── */}
                  {!isNightly && currentTab === "hours" && (
                    <div>
                      {hoursLoading[s.id] ? (
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>Loading hours…</div>
                      ) : (
                        <>
                          {DAY_LABELS.map((dayLabel, dayIdx) => {
                            const windows = (hoursData[s.id] ?? []).filter((w) => w.day_of_week === dayIdx);
                            const disabledDays = hoursDisabledDays[s.id] ?? [];
                            const isDayDisabled = disabledDays.includes(dayIdx);
                            return (
                              <div key={dayIdx} style={{ marginBottom: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 8, flexWrap: "wrap" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", minWidth: 36 }}>{dayLabel}</span>
                                    <button type="button"
                                      onClick={() => setHoursDisabledDays((prev) => { const current = prev[s.id] ?? []; const next = current.includes(dayIdx) ? current.filter((d) => d !== dayIdx) : [...current, dayIdx].sort((a, b) => a - b); return { ...prev, [s.id]: next }; })}
                                      style={{ fontSize: 10, padding: "4px 10px", borderRadius: 999, border: isDayDisabled ? "1px solid #fecaca" : "1px solid #bbf7d0", background: isDayDisabled ? "#fff1f2" : "#f0fdf4", color: isDayDisabled ? "#b91c1c" : "#166534", cursor: "pointer", fontWeight: 700 }}>
                                      {isDayDisabled ? "Off" : "On"}
                                    </button>
                                  </div>
                                  <button type="button" disabled={isDayDisabled}
                                    onClick={() => { if (isDayDisabled) return; setHoursData((prev) => ({ ...prev, [s.id]: [...(prev[s.id] ?? []), { day_of_week: dayIdx, open_time: "09:00", close_time: "18:00" }] })); }}
                                    style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, border: "1px solid #e2e8f0", background: isDayDisabled ? "#f8fafc" : "#fff", color: isDayDisabled ? "#94a3b8" : "#0f172a", cursor: isDayDisabled ? "not-allowed" : "pointer", opacity: isDayDisabled ? 0.6 : 1 }}>
                                    + window
                                  </button>
                                </div>
                                {isDayDisabled ? <div style={{ fontSize: 10, color: "#ef4444", paddingLeft: 4, fontWeight: 600 }}>Closed</div>
                                  : windows.length === 0 ? <div style={{ fontSize: 10, color: "#cbd5e1", paddingLeft: 4 }}>No restriction</div> : null}
                                {!isDayDisabled && windows.map((w, wIdx) => {
                                  const realIdx = (() => { let count = 0; const all = hoursData[s.id] ?? []; for (let i = 0; i < all.length; i++) { if (all[i].day_of_week === dayIdx) { if (count === wIdx) return i; count++; } } return -1; })();
                                  return (
                                    <div key={wIdx} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, paddingLeft: 4 }}>
                                      <input type="time" value={w.open_time} onChange={(e) => setHoursData((prev) => { const arr = [...(prev[s.id] ?? [])]; if (realIdx >= 0) arr[realIdx] = { ...arr[realIdx], open_time: e.target.value }; return { ...prev, [s.id]: arr }; })} style={{ fontSize: 11, padding: "2px 4px", borderRadius: 6, border: "1px solid #e2e8f0" }} />
                                      <span style={{ fontSize: 10, color: "#94a3b8" }}>–</span>
                                      <input type="time" value={w.close_time} onChange={(e) => setHoursData((prev) => { const arr = [...(prev[s.id] ?? [])]; if (realIdx >= 0) arr[realIdx] = { ...arr[realIdx], close_time: e.target.value }; return { ...prev, [s.id]: arr }; })} style={{ fontSize: 11, padding: "2px 4px", borderRadius: 6, border: "1px solid #e2e8f0" }} />
                                      <button type="button" onClick={() => setHoursData((prev) => { const arr = [...(prev[s.id] ?? [])]; if (realIdx >= 0) arr.splice(realIdx, 1); return { ...prev, [s.id]: arr }; })} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}>✕</button>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                            <button type="button" onClick={() => saveHours(s.id)} disabled={hoursSaving[s.id]}
                              style={{ padding: "6px 12px", borderRadius: 999, border: "none", background: hoursSaving[s.id] ? "#94a3b8" : "#0f172a", color: "#fff", fontSize: 12, fontWeight: 600, cursor: hoursSaving[s.id] ? "not-allowed" : "pointer" }}>
                              {hoursSaving[s.id] ? "Saving…" : "Save hours"}
                            </button>
                            {hoursMsg[s.id] && <span style={{ fontSize: 11, color: hoursMsg[s.id]?.includes("✓") ? "#16a34a" : "#ef4444" }}>{hoursMsg[s.id]}</span>}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
