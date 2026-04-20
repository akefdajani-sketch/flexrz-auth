// eslint-rules/no-raw-price-render.js
// ---------------------------------------------------------------------------
// PR A2.2 — Custom ESLint rule: flag price rendering outside <TaxLine>.
//
// Phase 1 (this patch, A2.2): warn-mode. All violations fixed in same PR.
// Phase 2 (patch 96, A2.3):   error-mode. Any raw price render fails CI.
//
// What counts as a "raw price render":
//
//   BAD  — literal currency code after a variable/expression in JSX:
//     {price} JOD
//     {p.price} {p.currency}
//     `${price} ${currency}`              (template literal in JSX)
//     {`${price} ${currency}`}
//
//   BAD  — Intl.NumberFormat(style:'currency') OUTSIDE lib/tax/:
//     new Intl.NumberFormat(..., { style: 'currency' })
//
//   OK   — <TaxLine amount=... currency=... />
//   OK   — Anything inside lib/tax/**/* (the primitive lives there)
//   OK   — Anything inside __tests__/**/* (tests exercise patterns explicitly)
//   OK   — Backend files (we only lint frontend)
//   OK   — Comments and strings that happen to mention a currency
//
// Heuristic: this rule CATCHES MOST CASES, not all. Edge cases slip through.
// The migration PR (A2.2) manually audits the ~23 known surfaces. This
// rule's job is preventing REGRESSION going forward.
// ---------------------------------------------------------------------------

"use strict";

// Common currency codes and symbols to look for adjacent to expressions.
const CURRENCY_CODES = ["JOD", "JD", "USD", "EUR", "GBP", "SAR", "AED", "EGP", "KWD", "BHD", "QAR", "OMR"];
const CURRENCY_SYMBOLS = ["$", "€", "£", "¥"];

const CURRENCY_CODE_RE = new RegExp(`\\b(${CURRENCY_CODES.join("|")})\\b`);
const CURRENCY_SYMBOL_RE = new RegExp(`[${CURRENCY_SYMBOLS.map((s) => `\\${s}`).join("")}]`);

// Common price-expression field names we care about.
const PRICE_FIELD_RE =
  /(^|[._])(price|amount|cost|total|subtotal|fee|rate|value)(_amount|_total|_cents|_minor)?$/i;

