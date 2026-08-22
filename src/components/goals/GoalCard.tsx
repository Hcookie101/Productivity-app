"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, Sparkles, Plus } from "lucide-react";
import type { Goal } from "@/lib/types";
import { PRIORITIES } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { ProgressBar } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

function daysLeft(deadline: string): number {
  const d = new Date(deadline + "T00:00:00");
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
}

export function GoalCard({
  goal,
  onEdit,
  onAiBreakdown,
}: {
  goal: Goal;
  onEdit: (g: Goal) => void;
  onAiBreakdown: (g: Goal) => void;
}) {
  const toggleSubgoal = useStore((s) => s.toggleSubgoal);
  const removeSubgoal = useStore((s) => s.removeSubgoal);
  const removeGoal = useStore((s) => s.removeGoal);
  const addSubgoal = useStore((s) => s.addSubgoal);
  const [newSub, setNewSub] = useState("");
  const total = goal.subgoals.length;
  const done = goal.subgoals.filter((s) => s.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const left = daysLeft(goal.deadline);
  const priority = PRIORITIES.find((p) => p.value === goal.priority) ?? PRIORITIES[0];

  const urgency =
    left === 0
      ? { label: "Due today", cls: "bg-rose-500/15 text-rose-300" }
      : left <= 7
        ? { label: `${left}d left`, cls: "bg-rose-500/15 text-rose-300" }
        : left <= 21
          ? { label: `${left}d left`, cls: "bg-amber-500/15 text-amber-300" }
          : { label: `${left}d left`, cls: "bg-white/[0.06] text-muted" };

  const submitSub = () => {
    const t = newSub.trim();
    if (!t) return;
    addSubgoal(goal.id, {
      id: `sub-${Date.now()}`,
      title: t,
      estimatedMinutes: 30,
      done: false,
    });
    setNewSub("");
  };

  return (
    <div className="app-card hover-lift overflow-hidden">
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${goal.color}, transparent)` }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-full"
              style={{ background: goal.color, boxShadow: `0 0 12px ${goal.color}88` }}
            />
            <div className="min-w-0">
              <h3 className="font-display text-[17px] font-semibold leading-6 text-ink">{goal.title}</h3>
              {goal.description ? (
                <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-muted">{goal.description}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => onAiBreakdown(goal)}
              title="AI: break it down"
              className="rounded-lg p-1.5 text-iris-soft transition hover:bg-iris/10 hover:scale-105"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              onClick={() => onEdit(goal)}
              title="Edit"
              className="rounded-lg p-1.5 text-muted transition hover:bg-white/[0.06] hover:text-ink"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => removeGoal(goal.id)}
              title="Delete"
              className="rounded-lg p-1.5 text-muted transition hover:bg-rose-500/10 hover:text-rose-300"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge className={urgency.cls}>{urgency.label}</Badge>
          <Badge color={priority.hue}>{priority.label}</Badge>
          <Badge>{goal.weeklyHours}h/wk</Badge>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted">Progress</span>
            <span className="tabular-nums text-faint">
              {done}/{total} · {pct}%
            </span>
          </div>
          <ProgressBar value={pct} color={goal.color} />
        </div>

        <ul className="mt-4 space-y-1">
          {goal.subgoals.map((sub) => (
            <li
              key={sub.id}
              className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition hover:bg-white/[0.03]"
            >
              <button
                onClick={() => toggleSubgoal(goal.id, sub.id)}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-md border transition",
                  sub.done
                    ? "border-emerald-400/60 bg-emerald-500/25 text-emerald-300"
                    : "border-line text-transparent hover:border-iris/50"
                )}
                style={{ width: 18, height: 18 }}
                aria-label="Toggle subgoal"
              >
                <Check className="h-3 w-3" />
              </button>
              <span className={cn("flex-1 text-[13px] leading-5", sub.done ? "text-faint line-through" : "text-muted")}>
                {sub.title}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-faint">{sub.estimatedMinutes}m</span>
              <button
                onClick={() => removeSubgoal(goal.id, sub.id)}
                className="hidden shrink-0 rounded p-0.5 text-faint hover:text-rose-300 group-hover:inline-flex"
                aria-label="Remove subgoal"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitSub();
          }}
          className="mt-3 flex items-center gap-2"
        >
          <input
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            placeholder="Add a subgoal…"
            className="w-full rounded-lg border border-dashed border-line bg-transparent px-3 py-1.5 text-[13px] text-ink placeholder:text-faint focus:border-iris/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newSub.trim()}
            className="rounded-lg bg-white/[0.06] p-2 text-muted transition hover:bg-iris/15 hover:text-iris-soft disabled:opacity-40"
            aria-label="Add subgoal"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}