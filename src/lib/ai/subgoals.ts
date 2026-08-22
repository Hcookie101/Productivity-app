import type { AISettings, Goal, Subgoal } from "../types";
import { chatJSON, aiConfigured } from "./provider";
import { uid } from "../utils";

interface RawSubgoals {
  subgoals?: { title?: string; estimatedMinutes?: number }[];
}

export interface SubgoalPlan {
  subgoals: Subgoal[];
  usedAI: boolean;
  note?: string;
}

const SYSTEM_PROMPT = `You are Orbit, a productivity AI that breaks big goals into small, concrete subgoals.

Rules:
- Return JSON only: {"subgoals":[{"title":"...","estimatedMinutes":number}]}
- 3 to 6 subgoals, each actionable in a single sitting.
- Keep titles short and specific (max ~60 chars). No numbered prefixes.
- estimatedMinutes between 15 and 240.`;

function buildPrompt(goal: Goal): string {
  const undone = goal.subgoals.filter((s) => !s.done).length;
  const deadline = goal.deadline ?? "no deadline";
  return [
    `Goal: "${goal.title}"`,
    goal.description ? `Context: ${goal.description}` : "",
    `Priority: ${goal.priority}`,
    `Deadline: ${deadline}`,
    `Already broken into ${goal.subgoals.length} subgoals (${undone} undone).`,
    "",
    "Decompose this goal into fresh, non-overlapping subgoals a person could complete. Prefer verbs. Advanced version if deadline is soon.",
  ].join("\n");
}

function clampMin(mark: number): number {
  return Math.max(15, Math.min(180, Math.round(mark)));
}

/** Heuristic decomposition — used when no API key is set or the AI call fails. */
export function fallbackSubgoals(goal: Goal): Subgoal[] {
  const t = goal.title.toLowerCase();
  const daysLeft = goal.deadline
    ? Math.max(1, Math.ceil((new Date(goal.deadline + "T00:00:00").getTime() - Date.now()) / 86_400_000))
    : 30;

  type Template = { test: RegExp; steps: string[]; base: number };
  const templates: Template[] = [
    {
      test: /(write|blog|article|book|report|essay|paper|newsletter)/,
      steps: [
        "Outline the key sections & story arc",
        "Draft the first complete version",
        "Self-edit for clarity and flow",
        "Get one round of outside feedback",
        "Final polish, publish or share",
      ],
      base: 60,
    },
    {
      test: /(build|develop|create|app|website|site|software|feature|tool)/,
      steps: [
        "Sketch the architecture and scope",
        "Set up the environment & skeleton",
        "Build the core working feature",
        "Write a smoke test suite",
        "QA, fix bugs, and ship",
      ],
      base: 90,
    },
    {
      test: /(learn|study|master|understand|course|typescript|python|math)/,
      steps: [
        "Gather best resources & make a plan",
        "Work through the fundamentals",
        "Practice with real exercises",
        "Teach someone or write summary notes",
        "Build one small final project",
      ],
      base: 45,
    },
    {
      test: /(run|train|fitness|gym|marathon|5k|habit|weight)/,
      steps: [
        "Set your baseline & gear/tools",
        "Week 1–2: build the routine",
        "Week 3–4: push the intensity",
        "Taper and recover before the target",
        "Log results and reassess",
      ],
      base: 45,
    },
    {
      test: /(save|money|budget|invest|debt|trade)/,
      steps: [
        "Review current numbers",
        "Set a specific saving target per week",
        "Set up automatic money movement",
        "Review progress bi-weekly",
        "Trim your top unnecessary cost",
      ],
      base: 30,
    },
  ];

  const tmpl = templates.find((x) => x.test.test(t)) ?? {
    steps: [
      "Research and define success",
      "Break the problem into parts",
      "Do the first real pass",
      "Review, refine, and iterate",
      "Finish and reflect",
    ],
    base: 60,
  };
  const urgencyScale = daysLeft < 14 ? 0.85 : daysLeft > 60 ? 1.25 : 1;
  return tmpl.steps.map((step, i) => ({
    id: uid("sub"),
    title: step,
    estimatedMinutes: clampMin(tmpl.base * (1 + i * 0.15) * urgencyScale),
    done: false,
  }));
}

export async function generateSubgoals(
  goal: Goal,
  settings: AISettings
): Promise<SubgoalPlan> {
  if (aiConfigured(settings)) {
    try {
      const parsed = await chatJSON<RawSubgoals>(settings, SYSTEM_PROMPT, buildPrompt(goal), {
        temperature: 0.5,
      });
      if (parsed && Array.isArray(parsed.subgoals) && parsed.subgoals.length > 0) {
        const subs = parsed.subgoals
          .filter((s) => s.title && s.title.trim().length > 1)
          .slice(0, 6)
          .map((s) => ({
            id: uid("sub"),
            title: s.title!.trim(),
            estimatedMinutes: clampMin(s.estimatedMinutes ?? 45),
            done: false,
          }));
        if (subs.length) {
          return { subgoals: subs, usedAI: true, note: "Generated with your AI model." };
        }
      }
    } catch {
      // fall through to rules
    }
  }
  return {
    subgoals: fallbackSubgoals(goal),
    usedAI: false,
    note: "Generated with the built-in breakdown engine (add an AI key in Settings for richer output).",
  };
}