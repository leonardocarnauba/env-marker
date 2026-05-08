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

async function init() {
  const data = await chrome.storage.sync.get({ rules: [], enabled: true });
  document.getElementById("enabled").checked = data.enabled;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  document.getElementById("url").textContent = url;

  // Encontra match
  const matched = data.rules.find(r => r.enabled !== false && testPattern(url, r.pattern));
  const info = document.getElementById("match-info");
  if (matched) {
    info.innerHTML = `<span class="match" style="background:${matched.color}">${matched.label}</span>`;
  } else {
    info.innerHTML = `<span style="color:#8b96a3;font-size:11px;">Nenhuma regra casa com esta URL</span>`;
  }
}

document.getElementById("enabled").addEventListener("change", async (e) => {
  await chrome.storage.sync.set({ enabled: e.target.checked });
});

document.getElementById("open-options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById("quick-add").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  try {
    const u = new URL(tab.url);
    const data = await chrome.storage.sync.get({ rules: [] });
    data.rules.push({
      pattern: u.hostname,
      label: "NOVO",
      color: "#3184c2",
      enabled: true,
      prefixTitle: false
    });
    await chrome.storage.sync.set({ rules: data.rules });
    chrome.runtime.openOptionsPage();
  } catch (e) {
    alert("URL inválida");
  }
});

init();
