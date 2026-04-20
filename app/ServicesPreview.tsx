"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/tax/taxFormatting";

type Service = {
  id: number;
  tenant: string;
  name: string;
  durationMinutes: number;
  price: number;
};

export function ServicesPreview() {
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          "https://booking-backend-6jbc.onrender.com/api/services"
        );
        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }
        const json = await res.json();
        setServices(json.services || []);
      } catch (err) {
        console.error("Error loading services:", err);
        setError("Could not load example services.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div
      style={{
        marginTop: "24px",
        padding: "16px",
        borderRadius: "10px",
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        fontSize: "13px",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: "8px" }}>
        Example services (from API)
      </div>

      {loading && <div>⏳ Loading services…</div>}

      {!loading && error && (
        <div style={{ color: "#b91c1c" }}>⚠️ {error}</div>
      )}

      {!loading && !error && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {services.map((s) => (
            <li
              key={s.id}
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontWeight: 500 }}>{s.name}</div>
              <div style={{ color: "#64748b", fontSize: "12px" }}>
                {s.tenant} • {s.durationMinutes} min • {formatMoney(s.price, "JD")}
              </div>
            </li>
          ))}
          {services.length === 0 && (
            <li style={{ color: "#64748b" }}>No services returned.</li>
          )}
        </ul>
      )}
    </div>
  );
}
