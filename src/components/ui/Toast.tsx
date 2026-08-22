"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const TONES = {
  success: { icon: CheckCircle2, ring: "border-emerald-400/30 text-emerald-300", bar: "bg-emerald-400" },
  warn: { icon: AlertTriangle, ring: "border-amber-400/30 text-amber-300", bar: "bg-amber-400" },
  error: { icon: XCircle, ring: "border-rose-400/30 text-rose-300", bar: "bg-rose-400" },
  info: { icon: Info, ring: "border-sky-400/30 text-sky-300", bar: "bg-sky-400" },
} as const;

export function ToastViewport() {
  const { toasts, dismissToast } = useStore();

  useEffect(() => {
    if (toasts.length === 0) return;
    const ids = toasts.map((t) => t.id);
    const timers = ids.map((id) =>
      setTimeout(() => dismissToast(id), 4800)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,90vw)] flex-col gap-2">
      {toasts.map((t) => {
        const tone = TONES[t.tone as keyof typeof TONES] ?? TONES.info;
        const Icon = tone.icon;
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto relative overflow-hidden rounded-xl border bg-panel/95 p-3.5 pr-9 shadow-2xl backdrop-blur-xl animate-fade-up",
              tone.ring
            )}
          >
            <span className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} />
            <div className="flex items-start gap-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">{t.title}</p>
                {t.message ? (
                  <p className="mt-0.5 whitespace-pre-line text-xs leading-4.5 text-muted">{t.message}</p>
                ) : null}
              </div>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="absolute right-2 top-2 rounded-md p-1 text-faint transition hover:bg-white/10 hover:text-ink"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function toast(title: string, message?: string, tone: "success" | "warn" | "error" | "info" = "success") {
  useStore.getState().pushToast({ title, message, tone });
}