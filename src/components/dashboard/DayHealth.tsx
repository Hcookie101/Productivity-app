"use client";

import { ProgressRing, ProgressBar } from "@/components/ui/Progress";
import type { StatsBundle } from "@/lib/stats";

function tone(score: number): { color: string; label: string; blurb: string } {
  if (score >= 80) return { color: "#34d399", label: "On fire", blurb: "Focus, obligations & recovery are all in balance." };
  if (score >= 62) return { color: "#8b6cff", label: "Steady", blurb: "Good momentum — a few small tweaks will compound." };
  if (score >= 40) return { color: "#f59e0b", label: "Wobbly", blurb: "Distraction or overcommitment is creeping in." };
  return { color: "#fb7185", label: "Needs a reset", blurb: "Take a breath — one reset day beats a bad week." };
}

export function DayHealth({ stats }: { stats: StatsBundle }) {
  const hasAnySignal =
    stats.days.some((d) => d.focusedMin > 0) ||
    stats.sites.length > 0 ||
    stats.today.plannedMin > 0;

  if (!hasAnySignal) {
    return (
      <div className="app-card flex h-full flex-col p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[15px] font-semibold text-ink">Day Health</h3>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-faint">
            Collecting…
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <div className="flex h-14 w-14 animate-floaty items-center justify-center rounded-full border border-dashed border-line text-2xl">
            🛰️
          </div>
          <p className="mt-1 text-sm font-medium text-muted">No signals yet</p>
          <p className="max-w-[240px] text-[12px] leading-5 text-faint">
            Generate a schedule, run a focus session, or browse with the Orbit extension — your score wakes up from real
            activity only.
          </p>
        </div>
      </div>
    );
  }

  const t = tone(stats.healthScore);
  return (
    <div className="app-card flex h-full flex-col p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px] font-semibold text-ink">Day Health</h3>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: `${t.color}1f`, color: t.color }}
        >
          {t.label}
        </span>
      </div>

      <div className="flex items-center gap-5 py-4">
        <ProgressRing value={stats.healthScore} size={126} stroke={12} color={t.color}>
          <div className="text-center">
            <div className="font-display text-3xl font-bold text-ink">{stats.healthScore}</div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-faint">/100</div>
          </div>
        </ProgressRing>
        <p className="flex-1 text-[13px] leading-5 text-muted">{t.blurb}</p>
      </div>

      <div className="mt-auto space-y-2.5">
        {stats.healthFactors.map((f) => (
          <div key={f.key}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
              <span className="font-medium text-muted">{f.label}</span>
              <span className="truncate tabular-nums text-faint">{f.note}</span>
            </div>
            <ProgressBar
              value={f.score}
              color={f.score >= 62 ? "#8b6cff" : f.score >= 40 ? "#f59e0b" : "#fb7185"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}