# 🛰️ Orbit — Mission control for your time

A local-first productivity app that unifies **Goals**, **Obligations**, an
**AI-generated Schedule**, and **Stats + AI coach** into one dark, glassy
"mission control" — built to stand out from Motion, Reclaim, Rize, Todoist and
Notion.

## Why it's different

- **One AI brain across four features** — the same provider powers subgoal
  breakdowns, weekly schedule generation, natural-language schedule edits and
  the stats coach.
- **Obligations are hard constraints** — team standups, gym, classes become
  *locked* slots the planner can never move.
- **Day Health score** — a single 0–100 number blending planned-focus
  completion, obligations kept, distraction budget and week momentum.
- **Planned vs actual tracking** — the week grid you plan is compared against
  real focus sessions and real browsing time.
- **Zero-config offline AI** — every AI feature has a deterministic rules-based
  engine built in. Add your own OpenAI-compatible key in Settings for full
  model power; the key never leaves your browser.

## Modules

| Page | What it does |
| --- | --- |
| `/` Today | Greeting, Day Health ring, focus timer, today's timeline, heads-up deadlines |
| `/goals` | Outcome goals → subgoal checkpoints, AI "break it down" modal |
| `/obligations` | Recurring weekly commitments with conflict detection + week pattern strip |
| `/schedule` | Week grid (drag blocks, click empty space to add), ⚡Generate week, NL prompt bar ("move Gym to Thursday 6pm") |
| `/stats` | Planned-vs-actual area chart, browsing categories donut, top sites table, AI coach panel with one-click apply actions |
| `/settings` | BYO-AI (OpenAI / OpenRouter / custom), scheduling preferences, export/import/reseed/reset |

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Zustand +
persist · date-fns · Recharts · lucide-react · `next/font` (Inter + Space
Grotesk)

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

The app seeds a realistic demo workspace on first load (goals, obligations,
two generated weeks, focus sessions, two weeks of browsing history) so every
screen has life immediately.

## Chrome extension (optional)

`extension/` contains an MV3 companion that tracks real browsing time and
streams it into the app, replacing demo site data. Install via
`chrome://extensions` → Developer mode → **Load unpacked** → select the folder.
See `extension/README.md`.

## AI providers

Settings → AI provider: OpenAI, OpenRouter or any OpenAI-compatible endpoint.
Requests are proxied through `/api/ai/chat` (with a direct-browser fallback).
No key? Everything still works via the built-in engines:

- Subgoals: verb-aware templates scaled by deadline urgency
- Scheduler: obligation-pinning planner with deep-work windows, breaks & lunch
- Coach: rule engine over your live stats

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```

Data lives entirely in your browser's localStorage (`orbit-app-v1`). Export a
JSON backup from Settings anytime.