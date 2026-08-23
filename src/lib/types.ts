export type Priority = "low" | "medium" | "high" | "critical";
export type GoalStatus = "active" | "done" | "paused";

export interface Subgoal {
  id: string;
  title: string;
  estimatedMinutes: number;
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  /** ISO date yyyy-MM-dd */
  deadline: string;
  priority: Priority;
  color: string;
  status: GoalStatus;
  /** hours/week the user plans to invest */
  weeklyHours: number;
  createdAt: number;
  subgoals: Subgoal[];
}

/** 0 = Monday ... 6 = Sunday */
export type DayIndex = number;

export interface Obligation {
  id: string;
  title: string;
  day: DayIndex;
  /** 24h "HH:mm" */
  start: string;
  end: string;
  color: string;
  notes?: string;
}

export type SlotKind = "obligation" | "task" | "break";

export interface Slot {
  id: string;
  day: DayIndex;
  start: string;
  end: string;
  kind: SlotKind;
  title: string;
  goalId?: string;
  obligationId?: string;
  locked: boolean;
  done: boolean;
  color?: string;
  notes?: string;
}

export interface WeekPlan {
  /** ISO date of the Monday of this week */
  start: string;
  slots: Slot[];
  generatedAt?: number;
  source?: "ai" | "rules";
}

export interface FocusSession {
  id: string;
  /** epoch ms */
  start: number;
  end: number;
  kind: "focus" | "distracted";
  title?: string;
  goalId?: string;
}

export type SiteCategory =
  | "Work"
  | "Learning"
  | "Social"
  | "Entertainment"
  | "News"
  | "Shopping"
  | "Other";

export interface SiteStat {
  domain: string;
  /** map "yyyy-MM-dd" -> seconds active */
  history: Record<string, number>;
  lastVisited?: number;
}

export interface ActiveTimer {
  startedAt: number;
  /** seconds accrued before last pause */
  accumSeconds: number;
  paused: boolean;
  pausedAt?: number;
  title?: string;
  goalId?: string;
}

export interface AppPrefs {
  dayStart: string;
  dayEnd: string;
  deepWorkStart: string;
  deepWorkEnd: string;
  maxWorkHours: number;
  breakEveryMinutes: number;
  breakMinutes: number;
  focusBlockMinutes: number;
  includeLunch: boolean;
}

export type AIProvider = "gemini" | "openai" | "openrouter" | "custom";

export interface AISettings {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
}

export interface Toast {
  id: string;
  title: string;
  message?: string;
  tone: "success" | "error" | "warn" | "info";
}

export interface AppState {
  goals: Goal[];
  obligations: Obligation[];
  /** weekStartKey -> plan */
  weeks: Record<string, WeekPlan>;
  sessions: FocusSession[];
  siteStats: SiteStat[];
  timer: ActiveTimer | null;
  prefs: AppPrefs;
  settings: AISettings;
  toasts: Toast[];

  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  addSubgoal: (goalId: string, sub: Subgoal) => void;
  addSubgoals: (goalId: string, subs: Subgoal[]) => void;
  toggleSubgoal: (goalId: string, subId: string) => void;
  removeSubgoal: (goalId: string, subId: string) => void;

  addObligation: (o: Obligation) => void;
  updateObligation: (id: string, patch: Partial<Obligation>) => void;
  removeObligation: (id: string) => void;

  setWeek: (week: WeekPlan) => void;
  clearWeek: (start: string) => void;
  toggleSlotDone: (weekStart: string, slotId: string) => void;
  addSlot: (weekStart: string, slot: Slot) => void;
  updateSlot: (weekStart: string, slotId: string, patch: Partial<Slot>) => void;
  removeSlot: (weekStart: string, slotId: string) => void;

  addSession: (s: FocusSession) => void;
  startTimer: (title?: string, goalId?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  cancelTimer: () => void;
  stopTimer: (save: boolean, title?: string, goalId?: string) => void;

  setSiteStats: (stats: SiteStat[]) => void;

  updatePrefs: (patch: Partial<AppPrefs>) => void;
  updateSettings: (patch: Partial<AISettings>) => void;

  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;

  resetAll: () => void;
  importJson: (json: string) => boolean;
}