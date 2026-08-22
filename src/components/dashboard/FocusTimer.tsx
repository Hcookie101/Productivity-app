"use client";

import { useState } from "react";
import { Play, Pause, Zap } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore, timerElapsed } from "@/lib/store";
import { useNow } from "@/components/ui/useNow";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

function fmtClock(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function FocusTimer() {
  const now = useNow(500);
  const timer = useStore((s) => s.timer);
    const goals = useStore(useShallow((s) => s.goals.filter((g) => g.status === "active")));
  const { startTimer, pauseTimer, resumeTimer, stopTimer } = useStore.getState();
  const [goalId, setGoalId] = useState("");

  const running = !!timer;
  const elapsed = timerElapsed(timer, now.getTime());
  const minutes = Math.floor(elapsed / 60);

  return (
    <div className="app-card flex h-full flex-col p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px] font-semibold text-ink">Focus timer</h3>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            running ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.06] text-faint"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", running ? "animate-pulse bg-emerald-400" : "bg-faint")} />
          {running ? "Focusing" : "Idle"}
        </span>
      </div>

      <div className="my-6 text-center">
        <div className="font-display text-6xl font-bold tabular-nums tracking-tight text-ink [text-shadow:0_0_30px_rgba(139,108,255,0.35)]">
          {fmtClock(elapsed)}
        </div>
        <p className="mt-2 text-[13px] text-muted">
          {minutes} minute{minutes === 1 ? "" : "s"} elapsed
        </p>
      </div>

      {!running && (
        <Select
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
          className="mb-4"
          aria-label="Link focus to a goal"
        >
          <option value="">General deep work</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </Select>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-center gap-3">
        {running ? (
          <>
            <Button
              variant={timer?.paused ? "primary" : "subtle"}
              size="lg"
              onClick={timer?.paused ? () => resumeTimer() : () => pauseTimer()}
              icon={timer?.paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            >
              {timer?.paused ? "Resume" : "Pause"}
            </Button>
            {timer?.paused ? (
              <Button variant="ghost" size="md" onClick={() => stopTimer(false)}>
                Discard
              </Button>
            ) : (
              <Button
                variant="success"
                size="lg"
                onClick={() => stopTimer(true)}
                icon={<Zap className="h-5 w-5" />}
              >
                Save session
              </Button>
            )}
          </>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={() => startTimer(undefined, goalId || undefined)}
            icon={<Play className="h-5 w-5" />}
          >
            Start focus session
          </Button>
        )}
      </div>
    </div>
  );
}