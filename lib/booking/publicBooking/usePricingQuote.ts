"use client";

// PR A2.2: fmtMoney local helper removed — delegates to lib/tax/formatMoney
// for consistent rounding, Intl, and graceful fallback across the product.

import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoney } from "@/lib/tax/taxFormatting";

type QuoteOut = {
  base_price_amount: number | null;
  adjusted_price_amount: number | null;
  currency_code: string | null;
  applied_rate_rule_id: number | null;
  applied_rate_snapshot: any;
  // PR-TAX-1: full tax breakdown returned by the backend pricing/quote endpoint
  tax: {
    subtotal: number | null;
    vat_amount: number | null;
    vat_label: string | null;
    vat_rate: number | null;
    service_charge_amount: number | null;
    service_charge_label: string | null;
    service_charge_rate: number | null;
    total: number | null;
    tax_inclusive: boolean;
    show_breakdown: boolean;
    currency_code: string | null;
  } | null;
};

type Args = {
  backendUrl: string; // usually "/api/proxy"
  slug: string;
  selectedDate: string;
  selectedTimes: string[];
  intervalMinutes: number;
  serviceId: number | "";
  staffId: number | "";
  resourceId: number | "";
};

export function usePricingQuote(args: Args) {
  const {
    backendUrl,
    slug,
    selectedDate,
    selectedTimes,
    intervalMinutes,
    serviceId,
    staffId,
    resourceId,
  } = args;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteOut | null>(null);

  const requestKey = useMemo(() => {
    const times = [...(selectedTimes || [])].sort();
    return JSON.stringify({
      slug,
      selectedDate,
      times,
      intervalMinutes,
      serviceId: serviceId || null,
      staffId: staffId || null,
      resourceId: resourceId || null,
    });
  }, [slug, selectedDate, selectedTimes, intervalMinutes, serviceId, staffId, resourceId]);

  const debounceRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, QuoteOut>>(new Map());

  useEffect(() => {
    // Only compute when we have enough info to quote.
    if (!backendUrl || !slug || !selectedDate || !serviceId || !selectedTimes?.length) {
      setLoading(false);
      setError(null);
      setQuote(null);
      return;
    }

    // Cache hit — resolve instantly, no loading needed.
    const cached = cacheRef.current.get(requestKey);
    if (cached) {
      setQuote(cached);
      setError(null);
      setLoading(false);
      return;
    }

    // Mark loading immediately (before the debounce fires) so the confirm
    // button is disabled from the very first render after slot selection.
    setLoading(true);
    setError(null);

    // Debounce to avoid spamming while user toggles slots.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        const firstTime = [...selectedTimes].sort()[0];
        const startLocal = new Date(`${selectedDate}T${firstTime}:00`);
        const start_time = startLocal.toISOString();
        const duration_minutes = selectedTimes.length * intervalMinutes;

        const url = `${backendUrl.replace(/\/$/, "")}/public/${encodeURIComponent(
          slug
        )}/pricing/quote`;

        const res = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId: Number(serviceId),
            staffId: staffId ? Number(staffId) : null,
            resourceId: resourceId ? Number(resourceId) : null,
            start_time,
            duration_minutes,
          }),
          signal: abortRef.current.signal,
        });

        const json = await res.json().catch(() => ({} as any));
        if (!res.ok) {
          throw new Error((json as any)?.error || `Quote failed (HTTP ${res.status})`);
        }

        const out: QuoteOut = {
          base_price_amount:     (json as any).base_price_amount     ?? null,
          adjusted_price_amount: (json as any).adjusted_price_amount ?? null,
          currency_code:         (json as any).currency_code         ?? null,
          applied_rate_rule_id:  (json as any).applied_rate_rule_id  ?? null,
          applied_rate_snapshot: (json as any).applied_rate_snapshot ?? null,
          // PR-TAX-1: capture the tax breakdown from the backend response
          tax: (json as any).tax ?? null,
        };

        cacheRef.current.set(requestKey, out);
        setQuote(out);
        setError(null);
      } catch (e: any) {
        if (String(e?.name || "") === "AbortError") return;
        setQuote(null);
        setError(e?.message || "Unable to estimate price.");
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [backendUrl, slug, selectedDate, selectedTimes, intervalMinutes, serviceId, staffId, resourceId, requestKey]);

  const estimateText = useMemo(() => {
    if (!quote) return null;
    if (quote.adjusted_price_amount == null) return "—";
    return formatMoney(quote.adjusted_price_amount, quote.currency_code || "JD");
  }, [quote]);

  return { quote, loading, error, estimateText };
}
