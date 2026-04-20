"use client";

import React from "react";

import ModalOverlay from "@/components/booking/ModalOverlay";
import BookingDetailsCard from "@/components/booking/BookingDetailsCard";
import { adminColors } from "@/components/admin/AdminStyles";
import { formatMoney } from "@/lib/tax/taxFormatting";

import type { BookingRow } from "@/lib/owner/types";
import type { Service } from "@/lib/ops/types";

function toHistoryItem(b: BookingRow, services: Service[]): any {
  const isNightly =
    String((b as any).booking_mode || "").toLowerCase() === "nightly" ||
    !!(b.checkin_date && b.checkout_date);
  const checkinDate  = b.checkin_date  ? String(b.checkin_date).slice(0, 10)  : null;
  const checkoutDate = b.checkout_date ? String(b.checkout_date).slice(0, 10) : null;
  return {
    id: b.id, status: b.status ?? "confirmed",
    booking_code: (b as any).booking_code ?? null, created_at: b.created_at ?? null,
    customer_name: b.customer_name ?? null, customer_email: b.customer_email ?? null,
    customer_phone: b.customer_phone ?? null,
    service_name: b.service_name ?? services.find(s => s.id === b.service_id)?.name ?? null,
    staff_name: b.staff_name ?? null, resource_name: b.resource_name ?? null,
    start_time: b.start_time ?? b.starts_at ?? null,
    duration_minutes: isNightly ? (b.nights_count ? b.nights_count * 1440 : b.duration_minutes) : b.duration_minutes,
    booking_mode: isNightly ? "nightly" : "time_slots",
    checkin_date: checkinDate, checkout_date: checkoutDate,
    nights_count: b.nights_count ?? null, guests_count: (b as any).guests_count ?? null,
    price_amount: (b as any).price_amount ?? b.total_price ?? null,
    charge_amount: (b as any).charge_amount ?? null, currency_code: (b as any).currency_code ?? null,
    payment_method: (b as any).payment_method ?? null,
    applied_rate_rule_name: (b as any).applied_rate_rule_name ?? null,
    applied_rate_snapshot: (b as any).applied_rate_snapshot ?? null,
    // PR-TAX-1: tax breakdown snapshot
    subtotal_amount:       (b as any).subtotal_amount       ?? null,
    vat_amount:            (b as any).vat_amount            ?? null,
    service_charge_amount: (b as any).service_charge_amount ?? null,
    total_amount:          (b as any).total_amount          ?? null,
    tax_snapshot:          (b as any).tax_snapshot          ?? null,
  };
}

type PaymentLink = {
  id: number; token: string; amount_requested: number; amount_paid: number;
  currency_code: string; status: string; description: string | null;
  expires_at: string | null; created_at: string;
  whatsapp_sent_at: string | null; portal_url: string;
};

// PR A2.3: delegates to lib/tax/formatMoney for consistent rendering.
// Preserves en-JO locale + 3-dp (JOD fils precision) for owner-facing detail views.
function fmt(amount: number, currency = "JOD") {
  return formatMoney(amount, currency, {
    locale: "en-JO",
    maximumFractionDigits: 3,
    minimumFractionDigits: 3,
  });
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pending: { bg: "#fef3c7", color: "#92400e" }, partial: { bg: "#dbeafe", color: "#1e40af" },
    paid: { bg: "#dcfce7", color: "#166534" }, expired: { bg: "#f1f5f9", color: "#64748b" },
    cancelled: { bg: "#fee2e2", color: "#991b1b" },
  };
  const { bg, color } = map[status] || { bg: "#f1f5f9", color: "#64748b" };
  return <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: bg, color }}>{status}</span>;
}

