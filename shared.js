/*!
 * Env Marker — shared logic (matching, defaults, validation)
 * Created by Leonardo Carnauba
 *
 * Loaded by content script, popup, options page and service worker.
 * Exposes a single global: EnvMarker.
 */
(function (root) {
  "use strict";

  const DEFAULT_RULES = [
    { pattern: "/-prd\\b|\\bprod\\b|production/", label: "PRODUÇÃO", color: "#d13212", enabled: true, prefixTitle: true },
    { pattern: "/-stg\\b|staging|-snb\\b|sandbox/", label: "STAGING", color: "#f1c40f", enabled: true, prefixTitle: false },
    { pattern: "/-dev\\b|-hml\\b|homolog/", label: "DEV / HOMOLOG", color: "#3ecf8e", enabled: true, prefixTitle: false },
    { pattern: "localhost", label: "LOCAL", color: "#3184c2", enabled: true, prefixTitle: false }
  ];

  const DEFAULT_APPEARANCE = { height: 32, fontSize: 13, position: "top" };
  const LIMITS = { height: [20, 80], fontSize: [10, 32] };
  const DEFAULT_COLOR = "#3184c2";
  const MAX_LABEL = 40;

  // "/source/flags" -> RegExp. Always case-insensitive; g/y are dropped
  // because they make .test() stateful.
  function parseRegex(pattern) {
    const m = /^\/(.+)\/([a-z]*)$/.exec(pattern);
    if (!m) return null;
    const flags = "i" + m[2].replace(/[^msu]/g, "");
    return new RegExp(m[1], Array.from(new Set(flags)).join(""));
  }

  function matchesPattern(url, pattern) {
    if (typeof pattern !== "string" || !pattern.trim()) return false;
    pattern = pattern.trim();
    try {
      const re = parseRegex(pattern);
      if (re) return re.test(url);
      if (pattern.includes("*")) {
        const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
        return new RegExp(escaped, "i").test(url);
      }
      return url.toLowerCase().includes(pattern.toLowerCase());
    } catch (e) {
      return false;
    }
  }

  // First enabled rule that matches wins (order matters).
  function findMatchingRule(url, rules) {
    if (!Array.isArray(rules)) return null;
    for (const rule of rules) {
      if (!rule || rule.enabled === false) continue;
      if (matchesPattern(url, rule.pattern)) return rule;
    }
    return null;
  }

  // 6-digit hex only: that's the only format <input type="color"> accepts.
  function isValidColor(c) {
    return typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);
  }

  function clamp(n, [min, max], fallback) {
    n = Number(n);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  function sanitizeAppearance(a) {
    a = a && typeof a === "object" ? a : {};
    return {
      height: clamp(a.height, LIMITS.height, DEFAULT_APPEARANCE.height),
      fontSize: clamp(a.fontSize, LIMITS.fontSize, DEFAULT_APPEARANCE.fontSize),
      position: a.position === "bottom" ? "bottom" : "top"
    };
  }

  // Returns a clean rule or null if the input is not usable.
  function sanitizeRule(r) {
    if (!r || typeof r !== "object" || typeof r.pattern !== "string") return null;
    return {
      pattern: r.pattern,
      label: typeof r.label === "string" ? r.label.slice(0, MAX_LABEL) : "",
      color: isValidColor(r.color) ? r.color : DEFAULT_COLOR,
      enabled: r.enabled !== false,
      prefixTitle: r.prefixTitle === true
    };
  }

  root.EnvMarker = Object.freeze({
    DEFAULT_RULES,
    DEFAULT_APPEARANCE,
    DEFAULT_COLOR,
    LIMITS,
    matchesPattern,
    findMatchingRule,
    isValidColor,
    sanitizeAppearance,
    sanitizeRule
  });
})(typeof globalThis !== "undefined" ? globalThis : self);
