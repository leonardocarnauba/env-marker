/*!
 * Env Marker — options page
 * Created by Leonardo Carnauba
 */
const M = globalThis.EnvMarker;
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const PRESETS = {
  compact: { height: 22, fontSize: 11 },
  normal:  { height: 32, fontSize: 13 },
  big:     { height: 44, fontSize: 16 },
  huge:    { height: 60, fontSize: 22 }
};

let rules = [];
let appearance = { ...M.DEFAULT_APPEARANCE };

async function load() {
  const data = await chrome.storage.sync.get({ rules: null, enabled: true, appearance: null });
  rules = Array.isArray(data.rules)
    ? data.rules.map(M.sanitizeRule).filter(Boolean)
    : M.DEFAULT_RULES.map((r) => ({ ...r }));
  appearance = M.sanitizeAppearance(data.appearance);
  $("#enabled").checked = data.enabled;
  syncAppearanceInputs();
  render();
}

function syncAppearanceInputs() {
  $("#height").value = appearance.height;
  $("#font-size").value = appearance.fontSize;
  $("#position").value = appearance.position;
  updatePreview();
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

// Most recently used web tab — the options page itself is the active tab
// here, so "active tab" would always be chrome-extension://...
async function getLastWebTabUrl() {
  const tabs = await chrome.tabs.query({});
  const web = tabs
    .filter((t) => /^(https?|file):/.test(t.url || ""))
    .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
  return web[0]?.url || "";
}

function render() {
  const container = $("#rules");
  container.replaceChildren();

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
    const handle = node.querySelector(".rule-handle");
    ruleEl.dataset.index = idx;

    const patternInput = node.querySelector(".rule-pattern");
    const labelInput = node.querySelector(".rule-label");
    const colorInput = node.querySelector(".rule-color");
    const presetSelect = node.querySelector(".rule-preset");
    const enabledCb = node.querySelector(".rule-enabled");
    const prefixCb = node.querySelector(".rule-prefix-title");

    patternInput.value = rule.pattern || "";
    labelInput.value = rule.label || "";
    colorInput.value = M.isValidColor(rule.color) ? rule.color : M.DEFAULT_COLOR;
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
      const url = prompt("URL para testar este padrão:", await getLastWebTabUrl());
      if (url == null) return;
      const ok = M.matchesPattern(url, rules[idx].pattern);
      alert(`URL:\n${url}\n\nResultado: ${ok ? "✅ CASA com este padrão" : "❌ não casa"}`);
    });

    // Drag & drop: só pelo handle, para não atrapalhar seleção de texto nos inputs
    handle.addEventListener("dragstart", (e) => {
      ruleEl.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(idx));
      e.dataTransfer.setDragImage(ruleEl, 20, 20);
    });
    handle.addEventListener("dragend", () => ruleEl.classList.remove("dragging"));
    ruleEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });
    ruleEl.addEventListener("drop", (e) => {
      e.preventDefault();
      const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
      if (!Number.isInteger(fromIdx) || fromIdx === idx) return;
      const [moved] = rules.splice(fromIdx, 1);
      rules.splice(idx, 0, moved);
      render();
    });

    container.appendChild(node);
  });
}

function showStatus(msg, isError = false) {
  const el = $("#status");
  el.textContent = msg;
  el.classList.toggle("error", isError);
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2000);
}

$("#add-rule").addEventListener("click", () => {
  rules.push({ pattern: "", label: "NOVO", color: M.DEFAULT_COLOR, enabled: true, prefixTitle: false });
  render();
});

// Igual ao popup: liga/desliga na hora, sem precisar salvar
$("#enabled").addEventListener("change", async (e) => {
  await chrome.storage.sync.set({ enabled: e.target.checked });
  showStatus(e.target.checked ? "✓ Extensão ativada" : "✓ Extensão desativada");
});

// Mantém o checkbox em sincronia se o popup mudar o estado
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enabled) $("#enabled").checked = changes.enabled.newValue !== false;
});

// Aparência: pré-visualização ao vivo; aplica nas páginas ao salvar
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

$$(".preset-buttons button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const preset = PRESETS[btn.dataset.preset];
    if (preset) {
      appearance = { ...appearance, ...preset };
      syncAppearanceInputs();
    }
  });
});

$("#save").addEventListener("click", async () => {
  const cleanRules = rules
    .map(M.sanitizeRule)
    .filter((r) => r && r.pattern.trim());
  appearance = M.sanitizeAppearance(appearance);
  await chrome.storage.sync.set({ rules: cleanRules, appearance });
  rules = cleanRules;
  render();
  showStatus("✓ Salvo");
});

$("#export").addEventListener("click", () => {
  const data = JSON.stringify({ rules, enabled: $("#enabled").checked, appearance }, null, 2);
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
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.rules)) {
      showStatus("Arquivo inválido", true);
      return;
    }
    const imported = data.rules.map(M.sanitizeRule).filter(Boolean);
    const skipped = data.rules.length - imported.length;
    rules = imported;
    if (data.appearance) {
      appearance = M.sanitizeAppearance(data.appearance);
      syncAppearanceInputs();
    }
    if (typeof data.enabled === "boolean") {
      $("#enabled").checked = data.enabled;
      await chrome.storage.sync.set({ enabled: data.enabled });
    }
    render();
    showStatus(`✓ Importado${skipped ? ` (${skipped} regra(s) inválida(s) ignorada(s))` : ""} — lembre de salvar`);
  } catch (err) {
    showStatus("Erro ao importar: " + err.message, true);
  } finally {
    e.target.value = "";
  }
});

load();
