'use strict';

// query-string 7 (used by expo-router 6) loads this package with require().
// The fixed releases (0.5.1+, GHSA-qr28-fpjm-wq7f) are ESM-only, so this
// CommonJS entry re-exports their default export.
const fixedModule = require('decode-uri-component-fixed');

module.exports = fixedModule.default || fixedModule;
