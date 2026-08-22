import { subDays } from "date-fns";
import type {
  FocusSession,
  Goal,
  Obligation,
  SiteCategory,
  SiteStat,
  Slot,
  WeekPlan,
} from "./types";
import { formatDateISO, toMin } from "./time";
import { classifyDomain } from "./domains";

export { formatDateISO } from "./time";

export interface DayData {
  date: string;
  label: string;
  focusedMin: number;
  distractedMin: number;
  plannedMin: number;
  plannedDoneMin: number;
  sitesMin: number;
}

export interface SiteRow {
  domain: string;
  category: SiteCategory;
  todayMin: number;
  weekMin: number;
  totalMin: number;
  history: Record<string, number>;
  lastVisited?: number;
}

export interface StatsBundle {
  todayISO: string;
  days: DayData[];
  today: DayData;
  todayFocused: number;
  weekFocused: number;
  todayPlanned: number;
  weekPlanned: number;
  todaySites: number;
  weekSites: number;
  todayDistracted: number;
  sites: SiteRow[];
  categoryTotals: { category: SiteCategory; minutes: number }[];
  goalProgress: {
    goal: Goal;
    pct: number;
    daysLeft: number;
    urgent: boolean;
    subDone: number;
    subTotal: number;
  }[];
  todaySlots: Slot[];
  todayObligations: { total: number; done: number };
  weekObligations: { total: number; done: number };
  bestFocusDay: { date: string; minutes: number } | null;
  topDistractor: SiteRow | null;
  topWorkSite: SiteRow | null;
  healthScore: number;
  healthFactors: { key: string; label: string; score: number; weight: number; note: string }[];
  morningMin: number;
  eveningMin: number;
}

export interface StatsInput {
  goals: Goal[];
  obligations: Obligation[];
  weeks: Record<string, WeekPlan>;
  sessions: FocusSession[];
  siteStats: SiteStat[];
  now: Date;
}

export interface HealthFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  note: string;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - dow);
  return x;
}

function weekSlotsFor(weeks: Record<string, WeekPlan>, date: Date): Slot[] {
  const monday = mondayOf(date);
  const plan = weeks[formatDateISO(monday)];
  if (!plan) return [];
  const dow = (date.getDay() + 6) % 7;
  return plan.slots.filter((s) => s.day === dow);
}

function minutesBetween(start: string, end: string): number {
  return Math.max(0, toMin(end) - toMin(start));
}

function sessionMin(s: FocusSession): number {
  return Math.round((s.end - s.start) / 60000);
}

