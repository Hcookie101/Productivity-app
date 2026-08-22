import type { AppPrefs, Goal, Obligation, Slot, SlotKind, DayIndex } from "./types";
import { toMin, fromMin } from "./time";
import { uid } from "./utils";

export interface PlanInput {
  obligations: Obligation[];
  goals: Goal[];
  prefs: AppPrefs;
  weekStart: Date;
  existing?: Slot[];
  /** "full" regenerates tasks/breaks but keeps locked items; "refill" keeps all non-obligation slots */
  mode?: "full" | "refill";
}

export interface PlanResult {
  slots: Slot[];
  summary: string;
}

interface FreeRange {
  start: number;
  end: number;
}

const mins = (clock: string): number => toMin(clock);

function mkSlot(
  kind: SlotKind,
  day: DayIndex,
  start: string,
  end: string,
  title: string,
  extra: Partial<Omit<Slot, "id" | "day" | "start" | "end" | "kind" | "title">> = {}
): Slot {
  return {
    id: uid(`slot-${kind}`),
    day,
    start,
    end,
    kind,
    title,
    locked: false,
    done: false,
    ...extra,
  };
}

/** Compute contiguous free windows given occupied intervals. */
export function freeRanges(
  occupied: { start: number; end: number }[],
  dayStart: number,
  dayEnd: number
): FreeRange[] {
  if (occupied.length === 0) return [{ start: dayStart, end: dayEnd }];
  const sorted = occupied
    .map((o) => ({
      start: Math.max(dayStart, Math.min(dayEnd, o.start)),
      end: Math.max(dayStart, Math.min(dayEnd, o.end)),
    }))
    .filter((o) => o.end > o.start)
    .sort((a, b) => a.start - b.start);
  const ranges: FreeRange[] = [];
  let cursor = dayStart;
  for (const ob of sorted) {
    if (ob.start > cursor + 5) ranges.push({ start: cursor, end: ob.start });
    cursor = Math.max(cursor, ob.end);
    if (cursor >= dayEnd) break;
  }
  if (cursor < dayEnd - 5) ranges.push({ start: cursor, end: dayEnd });
  return ranges;
}

interface GoalLoad {
  goal: Goal;
  weeklyMins: number;
  pendingMins: number;
}

/** Place one day's worth of focus chunks into free ranges with automatic breaks. */
function placeDaily(
  day: DayIndex,
  ranges: FreeRange[],
  queue: { mins: number; ref: GoalLoad }[],
  prefs: AppPrefs,
  out: Slot[],
  capMinutes: number
): void {
    let placed = 0;
  const dwStart = mins(prefs.deepWorkStart);

  for (const range of ranges) {
    if (queue.length === 0) break;
    let cursor = range.start;
    // nudge the first chunk into the deep-work window when it's close by
    if (dwStart > cursor && dwStart < range.end && dwStart - cursor < 60) cursor = dwStart;

    while (queue.length > 0 && range.end - cursor >= 20) {
      if (placed >= capMinutes) return;
      const q = queue.shift()!;
      if (q.ref.pendingMins < 20) continue;
      const len = Math.max(
        20,
        Math.min(prefs.focusBlockMinutes, q.mins, q.ref.pendingMins, range.end - cursor, capMinutes - placed)
      );
      if (len < 15) continue;
      out.push(
        mkSlot("task", day, fromMin(cursor), fromMin(cursor + len), q.ref.goal.title, {
          goalId: q.ref.goal.id,
          color: q.ref.goal.color,
        })
      );
      placed += len;
      q.mins -= len;
      q.ref.pendingMins -= len;
      cursor += len;
      if (q.mins >= 20 || q.ref.pendingMins >= 20) queue.push(q);
      // a short break between focus chunks
      if (queue.length > 0 && range.end - cursor >= prefs.breakMinutes + 25) {
        out.push(
          mkSlot("break", day, fromMin(cursor), fromMin(cursor + prefs.breakMinutes), "Break", {
            color: "#2dd4bf",
          })
        );
        cursor += prefs.breakMinutes;
      }
    }
  }
}