// Paths that are EXEMPT — these own the primitive, test it, or ARE tax-setup
// preview widgets (which are themselves rendering raw subtotal/VAT/total
// while the tenant configures the tax rules — applying TaxLine there would
// create a circular dependency on the very config being edited).
const EXEMPT_PATH_RE = /(\/|^)(lib\/tax\/|components\/ui\/TaxLine\.|__tests__\/|eslint-rules\/|TaxSetupPanel\.tsx$|TaxSection\.tsx$)/;

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Force price rendering through <TaxLine>. Prevents untaxed money values leaking into the UI.",
      category: "FlexRz",
      recommended: true,
    },
    messages: {
      rawPriceJSX:
        "Raw price render detected ('{{text}}'). Use <TaxLine amount=... currency=... /> instead. See docs/migration/A2_TAXLINE_MIGRATION.md.",
      intlCurrency:
        "Intl.NumberFormat with style:'currency' used outside lib/tax/. Use <TaxLine /> or the helpers in lib/tax/taxFormatting.ts.",
      templateLiteral:
        "Template literal renders a price-like value with currency. Use <TaxLine /> instead.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename() || "";

    // Exempt paths — the primitive itself, tests, and the ESLint rule.
    if (EXEMPT_PATH_RE.test(filename)) {
      return {};
    }

    return {
      // ── Catch <div>{price} JOD</div> style renders ─────────────────────
      // JSXText following a JSXExpressionContainer containing an identifier
      // that looks price-like, where the text starts with a currency code.
      JSXText(node) {
        const text = String(node.value || "");
        if (!text.trim()) return;

        if (!CURRENCY_CODE_RE.test(text)) return;

        // Check if previous sibling is a JSXExpressionContainer with a
        // price-like identifier
        const parent = node.parent;
        if (!parent || !parent.children) return;

        const idx = parent.children.indexOf(node);
        if (idx <= 0) return;

        const prev = parent.children[idx - 1];
        if (!prev || prev.type !== "JSXExpressionContainer") return;

        if (!isPriceLikeExpression(prev.expression)) return;

        // Match: `{price} JOD` — text starts with currency code
        const match = text.match(CURRENCY_CODE_RE);
        if (!match) return;

        // Only flag if the currency code appears EARLY in the text (within
        // first 8 chars of the trimmed value) — otherwise it's just
        // prose that mentions a currency.
        const leading = text.replace(/^\s+/, "");
        if (leading.indexOf(match[0]) > 4) return;

        context.report({
          node,
          messageId: "rawPriceJSX",
          data: { text: leading.slice(0, 40).trim() },
        });
      },

      // ── Catch {`${price} ${currency}`} template literals in JSX ────────
      JSXExpressionContainer(node) {
        const expr = node.expression;
        if (!expr || expr.type !== "TemplateLiteral") return;

        // Does template mix a price-like identifier with a currency-like one?
        const exprs = expr.expressions || [];
        const hasPrice = exprs.some(isPriceLikeExpression);
        const hasCurrency = exprs.some(isCurrencyLikeExpression);

        // Or: does the template have a literal currency code in its quasis?
        const quasis = expr.quasis || [];
        const hasCurrencyLiteral = quasis.some(
          (q) => q.value && typeof q.value.raw === "string" && CURRENCY_CODE_RE.test(q.value.raw),
        );

        if (hasPrice && (hasCurrency || hasCurrencyLiteral)) {
          context.report({
            node,
            messageId: "templateLiteral",
          });
        }
      },

      // ── Catch Intl.NumberFormat(..., { style: "currency" }) ────────────
      NewExpression(node) {
        if (!node.callee || node.callee.type !== "MemberExpression") return;
        const obj = node.callee.object;
        const prop = node.callee.property;
        if (!obj || !prop) return;
        if (obj.name !== "Intl" || prop.name !== "NumberFormat") return;

        // Look for { style: "currency" } in the second argument
        const opts = node.arguments && node.arguments[1];
        if (!opts || opts.type !== "ObjectExpression") return;

        const styleProp = opts.properties.find(
          (p) =>
            p.type === "Property" &&
            p.key &&
            ((p.key.type === "Identifier" && p.key.name === "style") ||
              (p.key.type === "Literal" && p.key.value === "style")),
        );
        if (!styleProp || !styleProp.value) return;
        if (styleProp.value.type !== "Literal") return;
        if (styleProp.value.value !== "currency") return;

        context.report({
          node,
          messageId: "intlCurrency",
        });
      },
    };
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function isPriceLikeExpression(expr) {
  if (!expr) return false;

  // `price` (Identifier)
  if (expr.type === "Identifier") {
    return PRICE_FIELD_RE.test(expr.name);
  }

  // `p.price`, `plan.price_amount`, `quote.total` (MemberExpression)
  if (expr.type === "MemberExpression" && expr.property) {
    const name =
      expr.property.type === "Identifier"
        ? expr.property.name
        : expr.property.type === "Literal"
          ? String(expr.property.value)
          : "";
    return PRICE_FIELD_RE.test(name);
  }

  // `price ?? 0`, `price || 0` — unwrap
  if (expr.type === "LogicalExpression") {
    return isPriceLikeExpression(expr.left) || isPriceLikeExpression(expr.right);
  }

  // `Number(price)`, `toFixed(price)` — unwrap one arg deep
  if (expr.type === "CallExpression" && expr.arguments && expr.arguments.length > 0) {
    return expr.arguments.some(isPriceLikeExpression);
  }

  return false;
}

function isCurrencyLikeExpression(expr) {
  if (!expr) return false;

  if (expr.type === "Identifier") {
    return /^(currency|currencyCode|currency_code|cur)$/i.test(expr.name);
  }

  if (expr.type === "MemberExpression" && expr.property) {
    const name =
      expr.property.type === "Identifier"
        ? expr.property.name
        : expr.property.type === "Literal"
          ? String(expr.property.value)
          : "";
    return /^(currency|currencyCode|currency_code|cur)$/i.test(name);
  }

  return false;
}
