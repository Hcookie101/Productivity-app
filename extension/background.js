/**
 * Orbit background service worker.
 * Attributes active-tab time per domain, stores ~30 days of history in
 * chrome.storage.local, and mirrors it into the Orbit app via its content
 * script bridge (which writes localStorage on the app origin).
 */

const ALARM = "orbit-tick";
let current = { tabId: null, domain: null };
let lastCommit = Date.now();

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

async function load() {
  const { orbitDaily } = await chrome.storage.local.get("orbitDaily");
  return orbitDaily && typeof orbitDaily === "object" ? orbitDaily : { daily: {} };
}

async function save(data) {
  await chrome.storage.local.set({ orbitDaily: data });
}

function toSites(data) {
  const sites = [];
  for (const [date, domains] of Object.entries(data.daily || {})) {
    for (const [domain, seconds] of Object.entries(domains)) {
      sites.push({ domain, date, seconds });
    }
  }
  return sites;
}

async function broadcast(data) {
  try {
    const tabs = await chrome.tabs.query({
      url: ["http://localhost:3000/*", "http://127.0.0.1:3000/*"],
    });
    const sites = toSites(data);
    for (const t of tabs) {
      chrome.tabs.sendMessage(t.id, { type: "orbit-sites", sites }).catch(() => {});
    }
  } catch {
    // app not open — fine
  }
}

async function commit() {
  const now = Date.now();
  const secs = Math.min(180, Math.round((now - lastCommit) / 1000));
  lastCommit = now;
  if (!current.domain || secs < 5) return;
  const data = await load();
  const key = todayKey();
  data.daily[key] = data.daily[key] || {};
  data.daily[key][current.domain] = (data.daily[key][current.domain] || 0) + secs;
  // keep the last 30 days
  const keys = Object.keys(data.daily).sort();
  while (keys.length > 30) delete data.daily[keys.shift()];
  await save(data);
  await broadcast(data);
}

async function setActiveTab(tabId) {
  await commit();
  try {
    const tab = await chrome.tabs.get(tabId);
    current = { tabId, domain: hostOf(tab.url) };
  } catch {
    current = { tabId: null, domain: null };
  }
}

chrome.tabs.onActivated.addListener((info) => setActiveTab(info.tabId));

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (tabId === current.tabId && info.url) {
    commit().then(() => {
      current.domain = hostOf(info.url);
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === current.tabId) {
    commit();
    current = { tabId: null, domain: null };
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await commit();
    current.domain = null;
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, windowId });
  if (tab && tab.id) setActiveTab(tab.id);
});

chrome.idle.onStateChanged.addListener(async (state) => {
  if (state !== "active") {
    await commit();
    current.domain = null;
  } else {
    lastCommit = Date.now();
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab && tab.id) setActiveTab(tab.id);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM, { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM) {
    await commit();
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "orbit-get") {
    load().then((data) => sendResponse({ type: "orbit-sites", sites: toSites(data) }));
    return true;
  }
  return false;
});