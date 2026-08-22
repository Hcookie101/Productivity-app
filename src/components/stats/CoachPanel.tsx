"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, RefreshCw, Zap, Coffee } from "lucide-react";
import type { CoachTip } from "@/lib/ai/coach";
import { generateCoach, type CoachInput } from "@/lib/ai/coach";
import { useStore } from "@/lib/store";
import { toMin, fromMin, formatDateISO } from "@/lib/time";
import { mondayOf } from "@/lib/stats";
import { uid } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<CoachTip["tone"], string> = {
  good: "border-emerald-400/25 bg-emerald-500/[0.06]",
  warn: "border-amber-400/25 bg-amber-500/[0.06]",
  info: "border-sky-400/25 bg-sky-500/[0.05]",
  action: "border-iris/30 bg-iris/[0.07]",
};

export function CoachPanel({ input }: { input: CoachInput }) {
  const settings = useStore((s) => s.settings);
  const goals = useStore((s) => s.goals);
  const prefs = useStore((s) => s.prefs);
  const weeks = useStore((s) => s.weeks);
  const addSlot = useStore((s) => s.addSlot);

  const [tips, setTips] = useState<CoachTip[]>([]);
  const [usedAI, setUsedAI] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const result = await generateCoach(input, settings);
        if (!cancelled) {
          setTips(result.tips);
          setUsedAI(result.usedAI);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    reloadToken,
    input.stats.healthScore,
    input.stats.today.focusedMin,
    input.stats.weekFocused,
    settings.apiKey,
    input.stats.topDistractor?.domain,
  ]);

  const refresh = () => {
    setLoading(true);
    setReloadToken((n) => n + 1);
  };

  /** Next free start (minutes) inside today's plan, or null. */
  const nextFreeStart = (durationMin: number): number | null => {
    const key = formatDateISO(mondayOf(new Date()));
    const plan = weeks[key];
    if (!plan) return null;
    const dow = (new Date().getDay() + 6) % 7;
    const occupied = plan.slots
      .filter((s) => s.day === dow)
      .map((s) => ({ s: toMin(s.start), e: toMin(s.end) }))
      .sort((a, b) => a.s - b.s);
    const n = new Date();
    const nowRound = n.getHours() * 60 + Math.ceil(n.getMinutes() / 15) * 15;
    let cursor = Math.max(toMin(prefs.dayStart), nowRound, toMin(prefs.deepWorkStart));
    for (let guard = 0; guard < 40; guard++) {
      const clash = occupied.find((o) => cursor < o.e && o.s < cursor + durationMin);
      if (!clash) {
        if (cursor + durationMin > toMin(prefs.dayEnd)) return null;
        return cursor;
      }
      cursor = clash.e;
      if (cursor + durationMin > toMin(prefs.dayEnd)) return null;
    }
    return null;
  };

  const applyAction = (tip: CoachTip) => {
    if (!tip.action || tip.action.kind === "none" || !tip.action.kind) return;
    const kind = tip.action.kind === "addBreak" ? "break" : "task";
    const goal =
      goals.find((g) => g.id === tip.action?.goalId) ?? goals.find((g) => g.status === "active");
    const dur = kind === "break" ? prefs.breakMinutes : prefs.focusBlockMinutes;
    const start = nextFreeStart(dur);
    if (start === null) {
      useStore.getState().pushToast({
        title: "No room left today",
        message: "Try clearing a block or regenerating the week.",
        tone: "warn",
      });
      return;
    }
    const dow = (new Date().getDay() + 6) % 7;
    addSlot(formatDateISO(mondayOf(new Date())), {
      id: uid("slot-coach"),
      day: dow,
      start: fromMin(start),
      end: fromMin(start + dur),
      kind,
      title: kind === "break" ? "Reset break" : goal?.title ?? "Deep work",
      goalId: kind === "task" ? goal?.id : undefined,
      color: kind === "task" ? goal?.color ?? "#8b6cff" : "#2dd4bf",
      locked: false,
      done: false,
    });
    useStore.getState().pushToast({
      title: "Added to today",
      message: `"${kind === "break" ? "Reset break" : goal?.title ?? "Deep work"}" at ${fromMin(start)}.`,
      tone: "success",
    });
  };

  return (
    <div className="app-card flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-iris to-sky-500 text-white shadow-[0_0_16px_-2px_rgba(139,108,255,0.6)]">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          AI Coach
        </h3>
        <div className="flex items-center gap-2">
          {!loading && (
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
              {usedAI ? "Model" : "Rules engine"}
            </span>
          )}
          <button
            onClick={() => void refresh()}
            className="rounded-lg p-1.5 text-faint transition hover:bg-white/[0.06] hover:text-ink"
            aria-label="Refresh coach"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-3 py-10 text-muted">
          <Loader2 className="h-6 w-6 animate-spin text-iris-soft" />
          <p className="text-sm">Reading your orbit…</p>
        </div>
      ) : (
        <ul className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 430 }}>
          {tips.map((tip) => (
            <li key={tip.id} className={cn("rounded-xl border p-3.5", TONE_STYLES[tip.tone])}>
              <p className="text-[13px] font-semibold leading-5 text-ink">{tip.title}</p>
              {tip.detail ? <p className="mt-1 text-[12.5px] leading-[18px] text-muted">{tip.detail}</p> : null}
              {tip.action && tip.action.kind !== "none" ? (
                <Button
                  size="xs"
                  variant="subtle"
                  className="mt-2.5"
                  onClick={() => applyAction(tip)}
                  icon={
                    tip.action?.kind === "addBreak" ? (
                      <Coffee className="h-3.5 w-3.5" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {tip.action.label}
                </Button>
              ) : null}
            </li>
          ))}
          {tips.length === 0 && (
            <li className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">
              Not enough data yet — log focus sessions and browse a little.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}