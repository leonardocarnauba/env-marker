/*!
 * Env Marker
 * Created by Leonardo Carnauba
 */
(function () {
  "use strict";

  const M = globalThis.EnvMarker;
  const BAR_ID = "env-marker-bar";
  const FALLBACK_COLOR = "#d13212";

  let _active = null;          // { side, height, key, bar } while the bar is shown
  const _nudged = new Map();   // el -> { side, orig, prio } (original inline style)
  let _nudgeTimer = null;
  let _titlePrefix = null;
  let _domObserver = null;
  let _lastUrl = location.href;

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

  // ---------------------------------------------------------------------------
  // Fixed/sticky elements overlapping the bar get pushed out of the way
  // (down when the bar is on top, up when it is at the bottom).
  // ---------------------------------------------------------------------------

  function findOverlappingOwner(el, side, height) {
    const vh = window.innerHeight;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.id === BAR_ID) return null;
      let cs;
      try {
        cs = window.getComputedStyle(el);
      } catch (e) {
        return null;
      }
      if (cs.position === "fixed" || cs.position === "sticky") {
        const offset = parseFloat(cs[side]);
        const r = el.getBoundingClientRect();
        const overlaps = side === "top"
          ? r.top < height && r.bottom > 0
          : r.bottom > vh - height && r.top < vh;
        if (overlaps && !isNaN(offset) && offset >= 0 && offset < height) return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function nudgeElement(el, side, height) {
    if (_nudged.has(el)) return;
    let offset;
    try {
      offset = parseFloat(window.getComputedStyle(el)[side]);
    } catch (e) {
      return;
    }
    if (isNaN(offset)) return;
    _nudged.set(el, {
      side,
      orig: el.style.getPropertyValue(side),
      prio: el.style.getPropertyPriority(side)
    });
    el.style.setProperty(side, (offset + height) + "px", "important");
  }

  function nudgeFixedElements() {
    if (!_active) return;
    const { side, height } = _active;
    const w = window.innerWidth;
    const half = Math.max(1, Math.min(height - 1, Math.round(height / 2)));
    const y = side === "top" ? half : window.innerHeight - half;
    const xs = [8, 80, Math.round(w / 2), w - 80, w - 8].filter((x) => x >= 0 && x < w);
    const seen = new Set();

    for (const x of xs) {
      for (const el of document.elementsFromPoint(x, y)) {
        const owner = findOverlappingOwner(el, side, height);
        if (owner && !seen.has(owner)) {
          seen.add(owner);
          nudgeElement(owner, side, height);
        }
      }
    }
  }

  // Throttled (not debounced): pages that mutate the DOM constantly would
  // otherwise postpone the nudge forever.
  function scheduleNudge() {
    if (_nudgeTimer || !_active) return;
    _nudgeTimer = window.setTimeout(() => {
      _nudgeTimer = null;
      nudgeFixedElements();
    }, 50);
  }

  function clearNudge() {
    if (_nudgeTimer) {
      window.clearTimeout(_nudgeTimer);
      _nudgeTimer = null;
    }
    _nudged.forEach(({ side, orig, prio }, el) => {
      if (orig === "") el.style.removeProperty(side);
      else el.style.setProperty(side, orig, prio);
    });
    _nudged.clear();
  }

  // ---------------------------------------------------------------------------
  // Tab title prefix
  // ---------------------------------------------------------------------------

  function ensureTitlePrefix() {
    if (_titlePrefix && !document.title.startsWith(_titlePrefix)) {
      document.title = _titlePrefix + document.title;
    }
  }

  function setTitlePrefix(prefix) {
    if (prefix === _titlePrefix) {
      ensureTitlePrefix();
      return;
    }
    const old = _titlePrefix;
    _titlePrefix = null;
    if (old && document.title.startsWith(old)) {
      document.title = document.title.slice(old.length);
    }
    _titlePrefix = prefix || null;
    // If <title> doesn't exist yet (document_start), the DOM observer
    // applies the prefix as soon as the page sets it.
    ensureTitlePrefix();
  }

  // ---------------------------------------------------------------------------
  // Bar
  // ---------------------------------------------------------------------------

  function mountBar() {
    if (!_active || _active.bar.isConnected) return;
    (document.body || document.documentElement).appendChild(_active.bar);
  }

  function removeBar() {
    document.getElementById(BAR_ID)?.remove();
    const root = document.documentElement;
    root.classList.remove("env-marker-active", "env-marker-pos-top", "env-marker-pos-bottom");
    root.style.removeProperty("--env-marker-color");
    root.style.removeProperty("--env-marker-height");
    root.style.removeProperty("--env-marker-font-size");
    clearNudge();
    _active = null;
  }

  function renderBar(rule, appearance) {
    const { height, fontSize, position } = M.sanitizeAppearance(appearance);
    const color = typeof rule.color === "string" && CSS.supports("color", rule.color)
      ? rule.color
      : FALLBACK_COLOR;
    const labelText = rule.label || "AMBIENTE";
    const key = JSON.stringify([labelText, color, height, fontSize, position]);

    // Same bar already showing (e.g. SPA navigation inside the same env).
    if (_active && _active.key === key) {
      mountBar();
      scheduleNudge();
      return;
    }

    removeBar();

    const bar = document.createElement("div");
    bar.id = BAR_ID;
    bar.className = position === "bottom" ? "env-marker-bottom" : "env-marker-top";
    bar.style.background = color;

    const label = document.createElement("div");
    label.className = "env-marker-label";
    const dot = document.createElement("span");
    dot.className = "env-marker-dot";
    const text = document.createElement("span");
    text.textContent = labelText;
    label.append(dot, text);
    bar.appendChild(label);

    _active = { side: position, height, key, bar };
    mountBar();

    const root = document.documentElement;
    root.classList.add("env-marker-active", position === "bottom" ? "env-marker-pos-bottom" : "env-marker-pos-top");
    root.style.setProperty("--env-marker-color", color);
    root.style.setProperty("--env-marker-height", height + "px");
    root.style.setProperty("--env-marker-font-size", fontSize + "px");

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", scheduleNudge, { once: true });
    } else {
      scheduleNudge();
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  function shutdown() {
    removeBar();
    setTitlePrefix(null);
    if (_domObserver) {
      _domObserver.disconnect();
      _domObserver = null;
    }
    window.removeEventListener("popstate", checkUrl);
    window.removeEventListener("hashchange", checkUrl);
    window.removeEventListener("scroll", scheduleNudge);
    window.removeEventListener("resize", scheduleNudge);
  }

  function apply() {
    if (!hasExtensionContext()) {
      shutdown();
      return;
    }
    try {
      chrome.storage.sync.get({ rules: [], enabled: true, appearance: M.DEFAULT_APPEARANCE }, (data) => {
        if (!hasExtensionContext()) {
          shutdown();
          return;
        }
        const rule = data.enabled ? M.findMatchingRule(location.href, data.rules) : null;
        if (rule) {
          renderBar(rule, data.appearance);
          setTitlePrefix(rule.prefixTitle ? `[${rule.label || "AMBIENTE"}] ` : null);
        } else {
          removeBar();
          setTitlePrefix(null);
        }
      });
    } catch (error) {
      if (isContextInvalidatedError(error)) {
        shutdown();
        return;
      }
      throw error;
    }
  }

  function checkUrl() {
    if (location.href !== _lastUrl) {
      _lastUrl = location.href;
      apply();
    }
  }

  // One observer for everything: SPA navigation, title prefix, bar removed by
  // the page, and new fixed elements that need nudging.
  _domObserver = new MutationObserver(() => {
    checkUrl();
    ensureTitlePrefix();
    if (_active) {
      mountBar();
      scheduleNudge();
    }
  });
  _domObserver.observe(document, { subtree: true, childList: true });
  window.addEventListener("popstate", checkUrl);
  window.addEventListener("hashchange", checkUrl);
  // Sticky headers only reach the bar after scrolling, and "show on scroll up"
  // headers often appear via class changes (no childList mutation).
  window.addEventListener("scroll", scheduleNudge, { passive: true });
  window.addEventListener("resize", scheduleNudge, { passive: true });

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && (changes.rules || changes.enabled || changes.appearance)) {
        apply();
      }
    });
  } catch (error) {
    if (!isContextInvalidatedError(error)) throw error;
  }

  apply();
})();
