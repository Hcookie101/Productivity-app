# Orbit — Browsing Time Tracker (Chrome MV3)

Optional companion extension that feeds **real browsing time** into the Orbit app,
replacing the demo data with your actual numbers.

## Install (unpacked)

1. Run the Orbit app (`npm run dev`) at `http://localhost:3000`.
2. Open `chrome://extensions` in Chrome/Edge/Brave.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this `extension/` folder.
5. Open (or refresh) the Orbit app tab — browsing time now flows in live.
   - The Stats page and AI coach switch from seeded demo data to real usage.

## How it works

- `background.js` (service worker): attributes active-tab seconds to domains,
  pauses when the browser loses focus or you go idle, keeps 30 days of history
  in `chrome.storage.local`, and broadcasts updates once a minute.
- `app-bridge.js` (content script): runs only on the app origin, writes the
  history into `localStorage["orbit-extension-sites"]`, and re-dispatches an
  `orbit-sites` event so the dashboard updates without a reload.
- `popup.html/js`: quick "time today" view from the toolbar icon.

Nothing is uploaded anywhere — the data stays on your machine.