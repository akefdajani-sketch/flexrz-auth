// eslint-plugin-flexrz.js
// ---------------------------------------------------------------------------
// Local ESLint plugin wrapper. Re-exports the rules from ./eslint-rules so
// that `plugins: ["flexrz"]` in .eslintrc.cjs resolves without requiring a
// separate published npm package.
//
// ESLint's resolver searches for `eslint-plugin-<name>` on package paths;
// placing this file at the repo root lets it find the plugin via the
// repo's own package.json (which needs a matching entry — see patch README).
// ---------------------------------------------------------------------------

"use strict";

module.exports = require("./eslint-rules");
