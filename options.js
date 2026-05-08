/*!
 * Env Marker — options page
 * Created by Leonardo Carnauba
 */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DEFAULT_RULES = [
  { pattern: "/-prd\\b|\\bprod\\b|production/", label: "PRODUÇÃO", color: "#d13212", enabled: true, prefixTitle: true },
  { pattern: "/-stg\\b|staging|-snb\\b|sandbox/", label: "STAGING", color: "#f1c40f", enabled: true, prefixTitle: false },
  { pattern: "/-dev\\b|-hml\\b|homolog/", label: "DEV / HOMOLOG", color: "#3ecf8e", enabled: true, prefixTitle: false },
  { pattern: "localhost", label: "LOCAL", color: "#3184c2", enabled: true, prefixTitle: false }
];

const DEFAULT_APPEARANCE = { height: 32, fontSize: 13, position: "top" };

const PRESETS = {
  compact: { height: 22, fontSize: 11 },
  normal:  { height: 32, fontSize: 13 },
  big:     { height: 44, fontSize: 16 },
  huge:    { height: 60, fontSize: 22 }
};

let rules = [];
let enabled = true;
let appearance = { ...DEFAULT_APPEARANCE };

async function load() {
  const data = await chrome.storage.sync.get({ rules: null, enabled: true, appearance: null });
  rules = data.rules ?? DEFAULT_RULES;
  enabled = data.enabled;
  appearance = { ...DEFAULT_APPEARANCE, ...(data.appearance || {}) };
  $("#enabled").checked = enabled;
  $("#height").value = appearance.height;
  $("#font-size").value = appearance.fontSize;
  $("#position").value = appearance.position;
  updatePreview();
  render();
}

function updatePreview() {
  $("#height-value").textContent = appearance.height;
  $("#font-size-value").textContent = appearance.fontSize;
  const bar = $("#preview-bar");
  bar.style.height = appearance.height + "px";
  bar.style.fontSize = appearance.fontSize + "px";
  const dotSize = Math.max(4, Math.round(appearance.fontSize * 0.62));
  const dot = bar.querySelector(".preview-dot");
  dot.style.width = dotSize + "px";
  dot.style.height = dotSize + "px";
}

function render() {
  const container = $("#rules");
  container.innerHTML = "";

  if (rules.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Nenhuma regra cadastrada. Clique em + Nova regra para começar.";
    container.appendChild(empty);
    return;
  }

  const tpl = $("#rule-template");
  rules.forEach((rule, idx) => {
    const node = tpl.content.cloneNode(true);
    const ruleEl = node.querySelector(".rule");
    ruleEl.dataset.index = idx;

    const patternInput = node.querySelector(".rule-pattern");
    const labelInput = node.querySelector(".rule-label");
    const colorInput = node.querySelector(".rule-color");
    const presetSelect = node.querySelector(".rule-preset");
    const enabledCb = node.querySelector(".rule-enabled");
    const prefixCb = node.querySelector(".rule-prefix-title");

    patternInput.value = rule.pattern || "";
    labelInput.value = rule.label || "";
    colorInput.value = rule.color || "#d13212";
    enabledCb.checked = rule.enabled !== false;
    prefixCb.checked = !!rule.prefixTitle;

    patternInput.addEventListener("input", (e) => { rules[idx].pattern = e.target.value; });
    labelInput.addEventListener("input", (e) => { rules[idx].label = e.target.value; });
    colorInput.addEventListener("input", (e) => { rules[idx].color = e.target.value; });
    presetSelect.addEventListener("change", (e) => {
      if (e.target.value) {
        colorInput.value = e.target.value;
        rules[idx].color = e.target.value;
        e.target.value = "";
      }
    });
    enabledCb.addEventListener("change", (e) => { rules[idx].enabled = e.target.checked; });
    prefixCb.addEventListener("change", (e) => { rules[idx].prefixTitle = e.target.checked; });

    node.querySelector(".btn-remove").addEventListener("click", () => {
      if (confirm(`Remover a regra "${rule.label || rule.pattern}"?`)) {
        rules.splice(idx, 1);
        render();
      }
    });

    node.querySelector(".btn-test").addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;
      const url = tab.url || "";
      const matches = testPattern(url, rule.pattern);
      alert(`URL da aba ativa:\n${url}\n\nResultado: ${matches ? "✅ CASA com este padrão" : "❌ não casa"}`);
    });

    // Drag & drop
    ruleEl.addEventListener("dragstart", (e) => {
      ruleEl.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(idx));
    });
    ruleEl.addEventListener("dragend", () => ruleEl.classList.remove("dragging"));
    ruleEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });
    ruleEl.addEventListener("drop", (e) => {
      e.preventDefault();
      const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
      const toIdx = idx;
      if (fromIdx === toIdx) return;
      const [moved] = rules.splice(fromIdx, 1);
      rules.splice(toIdx, 0, moved);
      render();
    });

    container.appendChild(node);
  });
}

