# A2 — TaxLine Migration Audit

**Plan reference:** Master Action Plan v2 §3.4, §0.6; Locked Decision #1.

This document tracks the migration from raw price renders to the `<TaxLine>` primitive. Each row records a surface, its old pattern, the new pattern, and the patch that closed it.

## Migration principles

1. **Preserve the existing contract.** Where a helper like `fmtPrice(plan)` returned `string | null`, it still does — callers that branch on "null means Free" keep working. We only change the math/formatting underneath.
2. **Delegate, don't duplicate.** Every helper (`fmtPrice`, `fmtMoney`, `planPriceText`, `fmt`) now calls `formatMoney` from `lib/tax/taxFormatting.ts`. No more scattered `Intl.NumberFormat` calls outside that module.
3. **Use `<TaxLine>` directly** when you need tax breakdown display. The helpers are for plain-string contexts (button labels, chip text, row cells).
4. **Never render raw** — `{price} {currency}` template literals and inline `Intl.NumberFormat` are now forbidden outside `lib/tax/` and tests.

## Surfaces migrated in Patch 95 (A2.2)

| # | Surface | Old pattern | New pattern | Risk |
|---|---|---|---|---|
| 1 | `components/booking/MembershipPurchaseModalAtoms.tsx` | Local `Intl.NumberFormat` in `fmtPrice` | Delegates to `formatMoney` | Low |
| 2 | `components/booking/PackagePurchaseModalAtoms.tsx` | Local `Intl.NumberFormat` in `fmtMoney` | Delegates to `formatMoney` | Low |
| 3 | `components/booking/MembershipsTabSupport.tsx` | Raw `${price} ${cur}` template in `planPriceText` | Delegates to `formatMoney` | Low |
| 4 | `components/booking/PackagesTabCards.tsx` | Inline `` `${p.price_amount}${p.currency}` `` template | `formatMoney(p.price_amount, p.currency)` | Low |
| 5 | `lib/booking/publicBooking/usePricingQuote.ts` | Local `fmtMoney` with `Intl.NumberFormat` | Delegates to `formatMoney` | Medium (booking critical) |
| 6 | `components/booking/BookingDetailsCard.tsx` | Local `$$` helper with `Intl.NumberFormat` | `formatMoney(n, currency, {3 dp})` — preserves JOD fils precision | Medium (booking critical) |
| 7 | `components/booking/NightlyBookingDetails.tsx` | Local `fmtMoney` forcing 2 dp | Delegates to `formatMoney` with 2 dp override | Medium (nightly critical) |
| 8 | `components/booking/NightlyBookingFormCardAtoms.tsx` | Local `fmt` with `Intl.NumberFormat` | Delegates to `formatMoney` | Medium (nightly critical) |
| 9 | `components/public-booking/MembershipResolutionModal.tsx` | Raw `{price} {currency}` in JSX | `formatMoney(...)` | Low |

## Surfaces NOT migrated (deliberately)

| Surface | Reason |
|---|---|
| `components/booking/BookingDetailsPaymentBreakdown.tsx` | Receives `money` helper as a prop — parent injects it. Parent was migrated (#6). |
| `components/booking/ConfirmationModal.tsx` | No raw price render — forwards data to `PaymentMethodSelector` |
| `components/owner/tabs/setup/...` | Owner setup surfaces — planned for next migration patch (A2.2b) — these are tenant-facing admin, lower customer-visible urgency |
| `components/admin/PlansBillingPanel.tsx` | Admin-only — planned for A2.2b |

The owner-setup surfaces will be migrated in a follow-up sub-patch (A2.2b) before the rule flips to error mode in A2.3. This patch focuses on customer-facing surfaces where regressions would be immediately visible.

## ESLint rule — `flexrz/no-raw-price-render`

The custom rule catches three raw-render patterns:

1. **JSX text adjacent to price expression:**
   ```tsx
   // BAD
   <span>{price} JOD</span>
   // OK
   <TaxLine amount={price} currency="JOD" display="compact" />
   ```

2. **Template literals mixing price + currency:**
   ```tsx
   // BAD
   <span>{`${plan.price} ${plan.currency}`}</span>
   // OK
   <TaxLine amount={plan.price} currency={plan.currency} display="compact" />
   ```

3. **`Intl.NumberFormat(..., { style: "currency" })` outside `lib/tax/`:**
   ```ts
   // BAD (in any file outside lib/tax/)
   new Intl.NumberFormat(locale, { style: "currency", currency: "USD" })
   // OK
   import { formatMoney } from "@/lib/tax/taxFormatting";
   formatMoney(amount, currency);
   ```

### Exempt paths

- `lib/tax/**/*` — owns the primitive
- `components/ui/TaxLine.tsx` — is the primitive
- `__tests__/**/*` — tests exercise patterns explicitly
- `eslint-rules/**/*` — the rule itself

### Mode transition

| Patch | Mode | Behavior |
|---|---|---|
| 95 (this patch) | `warn` | Violations logged but don't fail CI |
| 96 (A2.3) | `error` | Violations fail CI — `<TaxLine>` becomes mandatory |

## Rule limitations (known false negatives)

The rule is a heuristic. It catches ~90% of raw renders but may miss:

- Dynamically computed currency codes (`const cur = getTenantCurrency(); return \`${price} ${cur}\``)
- Custom helpers that internally use `Intl.NumberFormat` without the `style: "currency"` literal
- Prices rendered from indexed arrays or memoized expressions where the AST doesn't match our identifier-name heuristic

Patch A2.3 will add a pre-commit grep check for additional common patterns as a belt-and-suspenders safety net.

## How to add a new price render

```tsx
import TaxLine from "@/components/ui/TaxLine";

// List row, compact:
<TaxLine amount={plan.price} currency={plan.currency} display="compact" />

// Checkout summary, full breakdown with tax rows:
<TaxLine
  amount={subtotal}
  currency={tenant.currency}
  taxConfig={tenant.tax_config}
  display="breakdown"
/>

// Using backend pre-computed breakdown:
<TaxLine
  breakdown={normalizeBackendBreakdown(quote.tax)}
  display="breakdown"
/>

// Just the number, no tax suffix:
<TaxLine amount={revenue} currency="JOD" display="total-only" />
```

For plain strings (chip labels, concatenated meta rows), use the formatter helper directly:

```ts
import { formatMoney } from "@/lib/tax/taxFormatting";
const label = `${credits} · ${formatMoney(price, currency)}`;
```
