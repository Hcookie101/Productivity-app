"use client";

import { useState } from "react";
import { Target, Plus, Sparkles, TrendingUp } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import type { Goal } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalFormModal } from "@/components/goals/GoalFormModal";
import { AiSubgoalsModal } from "@/components/goals/AiSubgoalsModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";

export default function GoalsPage() {
    const goals = useStore(useShallow((s) => s.goals.filter((g) => g.status !== "done")));
  const doneGoals = useStore((s) => s.goals.filter((g) => g.status === "done").length);
  const aiConfigured = useStore((s) => s.settings.apiKey.trim().length > 8);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [aiGoal, setAiGoal] = useState<Goal | null>(null);

  const totalSub = useStore((s) => {
    let done = 0;
    let all = 0;
    for (const g of s.goals) {
      for (const su of g.subgoals) {
        all++;
        if (su.done) done++;
      }
    }
    return all ? Math.round((done / all) * 100) : 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-widest text-iris-soft">Objectives</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">Goals</h1>
          <p className="mt-1 text-sm text-muted">
            Big outcomes, broken into checkpoints you can actually do today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!aiConfigured ? (
            <p className="hidden text-xs text-faint sm:block">✨ AI breakdowns use a built-in rules engine</p>
          ) : null}
          <Button
            onClick={() => {
              const first = goals[0];
              if (!first) {
                toast("Add a goal first", "Create a goal, then ask AI to break it down.", "warn");
                return;
              }
              setAiGoal(first);
            }}
            variant="outline"
            icon={<Sparkles className="h-4 w-4" />}
          >
            AI breakdown
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            icon={<Plus className="h-4 w-4" />}
          >
            New goal
          </Button>
        </div>
      </div>

      {goals.length > 0 ? (
        <>
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/[0.03] px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 text-sm text-muted">
              Overall checkpoint completion is <strong className="text-ink">{totalSub}%</strong>
              {doneGoals > 0 ? ` — you've closed ${doneGoals} goal${doneGoals === 1 ? "" : "s"} 🎉` : ""}.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onEdit={(goal) => {
                  setEditing(goal);
                  setFormOpen(true);
                }}
                onAiBreakdown={(goal) => setAiGoal(goal)}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Target className="h-6 w-6" />}
          title="Set your first goal"
          subtitle="Name the outcome, pick a deadline, and Orbit's AI will turn it into a schedule of small wins."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              icon={<Plus className="h-4 w-4" />}
            >
              Create a goal
            </Button>
          }
        />
      )}

      <GoalFormModal open={formOpen} onClose={() => setFormOpen(false)} goal={editing} />
      <AiSubgoalsModal goal={aiGoal} open={!!aiGoal} onClose={() => setAiGoal(null)} />
    </div>
  );
}