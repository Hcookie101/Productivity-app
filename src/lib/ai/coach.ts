import type { AISettings, Goal } from "../types";
import { chatJSON, aiConfigured } from "./provider";
import { uid } from "../utils";
import type { StatsBundle } from "../stats";

export type TipKind = "good" | "warn" | "info" | "action";
export type ActionKind = "addBreak" | "addFocus" | "none";

export interface CoachTip {
  id: string;
  title: string;
  detail: string;
  tone: TipKind;
  action?: { label: string; kind: ActionKind; goalId?: string };
}

export interface CoachInput {
  stats: StatsBundle;
  goals: Goal[];
}

export interface CoachResult {
  tips: CoachTip[];
  usedAI: boolean;
}

export function buildCoachContext(input: CoachInput): string {
  const s = input.stats;
  const lines = [
    "STATS (minutes):",
    `- Today focus: ${s.today.focusedMin}m, planned ${s.today.plannedMin}m, done planned ${s.today.plannedDoneMin}m`,
    `- Week focus: ${s.weekFocused}m, week planned: ${s.weekPlanned}m`,
    `- Today sites: ${s.todaySites}m (distraction-heavy: ${s.todayDistracted}m)`,
    `- Morning focus (today so far): ${s.morningMin}m; evening: ${s.eveningMin}m`,
    `- Best focus day (7d): ${s.bestFocusDay?.date ?? "n/a"} (${s.bestFocusDay?.minutes ?? 0}m)`,
    `- Day Health: ${s.healthScore} / 100`,
    `- Obligations today: ${s.todayObligations.done}/${s.todayObligations.total}`,
    "GOALS:",
    ...s.goalProgress.map(
      (g) =>
        `- "${g.goal.title}" ${g.pct}% done, deadline in ${g.daysLeft}d, priority ${g.goal.priority}`
    ),
    "TOP SITES:",
    ...s.sites.slice(0, 6).map((row) => `- ${row.domain} (${row.category}) ${row.todayMin}m today / ${row.weekMin}m week`),
    "DAY SCHEDULE TYPES:",
    `- Tracked focus slots: ${s.todaySlots.filter((x) => x.kind !== "break").length}, breaks: ${s.todaySlots.filter((x) => x.kind === "break").length}`,
  ];
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are Orbit's productivity coach. You know the user's goals, obligations, personal schedule AND their real browsing/focus stats. You give short, sharp, prioritized advice.

Return JSON ONLY:
{"tips":[{"title":"short headline","detail":"1-2 sentences, specific, referencing their real numbers","action":{"label":"button text","kind":"addBreak|addFocus|none","goalId":"optional"}}]}
- 2 to 5 tips.
- Prefer concrete actions over platitudes.
- If things are going well, include one "good" tip acknowledging the streak.`;

export function describeStats(s: StatsBundle): string {
  const focusPct = s.today.plannedMin > 0 ? Math.round((s.today.focusedMin / s.today.plannedMin) * 100) : 0;
  return `Today: ${s.today.focusedMin}m focus of ${s.today.plannedMin}m planned (${focusPct}%). Week: ${Math.round(s.weekFocused / 60)}h focus vs ${Math.round(s.weekPlanned / 60)}h planned. Day Health ${s.healthScore}/100.`;
}

export async function coachWithAI(input: CoachInput, settings: AISettings): Promise<CoachTip[] | null> {
  const parsed = await chatJSON<{ tips?: unknown[] }>(
    settings,
    SYSTEM_PROMPT,
    `Context:\n${buildCoachContext(input)}`,
    { temperature: 0.6 }
  );
  if (!parsed || !Array.isArray(parsed.tips)) return null;
  const tips = parsed.tips
    .map((raw): CoachTip | null => {
      const t = (raw ?? {}) as {
        title?: string;
        detail?: string;
        action?: { label?: string; kind?: string; goalId?: string | null };
      };
      const title = String(t.title ?? "").trim();
      if (!title) return null;
      const act = t.action;
      const kind: ActionKind =
        act?.kind === "addBreak" || act?.kind === "addFocus" ? act.kind : "none";
      return {
        id: uid("tip"),
        title: title.slice(0, 90),
        detail: String(t.detail ?? "").trim().slice(0, 320),
        tone: kind === "none" ? "info" : "action",
        action:
          kind !== "none" && act?.label
            ? { label: act.label, kind, goalId: act.goalId ?? undefined }
            : undefined,
      };
    })
    .filter((t): t is CoachTip => t !== null)
    .slice(0, 6);
  return tips.length ? tips : null;
}

/** Deterministic coach used without an API key (and as a safety net). */
export function rulesCoach(input: CoachInput): CoachTip[] {
  const s = input.stats;
  const tips: CoachTip[] = [];

  const topDistractor = s.topDistractor;
  if (topDistractor && topDistractor.todayMin >= 30) {
    tips.push({
      id: uid("tip"),
      title: `${topDistractor.domain} is eating your focus window`,
      detail: `${topDistractor.todayMin} min today and ${topDistractor.weekMin} min this week. Schedule a focused block right before your usual scroll time and move ${topDistractor.domain} to a 10-min reward after it.`,
      tone: "warn",
      action: { label: "Add a focus block", kind: "addFocus" },
    });
  } else if (topDistractor && topDistractor.weekMin >= 300) {
    tips.push({
      id: uid("tip"),
      title: `${topDistractor.domain}: ${Math.round(topDistractor.weekMin / 60)}h this week`,
      detail: "That's a strong habit loop. Try a 25-min timer with the site on a different device, then a short reward.",
      tone: "info",
    });
  }

  if (s.eveningMin > s.morningMin + 45 && s.morningMin < 45) {
    tips.push({
      id: uid("tip"),
      title: "Your best deep work currently happens in the evening",
      detail: `You logged ${s.morningMin}m of morning focus vs ${s.eveningMin}m in the evening. Your schedule reserves ${"Morning"} for deep work — try one hard pomodoro at 9am for 5 days and watch the week line trend.`,
      tone: "info",
    });
  }

  const urgent = input.goals.find((g) => {
    const left = s.goalProgress.find((p) => p.goal.id === g.id);
    return left?.daysLeft != null && left.daysLeft <= 7 && left.pct < 60;
  });
  if (urgent) {
    const left = s.goalProgress.find((p) => p.goal.id === urgent.id)!;
    tips.push({
      id: uid("tip"),
      title: `"${urgent.title}" needs runway — ${left.daysLeft} days left`,
      detail: `You're at ${left.pct}% with ${left.subDone}/${left.subTotal} subgoals done. One focused block on your strongest day (${s.bestFocusDay?.date ?? "your best day"}) closes the gap fast.`,
      tone: "action",
      action: { label: "Schedule a focus block", kind: "addFocus", goalId: urgent.id },
    });
  }

  const plannedVsActual = s.weekPlanned > 0 ? (s.weekFocused / s.weekPlanned) * 100 : 100;
  if (s.weekPlanned > 0 && plannedVsActual < 65) {
    tips.push({
      id: uid("tip"),
      title: "You planned more than reality allows",
      detail: `You planned ${Math.round(s.weekPlanned / 60)}h of focus this week but delivered ${Math.round(s.weekFocused / 60)}h (${Math.round(plannedVsActual)}%). Trim one focus block per day — a tighter schedule that happens beats a perfect one that doesn't.`,
      tone: "warn",
    });
  }

  const breakCount = s.todaySlots.filter((x) => x.kind === "break").length;
  if (s.today.focusedMin >= 90 && breakCount === 0) {
    tips.push({
      id: uid("tip"),
      title: "No recovery breaks today",
      detail: `You've focused ${s.today.focusedMin}m without a scheduled break. A 15-minute reset every 90 minutes raises quality — and prevents the evening crash.`,
      tone: "info",
      action: { label: "Add a 15m break", kind: "addBreak" },
    });
  }

  if (s.healthScore >= 80) {
    tips.push({
      id: uid("tip"),
      title: "Momentum is real ⚡",
      detail: describeStats(s).replace("Day Health", "Day Health").trim() + " Keep the streak alive — consistency now compounds.",
      tone: "good",
    });
  }

  if (tips.length < 2 && s.sites.length > 0) {
    const busiest = s.sites[0];
    tips.push({
      id: uid("tip"),
      title: `Your dominant click is ${busiest.domain}`,
      detail: `You spent ${busiest.todayMin}m there today. Decide consciously: is it input or escape? If escape, give it a named 20-minute window so it doesn't leak into deep-work hours.`,
      tone: "info",
    });
  }

  return tips.slice(0, 5);
}

export async function generateCoach(input: CoachInput, settings: AISettings): Promise<CoachResult> {
  if (aiConfigured(settings)) {
    try {
      const aiTips = await coachWithAI(input, settings);
      if (aiTips && aiTips.length) return { tips: aiTips, usedAI: true };
    } catch {
      // fall through
    }
  }
  return { tips: rulesCoach(input), usedAI: false };
}

export function coachSummaryFor(input: CoachInput): string {
  return buildCoachContext(input);
}