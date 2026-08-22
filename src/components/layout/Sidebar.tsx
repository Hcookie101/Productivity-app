"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  CalendarClock,
  CalendarRange,
  BarChart3,
  Settings,
  Rocket,
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/obligations", label: "Obligations", icon: CalendarClock },
  { href: "/schedule", label: "Schedule", icon: CalendarRange },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="glass-nav sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r lg:flex">
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-iris to-sky-500 shadow-[0_0_24px_-4px_rgba(139,108,255,0.7)]">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-tight tracking-tight text-ink">
              {APP_NAME}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-widest text-faint">
              Mission control
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-gradient-to-r from-iris/20 to-transparent text-ink ring-1 ring-inset ring-iris/30"
                    : "text-muted hover:bg-white/[0.05] hover:text-ink"
                )}
              >
                <Icon
                  className={cn("h-[18px] w-[18px]", active ? "text-iris-soft" : "text-faint group-hover:text-muted")}
                />
                {item.label}
                {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-iris shadow-[0_0_8px_2px_rgba(139,108,255,0.7)]" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-5 pt-4">
          <div className="rounded-xl border border-line bg-white/[0.03] p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Local-first</p>
            <p className="mt-1 text-xs leading-4.5 text-muted">
              Your data lives in this browser. Add an AI key in Settings for full model-powered features.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="glass-nav fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t px-2 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2 lg:hidden">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-1 text-[10px] font-medium",
                active ? "text-iris-soft" : "text-faint"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_rgba(139,108,255,0.8)]")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}