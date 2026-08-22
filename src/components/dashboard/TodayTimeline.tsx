"use client";

import { Check } from "lucide-react";
import type { Slot } from "@/lib/types";
import { formatRange, toMin } from "@/lib/time";
import { useStore } from "@/lib/store";
import { formatDateISO, mondayOf } from "@/lib/stats";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<Slot["kind"], { badge: string; label: string; dot: string }> = {
  obligation: { badge: "bg-violet-500/15 text-violet-300", label: "Obligation", dot: "#a78bfa" },
  task: { badge: "bg-sky-500/15 text-sky-300", label: "Focus", dot: "#38bdf8" },
  break: { badge: "bg-teal-500/15 text-teal-300", label: "Break", dot: "#2dd4bf" },
};

function slotColor(slot: Slot, fallback: string): string {
  return slot.color || fallback;
}

export function TodayTimeline({ slots, now }: { slots: Slot[]; now: Date }) {
  const toggleSlotDone = useStore((s) => s.toggleSlotDone);
  const weekStart = formatDateISO(mondayOf(now));
  const sorted = [...slots].sort((a, b) => toMin(a.start) - toMin(b.start));
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
        Nothing scheduled for today yet. Head to the <strong className="text-ink">Schedule</strong> tab to plan your
        week.
      </div>
    );
  }

  return (
    <div className="relative">
      {sorted.map((slot) => {
        const kind = KIND_STYLE[slot.kind] ?? KIND_STYLE.task;
        const startMin = toMin(slot.start);
        const midMin = startMin + Math.round((toMin(slot.end) - startMin) / 2);
        const isPast = !slot.done && midMin < nowMin;
        const isNow = startMin <= nowMin && nowMin <= toMin(slot.end);
        return (
          <div
            key={slot.id}
            className={cn(
              "group relative flex items-center gap-3 border-l-2 py-2.5 pl-4 transition-opacity",
              isPast && "opacity-45"
            )}
            style={{ borderColor: slotColor(slot, kind.dot) }}
          >
            {isNow && (
              <span className="absolute -left-[3px] top-0 h-full w-1 rounded-r bg-iris shadow-[0_0_12px_rgba(139,108,255,0.9)]" />
            )}
            <div className="w-[96px] shrink-0 text-xs tabular-nums text-faint">
              {formatRange(slot.start, slot.end)}
            </div>
            <button
              onClick={() => toggleSlotDone(weekStart, slot.id)}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                slot.done
                  ? "border-emerald-400/60 bg-emerald-500/25 text-emerald-300"
                  : "border-line text-transparent hover:border-iris/50 hover:text-muted"
              )}
              aria-label={slot.done ? "Mark not done" : "Mark done"}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm font-medium", slot.done ? "text-muted line-through" : "text-ink")}>
                {slot.title}
              </p>
              <span className={cn("mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium", kind.badge)}>
                {kind.label}
              </span>
            </div>
            {isNow ? (
              <span className="shrink-0 rounded-full bg-iris/20 px-2 py-0.5 text-[10px] font-semibold text-iris-soft animate-pulse">
                NOW
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}