function testPattern(url, pattern) {
  if (!pattern) return false;
  try {
    if (pattern.startsWith("/") && pattern.endsWith("/") && pattern.length > 2) {
      return new RegExp(pattern.slice(1, -1), "i").test(url);
    }
    if (pattern.includes("*")) {
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      return new RegExp(escaped, "i").test(url);
    }
    return url.toLowerCase().includes(pattern.toLowerCase());
  } catch {
    return false;
  }
}

function showStatus(msg, isError = false) {
  const el = $("#status");
  el.textContent = msg;
  el.classList.toggle("error", isError);
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2000);
}

$("#add-rule").addEventListener("click", () => {
  rules.push({ pattern: "", label: "NOVO", color: "#3184c2", enabled: true, prefixTitle: false });
  render();
});

$("#enabled").addEventListener("change", (e) => { enabled = e.target.checked; });

// Listeners de aparência (ao vivo, sem precisar salvar)
$("#height").addEventListener("input", (e) => {
  appearance.height = parseInt(e.target.value, 10);
  updatePreview();
});
$("#font-size").addEventListener("input", (e) => {
  appearance.fontSize = parseInt(e.target.value, 10);
  updatePreview();
});
$("#position").addEventListener("change", (e) => {
  appearance.position = e.target.value;
});

// Atalhos de presets
$$('.preset-buttons button').forEach(btn => {
  btn.addEventListener("click", () => {
    const preset = PRESETS[btn.dataset.preset];
    if (preset) {
      appearance.height = preset.height;
      appearance.fontSize = preset.fontSize;
      $("#height").value = preset.height;
      $("#font-size").value = preset.fontSize;
      updatePreview();
    }
  });
});

$("#save").addEventListener("click", async () => {
  const cleanRules = rules.filter(r => r.pattern && r.pattern.trim());
  await chrome.storage.sync.set({ rules: cleanRules, enabled, appearance });
  rules = cleanRules;
  render();
  showStatus("✓ Salvo");
});

$("#export").addEventListener("click", () => {
  const data = JSON.stringify({ rules, enabled, appearance }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "env-marker-config.json";
  a.click();
  URL.revokeObjectURL(url);
});

$("#import").addEventListener("click", () => $("#import-file").click());
$("#import-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (Array.isArray(data.rules)) {
      rules = data.rules.map(r => ({
        ...r,
        color: /^#[0-9a-fA-F]{3,8}$/.test(r.color) ? r.color : "#3184c2"
      }));
      if (typeof data.enabled === "boolean") {
        enabled = data.enabled;
        $("#enabled").checked = enabled;
      }
      if (data.appearance) {
        appearance = { ...DEFAULT_APPEARANCE, ...data.appearance };
        $("#height").value = appearance.height;
        $("#font-size").value = appearance.fontSize;
        $("#position").value = appearance.position;
        updatePreview();
      }
      render();
      showStatus("✓ Importado (lembre de salvar)");
    } else {
      showStatus("Arquivo inválido", true);
    }
  } catch (err) {
    showStatus("Erro ao importar: " + err.message, true);
  }
  e.target.value = "";
});

load();