function PaymentLinksPanel({ booking, apiBase, tenantSlug }: { booking: BookingRow; apiBase: string; tenantSlug: string; }) {
  const [links,       setLinks]       = React.useState<PaymentLink[]>([]);
  const [loading,     setLoading]     = React.useState(true);
  const [showForm,    setShowForm]    = React.useState(false);
  const [amount,      setAmount]      = React.useState("");
  const [description, setDescription] = React.useState("");
  const [expiryDays,  setExpiryDays]  = React.useState("7");
  const [creating,    setCreating]    = React.useState(false);
  const [createMsg,   setCreateMsg]   = React.useState("");
  const [createErr,   setCreateErr]   = React.useState("");
  const [copied,      setCopied]      = React.useState<number | null>(null);
  const currency = (booking as any).currency_code || "JOD";

  const loadLinks = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/rental-payment-links?bookingId=${booking.id}`, { headers: { "x-tenant-slug": tenantSlug } });
      if (res.ok) { const data = await res.json(); setLinks(data.links || []); }
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, [apiBase, booking.id, tenantSlug]);

  React.useEffect(() => { loadLinks(); }, [loadLinks]);

  async function createLink() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setCreateErr("Enter a valid amount."); return; }
    setCreating(true); setCreateMsg(""); setCreateErr("");
    try {
      const res = await fetch(`${apiBase}/rental-payment-links`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-tenant-slug": tenantSlug },
        body: JSON.stringify({ bookingId: booking.id, amountRequested: Number(amount), description: description.trim() || undefined, expiresInDays: expiryDays ? Number(expiryDays) : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create link");
      setCreateMsg(data.link?.whatsapp_sent_at ? "✓ Payment link created and sent via WhatsApp" : "✓ Payment link created");
      setAmount(""); setDescription(""); setShowForm(false); loadLinks();
    } catch (e: any) { setCreateErr(String(e?.message || "Failed to create link")); }
    finally { setCreating(false); }
  }

  async function cancelLink(id: number) {
    if (!confirm("Cancel this payment link?")) return;
    try {
      await fetch(`${apiBase}/rental-payment-links/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "x-tenant-slug": tenantSlug },
        body: JSON.stringify({ status: "cancelled" }),
      });
      loadLinks();
    } catch { /* non-fatal */ }
  }

  function copyUrl(link: PaymentLink) {
    try { navigator.clipboard.writeText(link.portal_url).then(() => { setCopied(link.id); setTimeout(() => setCopied(null), 2000); }); } catch { /* no clipboard */ }
  }

  const inp: React.CSSProperties = { width: "100%", borderRadius: 8, border: "1px solid #cbd5e1", padding: "7px 10px", fontSize: 13, background: "#fff", outline: "none" };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 };
  const btn = (primary?: boolean, danger?: boolean): React.CSSProperties => ({
    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
    border: primary ? "none" : danger ? "1px solid #fecaca" : "1px solid #cbd5e1",
    background: primary ? "#0f172a" : "transparent",
    color: primary ? "#fff" : danger ? "#b91c1c" : "#0f172a",
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Payment links</div>
        <button style={btn(true)} onClick={() => { setShowForm(v => !v); setCreateMsg(""); setCreateErr(""); }}>
          {showForm ? "Cancel" : "+ New link"}
        </button>
      </div>

      {createMsg && <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: 12, fontWeight: 700 }}>{createMsg}</div>}
      {createErr && <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 12, fontWeight: 700 }}>{createErr}</div>}

      {showForm && (
        <div style={{ marginBottom: 14, padding: 14, borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><div style={lbl}>Amount ({currency})</div><input type="number" min="0" step="0.001" value={amount} placeholder="e.g. 250.000" onChange={e => setAmount(e.target.value)} style={inp} /></div>
            <div><div style={lbl}>Expires in (days)</div><input type="number" min="1" max="90" value={expiryDays} onChange={e => setExpiryDays(e.target.value)} style={inp} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={lbl}>Description (optional)</div>
            <input type="text" value={description} placeholder="e.g. Balance payment for April stay" onChange={e => setDescription(e.target.value)} style={inp} />
          </div>
          {booking.customer_phone && (
            <div style={{ marginBottom: 10, padding: "6px 10px", borderRadius: 7, background: "#f0fdf4", fontSize: 12, color: "#166534" }}>
              📱 WhatsApp will be sent to {booking.customer_phone}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn(true)} onClick={createLink} disabled={creating}>{creating ? "Creating…" : "Create & send link"}</button>
            <button style={btn()} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 12, color: "#94a3b8" }}>Loading…</div>
      ) : links.length === 0 ? (
        <div style={{ fontSize: 12, color: "#94a3b8" }}>No payment links yet. Create one to send a secure payment request to the guest.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {links.map(link => {
            const remaining = Number(link.amount_requested) - Number(link.amount_paid);
            const isPaid    = link.status === "paid";
            const isActive  = link.status === "pending" || link.status === "partial";
            return (
              <div key={link.id} style={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${isPaid ? "#bbf7d0" : isActive ? "#e2e8f0" : "#f1f5f9"}`, background: isPaid ? "#f0fdf4" : "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{fmt(link.amount_requested, link.currency_code)}</span>
                    {Number(link.amount_paid) > 0 && !isPaid && <span style={{ fontSize: 12, color: "#16a34a", marginLeft: 6 }}>({fmt(link.amount_paid, link.currency_code)} received)</span>}
                    {link.description && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{link.description}</div>}
                  </div>
                  <StatusPill status={link.status} />
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" as const, alignItems: "center" }}>
                  {isActive && <button onClick={() => copyUrl(link)} style={{ ...btn(), fontSize: 11, padding: "4px 10px", background: copied === link.id ? "#dcfce7" : "transparent", borderColor: copied === link.id ? "#bbf7d0" : "#cbd5e1", color: copied === link.id ? "#166534" : "#0f172a" }}>{copied === link.id ? "✓ Copied!" : "📋 Copy link"}</button>}
                  {isActive && <a href={link.portal_url} target="_blank" rel="noopener noreferrer" style={{ ...btn(), textDecoration: "none", fontSize: 11, padding: "4px 10px" }}>🔗 Open</a>}
                  {link.whatsapp_sent_at && <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>📱 Sent via WhatsApp</span>}
                  {link.expires_at && isActive && <span style={{ fontSize: 11, color: "#f59e0b", marginLeft: "auto" }}>Expires {new Date(link.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                  {isActive && <button onClick={() => cancelLink(link.id)} style={{ ...btn(false, true), fontSize: 11, padding: "4px 10px" }}>Cancel</button>}
                </div>
                {link.status === "partial" && <div style={{ marginTop: 8, padding: "5px 8px", borderRadius: 6, background: "#eff6ff", fontSize: 12, color: "#1e40af", fontWeight: 600 }}>Remaining: {fmt(remaining, link.currency_code)}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// PR-CONTRACT-1: Contract upload/download panel
// ---------------------------------------------------------------------------
function ContractPanel({ booking, apiBase, tenantSlug }: { booking: BookingRow; apiBase: string; tenantSlug: string }) {
  const [contractUrl,  setContractUrl]  = React.useState<string | null>((booking as any).contract_url  || null);
  const [contractName, setContractName] = React.useState<string | null>((booking as any).contract_name || null);
  const [uploading,    setUploading]    = React.useState(false);
  const [msg,          setMsg]          = React.useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("tenantSlug", tenantSlug);
      const res = await fetch(`${apiBase}/booking-contracts/${booking.id}/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setMsg(data?.error || "Upload failed."); return; }
      setContractUrl(data.url);
      setContractName(data.name);
      setMsg("Contract uploaded.");
    } catch { setMsg("Upload failed."); }
    finally { setUploading(false); }
  }

  async function handleDelete() {
    if (!confirm("Remove the contract file?")) return;
    setUploading(true);
    try {
      await fetch(`${apiBase}/booking-contracts/${booking.id}?tenantSlug=${tenantSlug}`, { method: "DELETE" });
      setContractUrl(null); setContractName(null); setMsg("Contract removed.");
    } catch { setMsg("Delete failed."); }
    finally { setUploading(false); }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: adminColors.text, marginBottom: 12 }}>
        Contract
      </div>

      {msg && (
        <div style={{ fontSize: 12, padding: "7px 10px", borderRadius: 8, marginBottom: 10,
          background: "rgba(16,185,129,0.08)", color: "#059669", border: "1px solid rgba(16,185,129,0.2)" }}>
          {msg}
        </div>
      )}

      {contractUrl ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          borderRadius: 10, border: `1px solid ${adminColors.border}`, background: adminColors.surface }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: adminColors.text,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {contractName || "contract.pdf"}
            </div>
            <a href={contractUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: "var(--color-primary, #4f46e5)", textDecoration: "none" }}>
              View / download
            </a>
          </div>
          <button type="button" onClick={handleDelete} disabled={uploading}
            style={{ fontSize: 11, color: "#dc2626", background: "none", border: "none",
              cursor: "pointer", padding: 0, flexShrink: 0 }}>
            Remove
          </button>
        </div>
      ) : (
        <div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 7,
            padding: "9px 14px", borderRadius: 10, border: `1px solid ${adminColors.border}`,
            background: adminColors.surface, cursor: uploading ? "not-allowed" : "pointer",
            fontSize: 13, fontWeight: 500, color: adminColors.text, opacity: uploading ? 0.6 : 1 }}>
            {uploading ? "Uploading…" : "Upload contract (PDF / Word / image)"}
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleUpload} style={{ display: "none" }} disabled={uploading} />
          </label>
          <div style={{ fontSize: 11, color: adminColors.muted, marginTop: 6 }}>
            Max 10 MB. Visible to you and can be shared via the guest portal.
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingDetailsModal({
  selectedBooking, allowPending, services, onClose, updateBookingStatus,
  resourceLabel = "Resource", staffLabel = "Staff",
  tenantSlug = "", apiBase = "/api/owner/proxy",
}: {
  selectedBooking: BookingRow; allowPending: boolean; services: Service[];
  onClose: () => void;
  updateBookingStatus: (bookingId: number, status: "pending" | "confirmed" | "cancelled") => Promise<void> | void;
  resourceLabel?: string; staffLabel?: string; tenantSlug?: string; apiBase?: string;
}) {
  const current     = String(selectedBooking.status || "").toLowerCase();
  const isCancelled = current === "cancelled";
  const isNightly   = String((selectedBooking as any).booking_mode || "").toLowerCase() === "nightly"
    || !!(selectedBooking.checkin_date && selectedBooking.checkout_date);
  const [activeTab, setActiveTab] = React.useState<"details" | "payment" | "contract">("details");

  const statuses = [...(allowPending ? (["pending"] as const) : []), "confirmed" as const, "cancelled" as const];
  const tabS = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px", fontSize: 13, fontWeight: active ? 800 : 600, cursor: "pointer",
    borderRadius: "var(--bf-btn-radius, 999px)", border: active ? "none" : `1px solid ${adminColors.border}`,
    background: active ? "#0f172a" : "transparent", color: active ? "#fff" : adminColors.muted,
  });

  return (
    <ModalOverlay onClose={onClose} closeOnBackdrop={false} maxWidth="min(860px, 96vw)">
      <div style={{ ...(({ "--bf-surface": "rgba(255,255,255,0.97)", "--bf-border": "rgba(15,23,42,0.12)", "--bf-text": "rgba(15,23,42,0.92)", "--bf-muted": "rgba(15,23,42,0.58)", "--bf-card-shadow": "0 18px 60px rgba(2,6,23,0.18)" }) as any) }}>

        {tenantSlug && (
          <div style={{ display: "flex", gap: 6, padding: "14px 16px 0", borderBottom: `1px solid ${adminColors.border}` }}>
            <button style={tabS(activeTab === "details")} onClick={() => setActiveTab("details")}>Booking details</button>
            <button style={tabS(activeTab === "payment")} onClick={() => setActiveTab("payment")}>💳 Payment links</button>
            <button style={tabS(activeTab === "contract")} onClick={() => setActiveTab("contract")}>📄 Contract</button>
          </div>
        )}

        {activeTab === "details" ? (
          <BookingDetailsCard
            title="Booking Details" subtitle="Here's your booking summary."
            booking={toHistoryItem(selectedBooking, services)}
            resourceLabel={resourceLabel} staffLabel={staffLabel} onClose={onClose}
            primaryButtons={
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {statuses.filter(s => isCancelled ? s === "cancelled" : true).map(s => {
                  const isActive = current === s;
                  return (
                    <button key={s} type="button" onClick={() => updateBookingStatus(selectedBooking.id, s)} disabled={isActive}
                      style={{ padding: "8px 12px", borderRadius: "var(--bf-btn-radius, 999px)", border: `1px solid ${adminColors.border}`, background: isActive ? "rgba(79,70,229,0.10)" : adminColors.surface, cursor: isActive ? "default" : "pointer", fontWeight: 850, opacity: isActive ? 0.75 : 1 }}>
                      Set {s}
                    </button>
                  );
                })}
                <button type="button" onClick={() => updateBookingStatus(selectedBooking.id, "cancelled")}
                  style={{ padding: "8px 12px", borderRadius: "var(--bf-btn-radius, 999px)", border: "none", background: "rgba(244,63,94,0.92)", color: "#fff", cursor: "pointer", fontWeight: 900, marginLeft: "auto" }}>
                  Cancel booking
                </button>
              </div>
            }
          />
        ) : activeTab === "payment" ? (
          <div style={{ padding: 16 }}>
            <PaymentLinksPanel booking={selectedBooking} apiBase={apiBase} tenantSlug={tenantSlug} />
          </div>
        ) : (
          <ContractPanel booking={selectedBooking} apiBase={apiBase} tenantSlug={tenantSlug} />
        )}
      </div>
    </ModalOverlay>
  );
}
