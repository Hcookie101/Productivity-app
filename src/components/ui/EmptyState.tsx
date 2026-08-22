"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line px-6 py-10 text-center",
        className
      )}
    >
      {icon ? (
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-iris/10 text-iris-soft ring-1 ring-iris/20">
          {icon}
        </div>
      ) : null}
      <h4 className="font-display text-[15px] font-semibold text-ink">{title}</h4>
      {subtitle ? <p className="max-w-sm text-[13px] leading-5 text-muted">{subtitle}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}