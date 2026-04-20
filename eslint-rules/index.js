// eslint-rules/index.js
// ---------------------------------------------------------------------------
// Entry point for local ESLint rules. Consumed by eslint-plugin-flexrz.js
// (sibling file at the repo root) so ESLint resolves flexrz/* rule IDs.
// ---------------------------------------------------------------------------

"use strict";

module.exports = {
  rules: {
    "no-raw-price-render": require("./no-raw-price-render"),
  },
};
