import type { AISettings, AppPrefs, DayIndex, Goal, Obligation, Slot } from "../types";
import { chatJSON, aiConfigured } from "./provider";
import { generatePlan } from "../scheduler";
import { toMin, fromMin, formatDateISO } from "../time";
import { uid } from "../utils";
import { DAY_LABELS_FULL } from "../constants";

export interface PlanCtx {
  obligations: Obligation[];
  goals: Goal[];
  prefs: AppPrefs;
  weekStart: Date;
  existing: Slot[];
  settings: AISettings;
}

export interface PlanOutcome {
  slots: Slot[];
  summary: string;
  usedAI: boolean;
}

/** Clamp + validate a raw slot coming from an AI response. */
export function sanitizeSlot(raw: unknown, prefs: AppPrefs): Slot | null {
  const r = (raw ?? {}) as {
    id?: string;
    day?: unknown;
    start?: unknown;
    end?: unknown;
    kind?: unknown;
    title?: unknown;
    goalId?: string;
    color?: string;
    locked?: boolean;
  };
  const day =
    typeof r.day === "number" ? Math.round(r.day) : typeof r.day === "string" ? Number(r.day) : NaN;
  if (!Number.isFinite(day) || day < 0 || day > 6) return null;
  const s = toMin(String(r.start ?? ""));
  const e = toMin(String(r.end ?? ""));
  if (!Number.isFinite(s) || !Number.isFinite(e) || e - s < 15) return null;
  const start = Math.max(toMin(prefs.dayStart), s);
  const end = Math.min(toMin(prefs.dayEnd), Math.max(start + 15, e));
  const kind = r.kind === "break" ? "break" : "task";
  const title = String(r.title ?? "").trim() || (kind === "break" ? "Break" : "Focus block");
  return {
    id: typeof r.id === "string" && r.id.length > 0 ? r.id : uid("slot-ai"),
    day: Math.round(day),
    start: fromMin(start),
    end: fromMin(end),
    kind,
    title: title.slice(0, 80),
    goalId: typeof r.goalId === "string" ? r.goalId : undefined,
    color: typeof r.color === "string" ? r.color : kind === "break" ? "#2dd4bf" : undefined,
    locked: !!r.locked,
    done: false,
  };
}

export function obligationSlots(obligations: Obligation[]): Slot[] {
  return obligations.map(
    (o): Slot => ({
      id: `slot-ob-${o.id}`,
      day: o.day,
      start: o.start,
      end: o.end,
      kind: "obligation",
      title: o.title,
      locked: true,
      done: false,
      color: o.color,
      obligationId: o.id,
    })
  );
}

export function ctxDigest(ctx: PlanCtx): string {
  const goals = ctx.goals
    .filter((g) => g.status === "active")
    .map((g) => ({
      id: g.id,
      title: g.title,
      deadline: g.deadline,
      priority: g.priority,
      weeklyHours: g.weeklyHours,
      openSubgoals: g.subgoals.filter((s) => !s.done).length,
    }));
  const obligations = ctx.obligations.map((o) => ({
    title: o.title,
    day: DAY_LABELS_FULL[o.day],
    start: o.start,
    end: o.end,
  }));
  const existing = ctx.existing
    .filter((s) => s.kind !== "obligation")
    .map((s) => ({
      id: s.id,
      day: DAY_LABELS_FULL[s.day],
      start: s.start,
      end: s.end,
      kind: s.kind,
      title: s.title,
      locked: s.locked,
      done: s.done,
    }));
  return JSON.stringify({
    weekStarting: formatDateISO(ctx.weekStart),
    dayStart: ctx.prefs.dayStart,
    dayEnd: ctx.prefs.dayEnd,
    deepWorkWindow: `${ctx.prefs.deepWorkStart}–${ctx.prefs.deepWorkEnd}`,
    maxWorkHoursPerDay: ctx.prefs.maxWorkHours,
    focusBlockMinutes: ctx.prefs.focusBlockMinutes,
    breakMinutes: ctx.prefs.breakMinutes,
    includeLunch: ctx.prefs.includeLunch,
    obligations,
    goals,
    currentPlan: existing,
  });
}

export const SYSTEM_PROMPT = `You are Orbit, an AI time planner. You build a weekly schedule that respects hard obligations and fits the user's goals into the remaining time.

Rules:
- Respect every obligation exactly (day, start, end). Never schedule over an obligation.
- Schedule goal work in productive focus blocks (60-90 min), filling deep-work windows first.
- Insert short breaks between focus blocks, and a lunch break near 12:30 when free.
- Stay inside the configured day window and respect max work hours per day.
- Titles must be short. If you keep an existing slot unchanged, reuse its exact "id".
- Return JSON ONLY:
{"slots":[{"id":"...","day":0,"start":"09:00","end":"10:15","kind":"task|break","title":"...","goalId":"...","locked":false}],"summary":"one short sentence"}
- day 0 = Monday ... 6 = Sunday. Times are 24h "HH:mm".`;

