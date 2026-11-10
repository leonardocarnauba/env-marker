/*!
 * Env Marker — service worker
 * Created by Leonardo Carnauba
 */
importScripts("shared.js");

// Seeds default rules/appearance on first install (and on updates for users
// who never saved anything), so the bar works without opening the options page.
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.sync.get({ rules: null, appearance: null });
  const patch = {};
  if (!Array.isArray(data.rules)) patch.rules = EnvMarker.DEFAULT_RULES;
  if (!data.appearance) patch.appearance = EnvMarker.DEFAULT_APPEARANCE;
  if (Object.keys(patch).length) await chrome.storage.sync.set(patch);
});
