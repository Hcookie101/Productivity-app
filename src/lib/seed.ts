import { startOfISOWeek, subDays } from "date-fns";
import { DEFAULT_PREFS, GOAL_COLORS } from "./constants";
import { formatDateISO, uid } from "./utils";
import { generatePlan } from "./scheduler";
import type {
  AppPrefs,
  FocusSession,
  Goal,
  Obligation,
  SiteStat,
  WeekPlan,
} from "./types";

export const PREFS: AppPrefs = { ...DEFAULT_PREFS };

function makeGoal(
  id: string,
  title: string,
  description: string,
  daysFromNow: number,
  priority: Goal["priority"],
  weeklyHours: number,
  color: string,
  subgoals: { title: string; minutes: number; done: boolean }[]
): Goal {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromNow);
  return {
    id,
    title,
    description,
    deadline: formatDateISO(d),
    priority,
    color,
    status: "active",
    weeklyHours,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
    subgoals: subgoals.map((s) => ({
      id: uid("sub"),
      title: s.title,
      estimatedMinutes: s.minutes,
      done: s.done,
    })),
  };
}

function sub(title: string, minutes: number, done: boolean) {
  return { title, minutes, done };
}

export function seedGoals(): Goal[] {
  return [
    makeGoal("goal-1", "Ship my portfolio website", "Show off my work and land my first client.", 18, "high", 4, GOAL_COLORS[0], [
      sub("Sketch structure & moodboard", 90, true),
      sub("Build the landing page", 150, true),
      sub("Write 3 project case studies", 120, false),
      sub("Polish responsive + dark mode", 90, false),
      sub("Deploy & send to a mentor", 45, false),
    ]),
    makeGoal("goal-2", "Learn TypeScript deeply", "Become confident writing typed code at work.", 40, "medium", 3, GOAL_COLORS[1], [
      sub("Structural typing & narrowing", 90, true),
      sub("Generics practice set", 120, false),
      sub("Type-safe fetch layer", 90, false),
      sub("Build a typed mini-app", 240, false),
    ]),
    makeGoal("goal-3", "Run a 5K without stopping", "Couch to 5K at a healthy pace.", 28, "high", 2, GOAL_COLORS[2], [
      sub("Route + stretch habit", 60, true),
      sub("Run 3 × 15 minutes", 120, false),
      sub("Interval training ×2", 120, false),
      sub("Full course without walking", 90, false),
    ]),
    makeGoal("goal-4", "Read 12 books", "Books over reels this quarter.", 60, "low", 2, GOAL_COLORS[3], [
      sub("Pick the TBR list", 30, true),
      sub("Read books 1–4", 200, false),
      sub("Notes & monthly recap", 60, false),
    ]),
  ];
}

export function seedObligations(): Obligation[] {
  const mk = (
    id: string,
    title: string,
    day: number,
    start: string,
    end: string,
    color: string
  ): Obligation => ({ id, title, day, start, end, color });
  return [
    mk("ob-standup", "Team standup", 0, "09:00", "09:15", "#38bdf8"),
    mk("ob-standup-2", "Team standup", 1, "09:00", "09:15", "#38bdf8"),
    mk("ob-standup-3", "Team standup", 2, "09:00", "09:15", "#38bdf8"),
    mk("ob-standup-4", "Team standup", 3, "09:00", "09:15", "#38bdf8"),
    mk("ob-standup-5", "Team standup", 4, "09:00", "09:15", "#38bdf8"),
    mk("ob-sync-1", "Group sync", 1, "14:00", "14:30", "#a78bfa"),
    mk("ob-sync-2", "Group sync", 3, "14:00", "14:30", "#a78bfa"),
    mk("ob-gym-1", "Gym", 0, "18:00", "19:00", "#2dd4bf"),
    mk("ob-gym-2", "Gym", 2, "18:00", "19:00", "#2dd4bf"),
    mk("ob-gym-3", "Gym", 4, "18:00", "19:00", "#2dd4bf"),
    mk("ob-spanish", "Spanish class", 1, "19:00", "20:00", "#f59e0b"),
    mk("ob-prep", "Meal prep", 6, "11:00", "12:30", "#34d399"),
    mk("ob-call", "Family call", 6, "18:30", "19:00", "#fb7185"),
  ];
}

/** Generate clean plans for the current week and last week. */
export function seedWeeks(obligations: Obligation[], goals: Goal[]): Record<string, WeekPlan> {
  const weeks: Record<string, WeekPlan> = {};
  const thisMonday = startOfISOWeek(new Date());
  const lastMonday = subDays(thisMonday, 7);
  for (const start of [lastMonday, thisMonday]) {
    const plan = generatePlan({ obligations, goals, prefs: PREFS, weekStart: start, mode: "full" });
    weeks[formatDateISO(start)] = {
      start: formatDateISO(start),
      slots: plan.slots,
      generatedAt: Date.now(),
      source: "rules",
    };
  }
  return weeks;
}

export interface SeedBundle {
  goals: Goal[];
  obligations: Obligation[];
  weeks: Record<string, WeekPlan>;
  sessions: FocusSession[];
  siteStats: SiteStat[];
}

/**
 * Seeds goals/obligations/schedule only. Stats (focus sessions & browsing)
 * intentionally start EMPTY — real data comes from the focus timer and the
 * Chrome extension.
 */
export function seedBundle(): SeedBundle {
  const goals = seedGoals();
  const obligations = seedObligations();
  return {
    goals,
    obligations,
    weeks: seedWeeks(obligations, goals),
    sessions: [],
    siteStats: [],
  };
}