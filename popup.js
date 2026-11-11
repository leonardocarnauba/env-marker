/*!
 * Env Marker — popup
 * Created by Leonardo Carnauba
 */
const M = globalThis.EnvMarker;

async function getRules() {
  const { rules } = await chrome.storage.sync.get({ rules: null });
  return Array.isArray(rules) ? rules : M.DEFAULT_RULES.map((r) => ({ ...r }));
}

async function init() {
  const { enabled } = await chrome.storage.sync.get({ enabled: true });
  document.getElementById("enabled").checked = enabled;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  document.getElementById("url").textContent = url || "—";

  const matched = M.findMatchingRule(url, await getRules());
  const info = document.getElementById("match-info");
  info.replaceChildren();
  const badge = document.createElement("span");
  if (matched) {
    badge.className = "match";
    badge.style.background = M.isValidColor(matched.color) ? matched.color : M.DEFAULT_COLOR;
    badge.textContent = matched.label || "AMBIENTE";
  } else {
    badge.className = "no-match";
    badge.textContent = "Nenhuma regra casa com esta URL";
  }
  info.appendChild(badge);
}

document.getElementById("enabled").addEventListener("change", async (e) => {
  await chrome.storage.sync.set({ enabled: e.target.checked });
});

document.getElementById("open-options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById("quick-add").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let hostname;
  try {
    hostname = new URL(tab?.url || "").hostname;
  } catch (e) {
    hostname = "";
  }
  if (!hostname) {
    alert("Esta aba não tem uma URL que possa virar regra.");
    return;
  }
  const rules = await getRules();
  rules.push({ pattern: hostname, label: "NOVO", color: M.DEFAULT_COLOR, enabled: true, prefixTitle: false });
  await chrome.storage.sync.set({ rules });
  chrome.runtime.openOptionsPage();
});

init();