/** The deterministic planner: obligations are pinned, goal work fills the rest. */
export function generatePlan(input: PlanInput): PlanResult {
  const { obligations, goals, prefs, existing = [], mode = "full", weekStart } = input;
  const dayStart = mins(prefs.dayStart);
  const dayEnd = mins(prefs.dayEnd);
  const maxWork = Math.max(30, prefs.maxWorkHours * 60);
  void weekStart;

  const slots: Slot[] = [];

  // 1) obligations are hard invariants -> locked slots
  for (const o of obligations) {
    slots.push(
      mkSlot("obligation", o.day, o.start, o.end, o.title, {
        color: o.color,
        locked: true,
        obligationId: o.id,
      })
    );
  }

  // 2) preserved manual slots (respect locks & the done flag)
  const obligationIds = new Set(obligations.map((o) => o.id));
  const preserved = existing.filter((s) => {
    if (s.kind === "obligation") return false; // obligations are rebuilt above
    if (s.obligationId && obligationIds.has(s.obligationId)) return false;
    if (mode === "refill") return true;
    return s.locked || s.done;
  });
  for (const k of preserved) slots.push({ ...k });

  // 3) goal loads (weekly minutes each active goal wants)
  const activeGoals = goals.filter((g) => g.status === "active");
  const loads: GoalLoad[] = activeGoals.map((goal) => {
    const weekly =
      goal.weeklyHours > 0
        ? goal.weeklyHours * 60
        : Math.max(45, goal.subgoals.filter((s) => !s.done).length * 45);
    return { goal, weeklyMins: weekly, pendingMins: weekly };
  });

  const occupiedFor = (day: DayIndex) =>
    slots
      .filter((s) => s.day === day && s.kind !== "break")
      .map((s) => ({ start: mins(s.start), end: mins(s.end) }));

  const addLunch = (day: DayIndex) => {
    if (!prefs.includeLunch) return;
    const lS = mins("12:30");
    const lE = mins("13:00");
    const occ = occupiedFor(day);
    if (lS >= dayStart && lE <= dayEnd && !occ.some((o) => lS < o.end && o.start < lE)) {
      slots.push(mkSlot("break", day, "12:30", "13:00", "Lunch", { color: "#2dd4bf" }));
    }
  };

  const placeDay = (day: DayIndex, cap: number, weeklyShare: boolean) => {
    addLunch(day);
    const ranges = freeRanges(occupiedFor(day), dayStart, dayEnd);
    const pool = loads.filter((g) => g.pendingMins > 0);
    if (pool.length === 0) return;
    const queue = pool
      .map((ref) => {
        const share = weeklyShare
          ? Math.min(ref.pendingMins, Math.max(30, Math.round(ref.weeklyMins / 5)))
          : Math.min(ref.pendingMins, 240);
        return { mins: share, ref };
      })
      .filter((q) => q.mins >= 20);
    placeDaily(day, ranges, queue, prefs, slots, cap);
  };

  // 3) weekdays: one fifth of each goal's weekly load per day
  const workdays: DayIndex[] = [0, 1, 2, 3, 4];
  for (const day of workdays) placeDay(day, maxWork, true);

  // 4) weekend spillover for anything that didn't fit
  const leftover = loads.reduce((sum, g) => sum + g.pendingMins, 0);
  if (leftover > 30) {
    for (const day of [5, 6] as DayIndex[]) {
      if (loads.every((g) => g.pendingMins <= 0)) break;
      placeDay(day, Math.min(maxWork, 240), false);
    }
  }

  // 5) tidy ordering
  slots.sort((a, b) => a.day - b.day || mins(a.start) - mins(b.start));

  const taskMin = slots
    .filter((s) => s.kind === "task")
    .reduce((sum, s) => sum + (mins(s.end) - mins(s.start)), 0);
  const breaks = slots.filter((s) => s.kind === "break").length;

  const summary =
    "Protected " +
    obligations.length +
    " obligations; scheduled " +
    activeGoals.length +
    " goals (~" +
    Math.max(1, Math.round(taskMin / 60)) +
    "h deep work) with " +
    breaks +
    " breaks & buffer time.";

  return { slots, summary };
}