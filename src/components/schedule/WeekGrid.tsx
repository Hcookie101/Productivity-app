"use client";

import { addDays } from "date-fns";
import type { AppPrefs, DayIndex, Slot } from "@/lib/types";
import { DAY_LABELS } from "@/lib/constants";
import { toMin, to12h, fromMin, formatRange } from "@/lib/time";
import { cn } from "@/lib/utils";

const HOUR_PX = 56;
const MIN_PX = HOUR_PX / 60;

const KIND_META: Record<Slot["kind"], { bg: string; color: string }> = {
  obligation: { bg: "rgba(167,139,250,0.2)", color: "#e9d5ff" },
  task: { bg: "rgba(56,189,248,0.16)", color: "#bae6fd" },
  break: { bg: "rgba(45,212,191,0.13)", color: "#99f6e4" },
};

export interface WeekGridProps {
  weekStart: Date;
  slots: Slot[];
  prefs: AppPrefs;
  isCurrentWeek: boolean;
  onEdit: (slot: Slot) => void;
  onAddAt: (day: DayIndex, startMins: number) => void;
  onDropSlot: (slotId: string, day: DayIndex, startMins: number) => void;
}

export function WeekGrid({
  weekStart,
  slots,
  prefs,
  isCurrentWeek,
  onEdit,
  onAddAt,
  onDropSlot,
}: WeekGridProps) {
  const dayStart = toMin(prefs.dayStart);
  const dayEnd = toMin(prefs.dayEnd);
  const totalHours = Math.max(1, (dayEnd - dayStart) / 60) * HOUR_PX;
  const now = new Date();
  const todayDow = (now.getDay() + 6) % 7;
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const hours: number[] = [];
  for (let m = dayStart; m <= dayEnd; m += 60) hours.push(m);

  const handleDrop = (day: DayIndex) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const start = Math.max(dayStart, Math.min(dayEnd - 15, Math.round((dayStart + y / MIN_PX) / 15) * 15));
    onDropSlot(id, day, start);
  };

  const handleColumnClick = (day: DayIndex) => (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-slot]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const start = Math.max(dayStart, Math.round((dayStart + y / MIN_PX) / 15) * 15);
    onAddAt(day, start);
  };

  return (
    <div className="overflow-x-auto hide-scrollbar rounded-2xl border border-line bg-black/20">
      <div className="min-w-[880px]">
        {/* header */}
        <div className="grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
          <div />
          {Array.from({ length: 7 }, (_, i) => i as DayIndex).map((day) => {
            const date = addDays(weekStart, day);
            const isToday = isCurrentWeek && day === todayDow;
            return (
              <div
                key={day}
                className={cn("border-b border-line px-2 py-2.5 text-center", day > 0 && "border-l border-line/60")}
              >
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider",
                    isToday ? "text-iris-soft" : "text-faint"
                  )}
                >
                  {DAY_LABELS[day]}
                </p>
                <p className={cn("font-display text-sm font-bold", isToday ? "text-ink" : "text-muted")}>
                  {date.getDate()}
                  {isToday && (
                    <span className="ml-1 rounded-full bg-iris px-1.5 py-0.5 text-[9px] font-bold text-white">
                      NOW
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex">
          {/* hour gutter */}
          <div className="relative w-[52px] shrink-0" style={{ height: totalHours }}>
            {hours.map((h) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-faint"
                style={{ top: (h - dayStart) * HOUR_PX + 6 }}
              >
                {h === dayStart ? "" : to12h(fromMin(h)).replace(":00", "")}
              </span>
            ))}
          </div>

          {/* day columns */}
          <div className="relative flex flex-1" style={{ height: totalHours }}>
            {/* shared gridlines */}
            <div className="pointer-events-none absolute inset-0">
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-line/50"
                  style={{ top: (h - dayStart) * HOUR_PX }}
                />
              ))}
            </div>

            {Array.from({ length: 7 }, (_, i) => i as DayIndex).map((day) => {
              const isToday = isCurrentWeek && day === todayDow;
              const daySlots = slots
                .filter((s) => s.day === day)
                .sort((a, b) => toMin(a.start) - toMin(b.start));
              return (
                <div
                  key={day}
                  onClick={handleColumnClick(day)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop(day)}
                  className={cn(
                    "relative flex-1 cursor-pointer",
                    day > 0 && "border-l border-line/60",
                    isToday && "bg-iris/[0.045]"
                  )}
                  style={{ height: totalHours }}
                >
                  {/* now line */}
                  {isCurrentWeek && day === todayDow && nowMins >= dayStart && nowMins <= dayEnd ? (
                    <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: (nowMins - dayStart) * MIN_PX }}>
                      <div className="relative border-t-2 border-rose-400/80">
                        <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-rose-400" />
                      </div>
                    </div>
                  ) : null}

                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      data-slot
                      draggable={slot.kind !== "obligation" && !slot.locked}
                      onDragStart={(e) => {
                        if (slot.kind === "obligation" || slot.locked) return;
                        e.dataTransfer.setData("text/plain", slot.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => onEdit(slot)}
                      className={cn(
                        "group absolute inset-x-1 z-10 cursor-pointer overflow-hidden rounded-lg border px-2 py-1 shadow-lg transition hover:z-30 hover:brightness-110",
                        slot.locked && "cursor-grab",
                        slot.kind === "obligation" && "hover:border-transparent"
                      )}
                      style={{
                        top: (toMin(slot.start) - dayStart) * MIN_PX,
                        height: Math.max(22, (toMin(slot.end) - toMin(slot.start)) * MIN_PX),
                        left: 4,
                        right: 4,
                        background: slot.color ?? KIND_META[slot.kind].bg,
                        borderColor: slot.color ?? KIND_META[slot.kind].color,
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 14px -8px rgba(0,0,0,0.6)`,
                      }}
                      title={`${slot.title} · ${formatRange(slot.start, slot.end)}`}
                    >
                      <p className={cn("truncate text-[11px] font-semibold leading-tight", slot.done && "line-through opacity-60")} style={{ color: slot.color ? "#0b0f1c" : KIND_META[slot.kind].color }}>
                        {slot.title}
                      </p>
                      <p className="text-[10px] tabular-nums opacity-70" style={{ color: slot.color ? "#0b0f1c" : KIND_META[slot.kind].color }}>
                        {formatRange(slot.start, slot.end)}
                      </p>
                      {slot.locked ? (
                        <span className="absolute right-1 top-1 text-[9px] opacity-70">🔒</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}