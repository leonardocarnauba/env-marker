/*!
 * Env Marker
 * Created by Leonardo Carnauba
 */
(function () {
  "use strict";

  const BAR_ID = "env-marker-bar";
  const _nudged = new Map(); // el -> original inline top value
  let _nudgeObserver = null;
  let _nudgeTimer = null;
  let _urlObserver = null;

  function hasExtensionContext() {
    try {
      return typeof chrome !== "undefined" && !!chrome.runtime?.id && !!chrome.storage?.sync;
    } catch (e) {
      return false;
    }
  }

  function isContextInvalidatedError(error) {
    return error?.message?.includes("Extension context invalidated");
  }

  function stopInvalidatedScript() {
    removeBar();
    if (_urlObserver) {
      _urlObserver.disconnect();
      _urlObserver = null;
    }
  }

  function getTopFixedOwner(el, height) {
    if (el.id === BAR_ID) return;
    while (el && el !== document.body && el !== document.documentElement) {
      let cs;
      try {
        cs = window.getComputedStyle(el);
      } catch (e) {
        return null;
      }

      if (cs.position === "fixed" || cs.position === "sticky") {
        const rect = el.getBoundingClientRect();
        const top = parseFloat(cs.top);
        const intersectsMarker = rect.top < height && rect.bottom > 0;
        if (intersectsMarker && !isNaN(top) && top >= 0 && top < height) {
          return el;
        }
      }

      el = el.parentElement;
    }
    return null;
  }

  function nudgeElement(el, height) {
    if (!el || el.id === BAR_ID) return;
    if (_nudged.has(el)) return;
    let cs;
    try {
      cs = window.getComputedStyle(el);
    } catch (e) {
      return;
    }
    const top = parseFloat(cs.top);
    if (isNaN(top)) return;
    _nudged.set(el, el.style.top);
    el.style.setProperty("top", (top + height) + "px", "important");
  }

  function nudgeFixedElements(height) {
    const seen = new Set();
    const y = Math.max(1, Math.min(height - 1, Math.round(height / 2)));
    const sampleXs = [8, 80, Math.round(window.innerWidth / 2), window.innerWidth - 80, window.innerWidth - 8]
      .filter(function (x) {
        return x >= 0 && x < window.innerWidth;
      });

    sampleXs.forEach(function (x) {
      document.elementsFromPoint(x, y).forEach(function (el) {
        const owner = getTopFixedOwner(el, height);
        if (owner && !seen.has(owner)) {
          seen.add(owner);
          nudgeElement(owner, height);
        }
      });
    });
  }

  function scheduleNudge(height) {
    if (_nudgeTimer) window.clearTimeout(_nudgeTimer);
    _nudgeTimer = window.setTimeout(function () {
      _nudgeTimer = null;
      nudgeFixedElements(height);
    }, 50);
  }

  function watchForNewFixed(height) {
    if (_nudgeObserver) _nudgeObserver.disconnect();
    _nudgeObserver = new MutationObserver(function () {
      scheduleNudge(height);
    });
    _nudgeObserver.observe(document.documentElement, { subtree: true, childList: true });
  }

  function clearNudge() {
    if (_nudgeObserver) {
      _nudgeObserver.disconnect();
      _nudgeObserver = null;
    }
    if (_nudgeTimer) {
      window.clearTimeout(_nudgeTimer);
      _nudgeTimer = null;
    }
    _nudged.forEach(function (orig, el) {
      if (orig === "") el.style.removeProperty("top");
      else el.style.top = orig;
    });
    _nudged.clear();
  }

  function matchesPattern(url, pattern) {
    if (!pattern) return false;
    // Suporta wildcard simples (*) e match por substring
    try {
      // Se tem regex válido entre / /, usa como regex
      if (pattern.startsWith("/") && pattern.endsWith("/") && pattern.length > 2) {
        const re = new RegExp(pattern.slice(1, -1), "i");
        return re.test(url);
      }
      // Wildcard: converte * em .*
      if (pattern.includes("*")) {
        const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
        const re = new RegExp(escaped, "i");
        return re.test(url);
      }
      // Substring match (case-insensitive)
      return url.toLowerCase().includes(pattern.toLowerCase());
    } catch (e) {
      return false;
    }
  }

  function findMatchingRule(url, rules) {
    if (!Array.isArray(rules)) return null;
    // Primeira regra que casar vence (ordem importa)
    for (const rule of rules) {
      if (rule.enabled === false) continue;
      if (matchesPattern(url, rule.pattern)) return rule;
    }
    return null;
  }

  function removeBar() {
    const existing = document.getElementById(BAR_ID);
    if (existing) existing.remove();
    document.documentElement.classList.remove("env-marker-active", "env-marker-pos-top", "env-marker-pos-bottom");
    document.documentElement.style.removeProperty("--env-marker-color");
    document.documentElement.style.removeProperty("--env-marker-height");
    document.documentElement.style.removeProperty("--env-marker-font-size");
    clearNudge();
  }

  function renderBar(rule, appearance) {
    removeBar();

    const height = appearance?.height ?? 32;
    const fontSize = appearance?.fontSize ?? 13;
    const position = appearance?.position === "bottom" ? "bottom" : "top";

    const bar = document.createElement("div");
    bar.id = BAR_ID;
    bar.className = position === "bottom" ? "env-marker-bottom" : "env-marker-top";
    bar.style.background = rule.color || "#d13212";

    const label = document.createElement("div");
    label.className = "env-marker-label";

    const dot = document.createElement("span");
    dot.className = "env-marker-dot";

    const text = document.createElement("span");
    text.textContent = rule.label || "AMBIENTE";

    label.appendChild(dot);
    label.appendChild(text);
    bar.appendChild(label);

    // Insere no documentElement (funciona mesmo antes do <body>)
    const insert = () => {
      if (document.body) {
        document.body.appendChild(bar);
      } else {
        document.documentElement.appendChild(bar);
      }
      nudgeFixedElements(height);
      watchForNewFixed(height);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", insert, { once: true });
    } else {
      insert();
    }

    document.documentElement.classList.add("env-marker-active");
    document.documentElement.classList.add(position === "bottom" ? "env-marker-pos-bottom" : "env-marker-pos-top");
    document.documentElement.style.setProperty("--env-marker-color", rule.color || "#d13212");
    document.documentElement.style.setProperty("--env-marker-height", height + "px");
    document.documentElement.style.setProperty("--env-marker-font-size", fontSize + "px");

    // Atualiza título da aba se configurado
    if (rule.prefixTitle) {
      const prefix = `[${rule.label}] `;
      if (!document.title.startsWith(prefix)) {
        const original = document.title;
        document.title = prefix + original;
        // Observa mudanças de título para manter o prefixo
        const titleEl = document.querySelector("title");
        if (titleEl) {
          new MutationObserver(() => {
            if (!document.title.startsWith(prefix)) {
              document.title = prefix + document.title;
            }
          }).observe(titleEl, { childList: true });
        }
      }
    }
  }

  function apply() {
    if (!hasExtensionContext()) {
      stopInvalidatedScript();
      return;
    }

    try {
      chrome.storage.sync.get({
        rules: [],
        enabled: true,
        appearance: { height: 32, fontSize: 13, position: "top" }
      }, (data) => {
        if (!hasExtensionContext()) {
          stopInvalidatedScript();
          return;
        }

        if (!data.enabled) {
          removeBar();
          return;
        }
        const rule = findMatchingRule(location.href, data.rules);
        if (rule) {
          renderBar(rule, data.appearance);
        } else {
          removeBar();
        }
      });
    } catch (error) {
      if (isContextInvalidatedError(error)) {
        stopInvalidatedScript();
        return;
      }
      throw error;
    }
  }

  // Aplica no carregamento
  apply();

  // Reage a mudanças de configuração
  if (hasExtensionContext()) {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "sync" && (changes.rules || changes.enabled || changes.appearance)) {
          apply();
        }
      });
    } catch (error) {
      if (!isContextInvalidatedError(error)) throw error;
      stopInvalidatedScript();
    }
  }

  // Reage a navegações SPA (mudança de URL sem reload)
  let lastUrl = location.href;
  _urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      apply();
    }
  });
  _urlObserver.observe(document, { subtree: true, childList: true });
})();
