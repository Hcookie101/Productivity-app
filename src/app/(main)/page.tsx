"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Target, Flame, Globe, CalendarClock, ArrowRight, Sparkles } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import { computeStats } from "@/lib/stats";
import { useNow } from "@/components/ui/useNow";
import { DayHealth } from "@/components/dashboard/DayHealth";
import { FocusTimer } from "@/components/dashboard/FocusTimer";
import { TodayTimeline } from "@/components/dashboard/TodayTimeline";
import { ProgressBar } from "@/components/ui/Progress";

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const now = useNow();
    const state = useStore(
    useShallow((s) => ({
      goals: s.goals,
      obligations: s.obligations,
      weeks: s.weeks,
      sessions: s.sessions,
      siteStats: s.siteStats,
    }))
  );

  const stats = useMemo(() => computeStats({ ...state, now }), [state, now]);
  const urgentGoals = stats.goalProgress.filter((g) => g.urgent).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-widest text-iris-soft">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">
            {greeting(now)}, pilot. <span className="text-grad">You&apos;ve got this.</span>
          </h1>
        </div>
        <Link
          href="/stats"
          className="group flex items-center gap-2 rounded-xl border border-iris/30 bg-iris/10 px-3.5 py-2 text-sm font-medium text-iris-soft transition hover:bg-iris/20"
        >
          <Sparkles className="h-4 w-4" />
          AI coach
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          icon={<Flame className="h-4 w-4" />}
          label="Focus today"
          value={`${stats.today.focusedMin}m`}
          sub={`${stats.today.plannedMin > 0 ? Math.round((stats.today.focusedMin / stats.today.plannedMin) * 100) : 0}% of planned`}
        />
        <MiniStat
          icon={<CalendarClock className="h-4 w-4" />}
          label="Obligations today"
          value={`${stats.todayObligations.done}/${stats.todayObligations.total}`}
          sub="done & kept"
        />
        <MiniStat
          icon={<Globe className="h-4 w-4" />}
          label="Browsing today"
          value={`${Math.round(stats.todaySites / 60)}h ${stats.todaySites % 60}m`}
          sub={`${stats.todayDistracted ? Math.round(stats.todayDistracted) : 0}m distractor-heavy`}
        />
        <MiniStat
          icon={<Target className="h-4 w-4" />}
          label="Goals due soon"
          value={String(stats.goalProgress.filter((g) => g.daysLeft <= 7).length)}
          sub="within 7 days"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <DayHealth stats={stats} />
        </div>
        <div className="lg:col-span-2">
          <FocusTimer />
        </div>
        <div className="app-card flex flex-col p-5">
          <h3 className="font-display text-[15px] font-semibold text-ink">Week momentum</h3>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <span className="font-display text-3xl font-bold text-ink">{Math.round(stats.weekFocused / 60)}h</span>
              <span className="ml-2 text-sm text-muted">focused</span>
            </div>
            <span className="text-xs tabular-nums text-faint">
              {stats.weekPlanned > 0 ? Math.round((stats.weekFocused / stats.weekPlanned) * 100) : 0}% of plan
            </span>
          </div>
          <ProgressBar
            className="mt-3"
            value={
              stats.weekPlanned > 0
                ? (stats.weekFocused / stats.weekPlanned) * 100
                : Math.min(100, (stats.weekFocused / 420) * 100)
            }
          />
          <div className="mt-auto pt-4">
            {spendTop(stats) ? (
              <div className="rounded-xl border border-line bg-white/[0.04] p-3 text-[12px] leading-4.5 text-muted">
                <span className="font-semibold text-amber-300">{stats.topDistractor?.domain ?? "A site"}</span> is your
                biggest distractor — {stats.topDistractor ? Math.round(stats.topDistractor.weekMin / 60) : 0}h this
                week.
              </div>
            ) : stats.sites.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-3 text-[12px] leading-4.5 text-faint">
                No browsing data yet — install the Orbit Chrome extension and your real numbers will appear here.
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-emerald-500/[0.06] p-3 text-[12px] leading-4.5 text-emerald-300/90">
                No heavy distractor patterns this week. Clean orbit. 🛰️
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="app-card p-5 lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-[15px] font-semibold text-ink">Today&apos;s plan</h3>
            <Link href="/schedule" className="text-xs font-medium text-iris-soft hover:text-iris">
              Open schedule →
            </Link>
          </div>
          <TodayTimeline slots={stats.todaySlots} now={now} />
        </div>

        <div className="app-card p-5 lg:col-span-2">
          <h3 className="font-display text-[15px] font-semibold text-ink">Heads up</h3>
          {urgentGoals.length === 0 ? (
            <p className="mt-3 text-sm leading-5 text-muted">
              No deadlines inside the next week. Keep the momentum curve green. 📈
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {urgentGoals.map((g) => (
                <li key={g.goal.id}>
                  <Link
                    href="/goals"
                    className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.03] p-3 transition hover:border-rose-400/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: g.goal.color }} />
                      <span className="truncate text-sm font-medium text-ink">{g.goal.title}</span>
                    </div>
                    <span className="shrink-0 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                      {g.daysLeft}d left · {g.pct}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function spendTop(stats: import("@/lib/stats").StatsBundle): boolean {
  return !!stats.topDistractor && (stats.topDistractor.todayMin >= 30 || stats.topDistractor.weekMin >= 300);
}

function MiniStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="app-card flex items-center gap-3 p-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-iris/10 text-iris-soft">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-faint">{label}</p>
        <p className="truncate font-display text-lg font-bold leading-tight text-ink">{value}</p>
        <p className="truncate text-[11px] text-faint">{sub}</p>
      </div>
    </div>
  );
}