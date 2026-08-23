import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ActiveTimer, AppState, FocusSession, Goal, Obligation, SiteStat, WeekPlan } from "./types";
import { AI_PROVIDERS, DEFAULT_AI, DEFAULT_PREFS, STORAGE_KEY } from "./constants";
import { uid } from "./utils";

export function timerElapsed(t: ActiveTimer | null, now: number): number {
  if (!t) return 0;
  if (t.paused) return t.accumSeconds;
  return Math.max(0, t.accumSeconds + (now - t.startedAt) / 1000);
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      goals: [],
      obligations: [],
      weeks: {},
      sessions: [],
      siteStats: [],
      timer: null,
      prefs: { ...DEFAULT_PREFS },
      settings: { ...DEFAULT_AI },
      toasts: [],

      // ---------- goals ----------
      addGoal: (goal) => set((s) => ({ goals: [...s.goals, goal] })),
      updateGoal: (id, patch) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      addSubgoal: (goalId, sub) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === goalId ? { ...g, subgoals: [...g.subgoals, sub] } : g)),
        })),
      addSubgoals: (goalId, subs) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === goalId ? { ...g, subgoals: [...g.subgoals, ...subs] } : g)),
        })),
      toggleSubgoal: (goalId, subId) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? { ...g, subgoals: g.subgoals.map((sb) => (sb.id === subId ? { ...sb, done: !sb.done } : sb)) }
              : g
          ),
        })),
      removeSubgoal: (goalId, subId) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId ? { ...g, subgoals: g.subgoals.filter((sb) => sb.id !== subId) } : g
          ),
        })),

      // ---------- obligations ----------
      addObligation: (o) => set((s) => ({ obligations: [...s.obligations, o] })),
      updateObligation: (id, patch) =>
        set((s) => ({ obligations: s.obligations.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
      removeObligation: (id) => set((s) => ({ obligations: s.obligations.filter((o) => o.id !== id) })),

      // ---------- weeks ----------
      setWeek: (week) =>
        set((s) => {
          const existing = s.weeks[week.start];
          const prevById = new Map((existing?.slots ?? []).map((sl) => [sl.id, sl]));
          const slots = week.slots.map((sl) => {
            const prev = prevById.get(sl.id);
            if (!prev) return sl;
            return { ...sl, done: prev.done, locked: prev.locked || sl.locked };
          });
          return { weeks: { ...s.weeks, [week.start]: { ...week, slots } } };
        }),
      clearWeek: (start) =>
        set((s) => {
          const next = { ...s.weeks };
          delete next[start];
          return { weeks: next };
        }),
      toggleSlotDone: (weekStart, slotId) =>
        set((s) => {
          const plan = s.weeks[weekStart];
          if (!plan) return {};
          return {
            weeks: {
              ...s.weeks,
              [weekStart]: {
                ...plan,
                slots: plan.slots.map((sl) => (sl.id === slotId ? { ...sl, done: !sl.done } : sl)),
              },
            },
          };
        }),
      addSlot: (weekStart, slot) =>
        set((s) => {
          const plan = s.weeks[weekStart];
          if (!plan) return { weeks: { ...s.weeks, [weekStart]: { start: weekStart, slots: [slot], generatedAt: Date.now() } } };
          return {
            weeks: { ...s.weeks, [weekStart]: { ...plan, slots: [...plan.slots, slot] } },
          };
        }),
      updateSlot: (weekStart, slotId, patch) =>
        set((s) => {
          const plan = s.weeks[weekStart];
          if (!plan) return {};
          return {
            weeks: {
              ...s.weeks,
              [weekStart]: {
                ...plan,
                slots: plan.slots.map((sl) => (sl.id === slotId ? { ...sl, ...patch } : sl)),
              },
            },
          };
        }),
      removeSlot: (weekStart, slotId) =>
        set((s) => {
          const plan = s.weeks[weekStart];
          if (!plan) return {};
          return {
            weeks: {
              ...s.weeks,
              [weekStart]: { ...plan, slots: plan.slots.filter((sl) => sl.id !== slotId) },
            },
          };
        }),

      // ---------- sessions + timer ----------
      addSession: (session) => set((s) => ({ sessions: [...s.sessions, session] })),
      startTimer: (title, goalId) =>
        set({ timer: { startedAt: Date.now(), accumSeconds: 0, paused: false, title, goalId } }),
      pauseTimer: () =>
        set((s) => {
          const t = s.timer;
          if (!t || t.paused) return {};
          return {
            timer: {
              ...t,
              accumSeconds: t.accumSeconds + (Date.now() - t.startedAt) / 1000,
              paused: true,
              startedAt: Date.now(),
            },
          };
        }),
      resumeTimer: () =>
        set((s) => {
          const t = s.timer;
          if (!t || !t.paused) return {};
          return { timer: { ...t, paused: false, startedAt: Date.now() } };
        }),
      cancelTimer: () => set({ timer: null }),
      stopTimer: (save, title, goalId) =>
        set((s) => {
          const t = s.timer;
          if (!t) return {};
          const elapsed = timerElapsed(t, Date.now());
          let sessions = s.sessions;
          if (save && elapsed >= 5) {
            const session: FocusSession = {
              id: uid("ses"),
              start: Date.now() - elapsed * 1000,
              end: Date.now(),
              kind: "focus",
              title: title ?? t.title ?? "Deep work session",
              goalId: goalId ?? t.goalId,
            };
            sessions = [...sessions, session];
          }
          return { timer: null, sessions };
        }),

      // ---------- sites ----------
      setSiteStats: (stats) => set((s) => ({ siteStats: mergeSiteStats(s.siteStats, stats) })),

      // ---------- prefs / settings ----------
      updatePrefs: (patch) => set((s) => ({ prefs: { ...s.prefs, ...patch } })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      // ---------- toasts ----------
      pushToast: (t) => set((s) => ({ toasts: [...s.toasts.slice(-4), { ...t, id: uid("toast") }] })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

            // ---------- data lifecycle ----------
      resetAll: () =>
        set({
          goals: [],
          obligations: [],
          weeks: {},
          sessions: [],
          siteStats: [],
          timer: null,
          prefs: { ...DEFAULT_PREFS },
          toasts: [],
        }),
            importJson: (json) => {
        try {
          const data = typeof json === "string" ? JSON.parse(json) : json;
          if (!data || typeof data !== "object") return false;
          set({
            goals: sanitizeGoals(data.goals),
            obligations: sanitizeObligations(data.obligations),
            weeks: sanitizeWeeks(data.weeks),
            sessions: Array.isArray(data.sessions) ? data.sessions : [],
            siteStats: Array.isArray(data.siteStats) ? data.siteStats : [],
            prefs: { ...DEFAULT_PREFS, ...(data.prefs ?? {}) },
          });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // v1 -> v2: drop all seeded/sample content; keep the user's settings & preferences.
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        const settings = { ...DEFAULT_AI, ...(p.settings ?? {}) };
        if (
          settings.provider === "gemini" &&
          (!settings.model || settings.model === "gemini-2.5-flash")
        ) {
          settings.model =
            AI_PROVIDERS.find((x) => x.value === "gemini")?.modelDefault ?? settings.model;
        }
        return {
          goals: [],
          obligations: [],
          weeks: {},
          sessions: [],
          siteStats: [],
          timer: null,
          prefs: { ...DEFAULT_PREFS, ...(p.prefs ?? {}) },
          settings,
        };
      },
      partialize: (state) =>
        ({
          goals: state.goals,
          obligations: state.obligations,
          weeks: state.weeks,
          sessions: state.sessions,
          siteStats: state.siteStats,
          timer: state.timer,
          prefs: state.prefs,
          settings: state.settings,
        }) as Partial<AppState>,
    }
  )
);

function mergeSiteStats(existing: SiteStat[], incoming: SiteStat[]): SiteStat[] {
  const map = new Map(existing.map((s) => [s.domain, s]));
  for (const stat of incoming) {
    const prior = map.get(stat.domain);
    if (!prior) {
      map.set(stat.domain, stat);
      continue;
    }
    const mergedHistory: Record<string, number> = { ...prior.history };
    for (const [date, secs] of Object.entries(stat.history)) {
      mergedHistory[date] = Math.max(mergedHistory[date] ?? 0, secs);
    }
    map.set(stat.domain, {
      domain: stat.domain,
      history: mergedHistory,
      lastVisited: Math.max(prior.lastVisited ?? 0, stat.lastVisited ?? 0) || undefined,
    });
  }
  return [...map.values()];
}

function sanitizeGoals(g: unknown): Goal[] {
  if (!Array.isArray(g)) return [];
  return g.filter((x): x is Goal => !!x && typeof x.id === "string" && typeof x.title === "string");
}

function sanitizeObligations(o: unknown): Obligation[] {
  if (!Array.isArray(o)) return [];
  return o.filter((x): x is Obligation => !!x && typeof x.id === "string" && typeof x.title === "string");
}

function sanitizeWeeks(w: unknown): Record<string, WeekPlan> {
  if (!w || typeof w !== "object") return {};
  const out: Record<string, WeekPlan> = {};
  for (const [key, value] of Object.entries(w as Record<string, WeekPlan>)) {
    if (value && Array.isArray(value.slots)) out[key] = value;
  }
  return out;
}