async function aiPlanCall(ctx: PlanCtx): Promise<PlanOutcome | null> {
  const user = `Here is my week + goals. Build the best schedule.\n\n${ctxDigest(ctx)}`;
  const parsed = await chatJSON<{ slots?: unknown[]; summary?: string }>(
    ctx.settings,
    SYSTEM_PROMPT,
    user,
    { temperature: 0.3 }
  );
  if (!parsed || !Array.isArray(parsed.slots)) return null;
  const generated = (parsed.slots.map((s) => sanitizeSlot(s, ctx.prefs)).filter(Boolean) as Slot[]).filter(
    (s) => s.kind !== "obligation"
  );
  if (generated.length === 0) return null;

  const obs = obligationSlots(ctx.obligations);
  const modelIds = new Set(generated.map((s) => s.id));
  const locked = ctx.existing.filter(
    (s) => s.locked && s.kind !== "obligation" && !modelIds.has(s.id)
  );
  const slots = [...obs, ...locked, ...generated].sort(
    (a, b) => a.day - b.day || toMin(a.start) - toMin(b.start)
  );
  return {
    slots,
    summary: parsed.summary?.trim() || "AI rebuilt your week around obligations & goals.",
    usedAI: true,
  };
}

export async function generateWeekPlan(ctx: PlanCtx): Promise<PlanOutcome> {
  if (aiConfigured(ctx.settings)) {
    try {
      const ai = await aiPlanCall(ctx);
      if (ai) return ai;
    } catch {
      // offline path below
    }
  }
  const rulePlan = generatePlan({
    obligations: ctx.obligations,
    goals: ctx.goals,
    prefs: ctx.prefs,
    weekStart: ctx.weekStart,
    existing: ctx.existing,
    mode: "full",
  });
  const obs = obligationSlots(ctx.obligations);
  const slots = [...obs, ...rulePlan.slots.filter((s) => s.kind !== "obligation")].sort(
    (a, b) => a.day - b.day || toMin(a.start) - toMin(b.start)
  );
  return { slots, summary: rulePlan.summary, usedAI: false };
}

/* ---------------- natural language schedule editing ---------------- */

export interface EditOutcome {
  slots: Slot[];
  summary: string;
  usedAI: boolean;
}

const DAY_MAP: { re: RegExp; day: DayIndex }[] = [
  { re: /\bmon(?:day)?\b/i, day: 0 },
  { re: /\btue(?:s|sday)?\b/i, day: 1 },
  { re: /\bwed(?:nesday)?\b/i, day: 2 },
  { re: /\bthu(?:rs|rsday)?\b/i, day: 3 },
  { re: /\bfri(?:day)?\b/i, day: 4 },
  { re: /\bsat(?:urday)?\b/i, day: 5 },
  { re: /\bsun(?:day)?\b/i, day: 6 },
];

export function parseDay(lower: string, todayDow: number): DayIndex | null {
  if (/\btoday\b/.test(lower)) return todayDow;
  if (/\btomorrow\b/.test(lower)) return (todayDow + 1) % 7;
  for (const m of DAY_MAP) if (m.re.test(lower)) return m.day;
  return null; // no day mentioned
}

export function parseTime(lower: string): number | null {
  const keyword: Record<string, number> = {
    morning: 9 * 60,
    afternoon: 14 * 60,
    evening: 18 * 60,
    night: 20 * 60,
    noon: 12 * 60,
    midday: 12 * 60,
  };
  for (const [k, v] of Object.entries(keyword)) {
    if (lower.includes(k)) return v;
  }
  const m = lower.match(/(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b|(?:at\s*)?(\d{1,2}):(\d{2})\b/);
  if (m) {
    const hasPm = /p\.?m\.?/i.test(m[3] ?? "");
    const hasAm = /a\.?m\.?/i.test(m[3] ?? "");
    const h = hasPm ? Number(m[1]) % 12 + 12 : hasAm ? Number(m[1]) % 12 : Number(m[4] ?? m[1]);
    const min = Number(m[2] ?? m[5] ?? 0);
    if (Number.isFinite(h) && h >= 0 && h <= 23) return h * 60 + min;
  }
  const plain = lower.match(/at\s+(\d{1,2})\b/);
  if (plain) {
    let h = Number(plain[1]);
    if (h <= 6) h += 12; // "at 5" -> 5pm
    return Math.min(23, h) * 60;
  }
  return null;
}

export function parseDuration(lower: string): number | null {
  if (/half an hour|\bhalf hour\b/.test(lower)) return 30;
  if (/\ban hour\b|\b1\s*hour/.test(lower)) return 60;
  const m = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h(?!\w))\b|(\d+)\s*(?:minutes?|mins?|min)\b/i);
  if (!m) return null;
  const val = Number(m[1] ?? m[2]);
  if (!Number.isFinite(val) || val <= 0) return null;
  const isHour = !!m[1];
  const mins = isHour ? val * 60 : val;
  return Math.round(mins);
}

