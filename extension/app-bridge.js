/**
 * Orbit content-script bridge.
 * Runs only on the Orbit app origin. Receives site stats from the background
 * worker and writes them into localStorage where the app's ExtensionBridge
 * picks them up (and re-dispatches a live event).
 */
const KEY = "orbit-extension-sites";

function ingest(sites) {
  if (!Array.isArray(sites)) return;
  const byDomain = {};
  for (const s of sites) {
    if (!s || !s.domain || typeof s.seconds !== "number" || !s.date) continue;
    if (!byDomain[s.domain]) byDomain[s.domain] = {};
    const prev = byDomain[s.domain][s.date] || 0;
    byDomain[s.domain][s.date] = Math.max(prev, s.seconds);
  }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(byDomain));
  } catch {
    return;
  }
  const payload = Object.entries(byDomain).map(([domain, history]) => ({ domain, history }));
  window.dispatchEvent(new CustomEvent("orbit-sites", { detail: { sites: payload } }));
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "orbit-sites") {
    ingest(msg.sites);
  }
});

// pull existing history on load
try {
  chrome.runtime.sendMessage({ type: "orbit-get" }, (res) => {
    if (chrome.runtime.lastError) return;
    if (res && res.type === "orbit-sites") ingest(res.sites);
  });
} catch {
  // extension reloaded — ignore
}