export function computeStats(input: StatsInput): StatsBundle {
  const { goals, obligations, weeks, sessions, siteStats } = input;
  const now = input.now;
    const todayISOStr = formatDateISO(now);
  const todayDate = startOfDay(now);
  const todayDow = (now.getDay() + 6) % 7;
  const todayMs = todayDate.getTime();

  // ---- per-day series (7 days) ----
  const days: DayData[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = subDays(todayDate, i);
    const iso = formatDateISO(date);
    const dayStartMs = date.getTime();
    const dayEndMs = date.getTime() + 86_400_000;
    const dSessions = sessions.filter((s) => s.start >= dayStartMs && s.start < dayEndMs);
    const focused = dSessions
      .filter((s) => s.kind === "focus")
      .reduce((a, s) => a + sessionMin(s), 0);
    const distracted = dSessions
      .filter((s) => s.kind === "distracted")
      .reduce((a, s) => a + sessionMin(s), 0);
    const slots = weekSlotsFor(weeks, date);
    const planned = slots
      .filter((s) => s.kind !== "break")
      .reduce((a, s) => a + minutesBetween(s.start, s.end), 0);
    const plannedDone = slots
      .filter((s) => s.kind !== "break" && s.done)
      .reduce((a, s) => a + minutesBetween(s.start, s.end), 0);
    const sitesMin = siteStats.reduce((a, site) => {
      const secs = site.history[iso] ?? 0;
      return a + Math.round(secs / 60);
    }, 0);
    days.push({
      date: iso,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      focusedMin: focused,
      distractedMin: distracted,
      plannedMin: planned,
      plannedDoneMin: plannedDone,
      sitesMin: sitesMin,
    });
  }

  const today = days[days.length - 1];
  const weekFocused = days.reduce((a, d) => a + d.focusedMin, 0);
  const weekPlanned = days.reduce((a, d) => a + d.plannedMin, 0);
  const weekSites = days.reduce((a, d) => a + d.sitesMin, 0);

  const todaySlots = (weeks[formatDateISO(mondayOf(now))]?.slots ?? []).filter((s) => s.day === todayDow);

  // ---- site rows ----
  const sites: SiteRow[] = siteStats
    .map((s) => {
      let weekMs = 0;
      let totalM = 0;
      for (const [date, secs] of Object.entries(s.history)) {
        const m = Math.round((secs ?? 0) / 60);
        totalM += m;
        const diffDays = Math.round(
          (todayMs - new Date(date + "T00:00:00").getTime()) / 86_400_000
        );
        if (diffDays >= 0 && diffDays < 7) weekMs += m;
      }
      return {
        domain: s.domain,
        category: classifyDomain(s.domain),
        todayMin: Math.round((s.history[todayISOStr] ?? 0) / 60),
        weekMin: weekMs,
        totalMin: totalM,
        history: s.history,
        lastVisited: s.lastVisited,
      };
    })
    .sort((a, b) => b.todayMin - a.todayMin || b.weekMin - a.weekMin);

  const todaySitesTotal = sites.reduce((a, s) => a + s.todayMin, 0);

  const categoryTotals: { category: SiteCategory; minutes: number }[] = [];
  for (const row of sites) {
    const found = categoryTotals.find((c) => c.category === row.category);
    if (found) found.minutes += row.weekMin;
    else if (row.weekMin > 0) categoryTotals.push({ category: row.category, minutes: row.weekMin });
  }
  categoryTotals.sort((a, b) => b.minutes - a.minutes);

  const distractorRows = sites.filter(
    (s) => s.category === "Social" || s.category === "Entertainment"
  );
  const topDistractor = distractorRows.length ? distractorRows[0] : null;
  const topWorkSite = sites.filter(
    (s) => s.category === "Work" || s.category === "Learning"
  ).sort((a, b) => b.weekMin - a.weekMin)[0] ?? null;

  // ---- goals ----
  const goalProgress = goals
    .filter((g) => g.status !== "done")
    .map((goal) => {
      const subTotal = goal.subgoals.length;
      const subDone = goal.subgoals.filter((s) => s.done).length;
      const pct = subTotal ? Math.round((subDone / subTotal) * 100) : 0;
      const deadline = new Date(goal.deadline + "T00:00:00");
      const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - todayMs) / 86_400_000));
      return { goal, pct, subDone, subTotal, daysLeft, urgent: daysLeft <= 14 };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // ---- obligations ----
  const todayOblArr = obligations.filter((o) => o.day === todayDow);
  const todayDoneCount = todayOblArr.filter((o) =>
    todaySlots.some((s) => s.obligationId === o.id && s.done)
  ).length;
  const weekDoneCount = obligations.filter((o) =>
    (weeks[formatDateISO(mondayOf(now))]?.slots ?? []).some(
      (s) => s.obligationId === o.id && s.done
    )
  ).length;

  // ---- best focus day ----
  let bestFocus: { date: string; minutes: number } | null = null;
  for (const d of days) {
    if (!bestFocus || d.focusedMin > bestFocus.minutes) bestFocus = { date: d.date, minutes: d.focusedMin };
  }

  // ---- morning vs evening focus today ----
  const todaySessions = sessions.filter(
    (s) => s.start >= todayMs && s.start < todayMs + 86_400_000
  );
  const morningMin = todaySessions
    .filter((s) => s.kind === "focus" && new Date(s.start).getHours() < 12)
    .reduce((a, s) => a + sessionMin(s), 0);
  const eveningMin = todaySessions
    .filter((s) => s.kind === "focus" && new Date(s.start).getHours() >= 18)
    .reduce((a, s) => a + sessionMin(s), 0);

  // ---- Day Health ----
  const healthFactors: HealthFactor[] = [];
  const plannedToday = today.plannedMin;
  const focusScore =
    plannedToday > 0
      ? Math.round(Math.min(100, (today.focusedMin / plannedToday) * 100))
      : Math.round(Math.min(100, (today.focusedMin / 90) * 100));
  healthFactors.push({
    key: "focus",
    label: "Planned focus completed",
    score: focusScore,
    weight: 0.4,
    note:
      plannedToday > 0
        ? `${Math.round((today.focusedMin / plannedToday) * 100)}% of ${plannedToday}m planned`
        : `${today.focusedMin}m focused today`,
  });

  const obligationScore =
    todayOblArr.length > 0 ? Math.round((todayDoneCount / todayOblArr.length) * 100) : 80;
  healthFactors.push({
    key: "obligations",
    label: "Obligations kept",
    score: obligationScore,
    weight: 0.25,
    note:
      todayOblArr.length > 0
        ? `${todayDoneCount}/${todayOblArr.length} done today`
        : "No obligations today",
  });

  const distractionToday = distractorRows.reduce((a, s) => a + s.todayMin, 0);
  const distractionScore = Math.max(20, Math.round(100 - distractionToday * 1.2));
  healthFactors.push({
    key: "distraction",
    label: "Distraction budget",
    score: distractionScore,
    weight: 0.2,
    note:
      distractionToday > 0
        ? `${distractionToday}min on distraction-heavy sites`
        : "No big distractors today",
  });

  const momentumTarget = Math.max(weekPlanned, 450);
  const momentumScore = Math.round(Math.min(100, (weekFocused / momentumTarget) * 100));
  healthFactors.push({
    key: "momentum",
    label: "Week momentum",
    score: momentumScore,
    weight: 0.15,
    note: `${Math.round(weekFocused / 60)}h focused this week`,
  });

  const totalWeight = healthFactors.reduce((a, f) => a + f.weight, 0);
  const healthScore = Math.max(
    0,
    Math.min(100, Math.round(healthFactors.reduce((a, f) => a + f.score * f.weight, 0) / totalWeight))
  );

  return {
    todayISO: todayISOStr,
    days,
    today,
    weekFocused,
    weekPlanned,
    weekSites,
    todaySites: todaySitesTotal,
    todayDistracted: today.distractedMin,
    sites,
    categoryTotals,
    goalProgress,
    todaySlots,
    todayObligations: { total: todayOblArr.length, done: todayDoneCount },
    weekObligations: { total: obligations.length, done: weekDoneCount },
    bestFocusDay: bestFocus,
    topDistractor,
    topWorkSite,
    healthScore,
    healthFactors,
    morningMin,
    eveningMin,
    todayFocused: today.focusedMin,
    todayPlanned: today.plannedMin,
  };
}