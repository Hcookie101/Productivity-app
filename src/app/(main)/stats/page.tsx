"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useShallow } from "zustand/react/shallow";
import { Flame, Gauge, Globe, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { computeStats } from "@/lib/stats";
import { useNow } from "@/components/ui/useNow";
import { CoachPanel } from "@/components/stats/CoachPanel";
import { faviconUrl } from "@/lib/domains";
import { CATEGORY_COLORS } from "@/lib/constants";
import { formatDuration } from "@/lib/time";

const tooltipStyle = {
  backgroundColor: "rgba(11,15,28,0.95)",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: 12,
  fontSize: 12,
  color: "#e9ecf5",
};

export default function StatsPage() {
  const now = useNow(30_000);
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
  const coachInput = useMemo(
    () => ({
      stats,
      goals: state.goals.filter((g) => g.status === "active"),
    }),
    [stats, state.goals]
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] font-medium uppercase tracking-widest text-iris-soft">Signals</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">Stats & AI coach</h1>
        <p className="mt-1 text-sm text-muted">
          Planned vs real focus, where your clicks go, and what to do about it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          icon={<Flame className="h-4 w-4" />}
          label="Focus this week"
          value={formatDuration(stats.weekFocused)}
          sub={`planned ${formatDuration(stats.weekPlanned || 0)}`}
        />
        <Kpi
          icon={<Gauge className="h-4 w-4" />}
          label="Day Health"
          value={`${stats.healthScore}/100`}
          sub={stats.bestFocusDay ? `best day ${stats.bestFocusDay.minutes}m` : "—"}
        />
        <Kpi
          icon={<Globe className="h-4 w-4" />}
          label="Browsing this week"
          value={formatDuration(stats.weekSites)}
          sub={`${Math.round(stats.todaySites)} min today`}
        />
        <Kpi
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Obligations kept"
          value={`${stats.weekObligations.done}/${stats.weekObligations.total}`}
          sub="this week"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="app-card p-5 lg:col-span-3">
          <h3 className="font-display text-[15px] font-semibold text-ink">Planned vs actual focus</h3>
          <p className="text-xs text-faint">Last 7 days · minutes</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.days} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gFocus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b6cff" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#8b6cff" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="gPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#5c6682", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5c6682", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="plannedMin"
                  name="Planned"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#gPlanned)"
                />
                <Area
                  type="monotone"
                  dataKey="focusedMin"
                  name="Focused"
                  stroke="#8b6cff"
                  strokeWidth={2.5}
                  fill="url(#gFocus)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="app-card p-5 lg:col-span-2">
          <h3 className="font-display text-[15px] font-semibold text-ink">Where clicks go</h3>
          <p className="text-xs text-faint">Browsing minutes by category · 7 days</p>
          <div className="mt-2 h-64">
            {stats.categoryTotals.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted">No browsing data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryTotals}
                    dataKey="minutes"
                    nameKey="category"
                    innerRadius="52%"
                    outerRadius="80%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {stats.categoryTotals.map((c) => (
                      <Cell key={c.category} fill={CATEGORY_COLORS[c.category]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatDuration(Number(v))} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ color: "#9aa3bb", fontSize: 12 }}>{String(value)}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="app-card p-5 lg:col-span-3">
          <h3 className="font-display text-[15px] font-semibold text-ink">Top sites</h3>
          <p className="text-xs text-faint">Today · this week</p>
          <div className="mt-4 space-y-1.5">
            {stats.sites.slice(0, 9).map((row) => {
              const max = Math.max(...stats.sites.map((s) => s.todayMin), 60);
              return (
                <div key={row.domain} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.03]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={faviconUrl(row.domain, 32)}
                    alt=""
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] rounded"
                    loading="lazy"
                  />
                  <span className="w-36 shrink-0 truncate text-[13px] font-medium text-ink">{row.domain}</span>
                  <span
                    className="hidden h-1.5 rounded-full sm:block"
                    style={{
                      width: `${Math.max(3, (row.todayMin / max) * 100) * 1.6}px`,
                      minWidth: 8,
                      flex: 1,
                      maxWidth: 220,
                      background: CATEGORY_COLORS[row.category],
                      opacity: 0.55,
                    }}
                  />
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-faint">
                    {row.category} · {row.todayMin}m today · {Math.round(row.weekMin / 60)}h wk
                  </span>
                </div>
              );
            })}
            {stats.sites.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                No site data yet — install the Orbit extension or wait for demo sync.
              </p>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-2">
          <CoachPanel input={coachInput} />
        </div>
      </div>
    </div>
  );
}

function Kpi({
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
    <div className="app-card flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-iris/10 text-iris-soft">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-faint">{label}</p>
        <p className="truncate font-display text-lg font-bold leading-tight text-ink">{value}</p>
        <p className="truncate text-[11px] text-faint">{sub}</p>
      </div>
    </div>
  );
}