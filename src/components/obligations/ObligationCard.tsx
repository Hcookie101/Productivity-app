"use client";

import { Pencil, Trash2, Clock, CalendarDays } from "lucide-react";
import type { Obligation } from "@/lib/types";
import { DAY_LABELS_FULL } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { formatRange } from "@/lib/time";

export function ObligationCard({
  obligation,
  onEdit,
}: {
  obligation: Obligation;
  onEdit: (o: Obligation) => void;
}) {
  const removeObligation = useStore((s) => s.removeObligation);

  return (
    <div className="app-card hover-lift group flex items-center gap-4 p-4">
      <span
        className="h-10 w-1.5 shrink-0 rounded-full"
        style={{ background: obligation.color, boxShadow: `0 0 12px ${obligation.color}77` }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[15px] font-semibold text-ink">{obligation.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-faint">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {DAY_LABELS_FULL[obligation.day]}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatRange(obligation.start, obligation.end)}
          </span>
          {obligation.notes ? <span className="truncate italic">{obligation.notes}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
        <button
          onClick={() => onEdit(obligation)}
          className="rounded-lg p-2 text-muted transition hover:bg-white/[0.06] hover:text-ink"
          aria-label="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => removeObligation(obligation.id)}
          className="rounded-lg p-2 text-muted transition hover:bg-rose-500/10 hover:text-rose-300"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Compact week overview: one pill per obligation, one column per day. */
export function WeekStrip({ obligations }: { obligations: Obligation[] }) {
  return (
    <div className="app-card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-faint">Weekly pattern</p>
      <div className="grid grid-cols-7 gap-1.5">
        {DAY_LABELS_FULL.map((day, i) => {
          const list = obligations
            .filter((o) => o.day === i)
            .sort((a, b) => a.start.localeCompare(b.start));
          return (
            <div key={day} className="min-w-0 rounded-xl border border-line bg-black/15 p-1.5">
              <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-faint">
                {day.slice(0, 3)}
              </p>
              <div className="space-y-1">
                {list.length === 0 ? (
                  <div className="rounded-md border border-dashed border-line/60 text-center text-[10px] text-faint/70">
                    —
                  </div>
                ) : (
                  list.map((o) => (
                    <div
                      key={o.id}
                      className="truncate rounded-md px-1.5 py-1 text-[10px] font-medium leading-tight"
                      style={{ background: `${o.color}1f`, color: o.color }}
                      title={`${o.title} · ${formatRange(o.start, o.end)}`}
                    >
                      {o.start.slice(0, 5)} {o.title}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}