function findTarget(text: string, ctx: PlanCtx): Slot | null {
  const candidates = ctx.existing.filter((s) => s.kind !== "obligation");
  let best: Slot | null = null;
  let bestLen = 0;
  for (const s of candidates) {
    const t = s.title.toLowerCase();
    if (t.length > 2 && text.includes(t)) {
      if (t.length > bestLen) {
        best = s;
        bestLen = t.length;
      }
    }
  }
  for (const o of ctx.obligations) {
    const t = o.title.toLowerCase();
    if (t.length > 2 && text.includes(t)) {
      if (t.length > bestLen) {
        best = { ...obligationSlots(ctx.obligations).find((s) => s.obligationId === o.id)! };
        bestLen = t.length;
      }
    }
  }
  return best;
}

function titleFromText(text: string, lower: string, kind: "task" | "break", ctx: PlanCtx): { title: string; goalId?: string; color?: string } {
  // if a goal title is mentioned, attach to it
  for (const g of ctx.goals) {
    if (lower.includes(g.title.toLowerCase())) {
      return { title: g.title, goalId: g.id, color: g.color };
    }
  }
  if (kind === "break") {
    if (/\blunch|dinner|eat\b/.test(lower)) return { title: "Lunch" };
    return { title: "Break" };
  }
  // extract a short phrase minus scheduling words
  const cleaned = text
    .replace(/\b(add|schedule|put|insert|create|block|book|make time for|a|an|the|my|me)\b/gi, " ")
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|today|tomorrow)\b/gi, " ")
    .replace(/\b(at|before|after|around|from|to|duration|for)\b/gi, " ")
    .replace(/(\d{1,2}):(\d{2})|(\d{1,2})\s*(am|pm)|morning|afternoon|evening|noon|night/g, " ")
    .replace(/\b\d+\s*(h|hr|hrs|hour|hours|min|mins|minute|minutes)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter((w) => w.length > 2);
  if (words.length >= 2) {
    const candidate = words.slice(0, 5).join(" ");
    return { title: candidate.charAt(0).toUpperCase() + candidate.slice(1) };
  }
  return { title: "Focus block" };
}

