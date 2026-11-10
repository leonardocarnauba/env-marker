// Run with: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
require("../shared.js");
const M = globalThis.EnvMarker;

test("substring é case-insensitive", () => {
  assert.equal(M.matchesPattern("https://App.Example.com/x", "app.example.com"), true);
  assert.equal(M.matchesPattern("https://other.com", "app.example.com"), false);
});

test("wildcard", () => {
  assert.equal(M.matchesPattern("https://a.example.com/project/42", "*.example.com/project/*"), true);
  assert.equal(M.matchesPattern("https://a.example.com/other/42", "*.example.com/project/*"), false);
  // "." no padrão é literal, não "qualquer caractere"
  assert.equal(M.matchesPattern("https://aXexample.com/", "*a.example*"), false);
});

test("regex entre barras, com e sem flags", () => {
  assert.equal(M.matchesPattern("https://api-prd.x.com", "/-prd\\b|production/"), true);
  assert.equal(M.matchesPattern("https://API-PRD.x.com", "/-prd\\b/"), true);
  assert.equal(M.matchesPattern("https://api-prd.x.com", "/-prd\\b/i"), true);
  // flag g não pode deixar o .test() com estado
  assert.equal(M.matchesPattern("https://api-prd.x.com", "/prd/g"), true);
  assert.equal(M.matchesPattern("https://api-prd.x.com", "/prd/g"), true);
});

test("regex inválida e padrões vazios não casam", () => {
  assert.equal(M.matchesPattern("https://x.com", "/([/"), false);
  assert.equal(M.matchesPattern("https://x.com", ""), false);
  assert.equal(M.matchesPattern("https://x.com", "   "), false);
  assert.equal(M.matchesPattern("https://x.com", null), false);
});

test("primeira regra ativa vence", () => {
  const rules = [
    { pattern: "example", label: "A", enabled: false },
    { pattern: "example", label: "B" },
    { pattern: "example", label: "C" }
  ];
  assert.equal(M.findMatchingRule("https://example.com", rules).label, "B");
  assert.equal(M.findMatchingRule("https://nada.com", rules), null);
  assert.equal(M.findMatchingRule("https://x.com", null), null);
});

test("regras padrão", () => {
  const label = (url) => M.findMatchingRule(url, M.DEFAULT_RULES)?.label ?? null;
  assert.equal(label("https://app-prd.empresa.com"), "PRODUÇÃO");
  assert.equal(label("https://staging.empresa.com"), "STAGING");
  assert.equal(label("https://app-hml.empresa.com"), "DEV / HOMOLOG");
  assert.equal(label("http://localhost:3000"), "LOCAL");
  assert.equal(label("https://google.com"), null);
});

test("sanitizeAppearance limita valores", () => {
  assert.deepEqual(M.sanitizeAppearance({ height: "abc", fontSize: 999, position: "left" }),
    { height: 32, fontSize: 32, position: "top" });
  assert.deepEqual(M.sanitizeAppearance(null), M.DEFAULT_APPEARANCE);
  assert.deepEqual(M.sanitizeAppearance({ height: 5, fontSize: 12.6, position: "bottom" }),
    { height: 20, fontSize: 13, position: "bottom" });
});

test("sanitizeRule descarta lixo e corrige campos", () => {
  assert.equal(M.sanitizeRule(null), null);
  assert.equal(M.sanitizeRule({ label: "sem padrão" }), null);
  assert.deepEqual(
    M.sanitizeRule({ pattern: "x", label: "<img src=x onerror=alert(1)>".repeat(5), color: "red", prefixTitle: "yes" }),
    { pattern: "x", label: "<img src=x onerror=alert(1)>".repeat(5).slice(0, 40), color: M.DEFAULT_COLOR, enabled: true, prefixTitle: false }
  );
  assert.equal(M.sanitizeRule({ pattern: "x", color: "#ABCDEF" }).color, "#ABCDEF");
});