/** The offline, deterministic editor. */
export function rulesEdit(text: string, ctx: PlanCtx): EditOutcome {
  const lower = text.toLowerCase();
  const todayDow = (new Date().getDay() + 6) % 7;
  let slots = ctx.existing.map((s) => ({ ...s }));
  const day = parseDay(lower, todayDow);
  const startMin = parseTime(lower);
  const durMins = parseDuration(lower);
  const target = findTarget(lower, ctx);
  let changed = false;

  // 1) "make [day] lighter / lighter [day]"
  if (/light\w*/i.test(lower) && day !== null && !/(add|make time for)\b/.test(lower)) {
    const before = slots.length;
    slots = slots.filter((s) => !(s.day === day && s.kind !== "obligation" && !s.locked));
    changed = slots.length !== before;
    const lbl = day !== null ? DAY_LABELS_FULL[day] : "";
    return {
      slots,
      summary: changed
        ? `Made ${lbl} lighter — kept obligations, moved focus blocks to other days.`
        : `Nothing to lighten on ${lbl}.`,
      usedAI: false,
    };
  }

  // 2) clear entire week
  if (/(reset|clear|wipe|empty)\b/.test(lower) && /(week|schedule|plan|all)\b/.test(lower)) {
    const before = slots.length;
    slots = slots.filter((s) => s.kind === "obligation" || s.locked);
    changed = slots.length !== before;
    return {
      slots,
      summary: changed
        ? "Cleared the week down to obligations & locked items."
        : "The week was already clear of generated items.",
      usedAI: false,
    };
  }

  // 3) delete / remove / cancel
  if (/(delete|remove|cancel|take off|drop|erase|clear)\b/.test(lower)) {
    if (target && target.kind === "obligation") {
      return {
        slots,
        summary: `"${target.title}" is an obligation — edit it on the Obligations tab instead.`,
        usedAI: false,
      };
    }
    if (target) {
      const before = slots.length;
      slots = slots.filter((s) => s.id !== target.id);
      changed = slots.length !== before;
      return {
        slots,
        summary: changed ? `Removed "${target.title}".` : `Couldn't find "${target.title}" to remove.`,
        usedAI: false,
      };
    }
    if (day !== null) {
      const before = slots.length;
      slots = slots.filter((s) => !(s.day === day && s.kind !== "obligation" && !s.locked));
      changed = slots.length !== before;
      return {
        slots,
        summary: changed
          ? `Removed open focus/breaks on ${DAY_LABELS_FULL[day]}.`
          : `Nothing to remove on ${DAY_LABELS_FULL[day]}.`,
        usedAI: false,
      };
    }
  }

  // 4) move / reschedule / shift
  if (/(move|reschedule|shift|push|drag|swap)\b/.test(lower) && target) {
    const current = slots.find((s) => s.id === target.id) ?? target;
    const newDay = day ?? current.day;
    const newStart = startMin ?? toMin(current.start);
    const dur = durMins ?? Math.max(15, toMin(current.end) - toMin(current.start));
    slots = slots.map((s) =>
      s.id === current.id
        ? { ...s, day: newDay, start: fromMin(newStart), end: fromMin(newStart + dur) }
        : s
    );
    return {
      slots,
      summary: `Moved "${current.title}" to ${DAY_LABELS_FULL[newDay]} at ${formatTime(newStart)} (${dur}m).`,
      usedAI: false,
    };
  }

  // 5) add / schedule / put
  if (/(add|schedule|put|insert|create|block|book|make time for|fit in)\b/.test(lower)) {
    const isBreak = /(break|lunch|coffee|stretch|walk|dinner|eat)\b/.test(lower);
    const { title, goalId, color } = titleFromText(text, lower, isBreak ? "break" : "task", ctx);
    const dayTarget = day ?? todayDow;
    const start = startMin ?? (isBreak ? 15 * 60 : 9 * 60);
    const dur = durMins ?? (isBreak ? 15 : 60);
    const newSlot: Slot = {
      id: uid("slot-edit"),
      day: dayTarget,
      start: fromMin(start),
      end: fromMin(Math.min(23 * 60, start + dur)),
      kind: isBreak ? "break" : "task",
      title,
      goalId,
      color: color ?? (isBreak ? "#2dd4bf" : undefined),
      locked: false,
      done: false,
    };
    slots = [...slots, newSlot];
    return {
      slots,
      summary: `Added "${title}" (${dur}m) on ${DAY_LABELS_FULL[dayTarget]} at ${formatTime(start)}.`,
      usedAI: false,
    };
  }

  return {
    slots,
    summary:
      "I didn't catch that. Try:\n• move Gym to Thursday 6pm\n• add a 30 min break at 3pm on Tuesday\n• make Friday lighter",
    usedAI: false,
  };
}

function formatTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

async function aiEditCall(text: string, ctx: PlanCtx): Promise<EditOutcome | null> {
  const system = `${SYSTEM_PROMPT}\n\nYou are editing an existing plan. Apply the user's instruction. Keep ids of unchanged slots. Return JSON with the FULL new slot list.`;
  const user = `Current plan:\n${ctxDigest(ctx)}\n\nUser instruction: "${text}"\n\nReturn {"slots":[...],"summary":"short confirmation"}`;
  const parsed = await chatJSON<{ slots?: unknown[]; summary?: string }>(ctx.settings, system, user, {
    temperature: 0.2,
  });
  if (!parsed || !Array.isArray(parsed.slots)) return null;
  const generated = (parsed.slots.map((s) => sanitizeSlot(s, ctx.prefs)).filter(Boolean) as Slot[]).filter(
    (s) => s.kind !== "obligation"
  );
  if (generated.length === 0) return null;
  const obs = obligationSlots(ctx.obligations);
  const slots = [...obs, ...generated].sort((a, b) => a.day - b.day || toMin(a.start) - toMin(b.start));
  const summary = parsed.summary?.trim() || "Updated the schedule.";
  return { slots, summary, usedAI: true };
}

export async function editScheduleByText(text: string, ctx: PlanCtx): Promise<EditOutcome> {
  if (aiConfigured(ctx.settings)) {
    try {
      const ai = await aiEditCall(text, ctx);
      if (ai) return ai;
    } catch {
      // offline fallback
    }
  }
  return rulesEdit(text, ctx);
}