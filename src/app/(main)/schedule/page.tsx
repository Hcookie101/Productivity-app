"use client";

import { useMemo, useState } from "react";
import { addWeeks, format } from "date-fns";
import { ChevronLeft, ChevronRight, Sparkles, Wand2, Trash2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import { mondayOf } from "@/lib/stats";
import { formatDateISO, toMin, fromMin } from "@/lib/time";
import { SLOT_KIND_META } from "@/lib/constants";
import type { Slot } from "@/lib/types";
import { generateWeekPlan, editScheduleByText } from "@/lib/ai/schedule";
import { WeekGrid } from "@/components/schedule/WeekGrid";
import { SlotModal } from "@/components/schedule/SlotModal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export default function SchedulePage() {
    const state = useStore(
    useShallow((s) => ({
      goals: s.goals,
      obligations: s.obligations,
      prefs: s.prefs,
      weeks: s.weeks,
      settings: s.settings,
    }))
  );
  const setWeek = useStore((s) => s.setWeek);
  const updateSlot = useStore((s) => s.updateSlot);

  const [weekOffset, setWeekOffset] = useState(0);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [editorDay, setEditorDay] = useState<number | undefined>(undefined);
  const [editorStartMin, setEditorStartMin] = useState<number | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState<"generate" | "edit" | null>(null);
  const [prompt, setPrompt] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [resultNote, setResultNote] = useState<string | null>(null);

  const weekStart = useMemo(() => addWeeks(mondayOf(new Date()), weekOffset), [weekOffset]);
  const key = formatDateISO(weekStart);
  const plan = state.weeks[key];
  const slots = plan?.slots ?? [];

  const buildCtx = () => ({
    obligations: state.obligations,
    goals: state.goals,
    prefs: state.prefs,
    weekStart,
    existing: slots,
    settings: state.settings,
  });

  const confirm = () => {
    setConfirming(true);
    window.setTimeout(() => setConfirming(false), 5000);
  };

  const handleGenerate = async () => {
    if (busy) return;
    const hasManual = slots.some((s) => s.kind !== "obligation");
    if (hasManual && !confirming) {
      confirm();
      return;
    }
    setConfirming(false);
    setBusy("generate");
    try {
      const result = await generateWeekPlan(buildCtx());
      setWeek({
        start: key,
        slots: result.slots,
        generatedAt: Date.now(),
        source: result.usedAI ? "ai" : "rules",
      });
      setResultNote(`${result.usedAI ? "✨ AI plan" : "⚡ Plan"} — ${result.summary}`);
      toast(result.usedAI ? "AI generated your week" : "Week generated", result.summary);
    } catch (e) {
      toast("Generation failed", String(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy("edit");
    try {
      const result = await editScheduleByText(text, buildCtx());
      setWeek({ start: key, slots: result.slots, generatedAt: Date.now(), source: result.usedAI ? "ai" : "rules" });
      setResultNote(result.summary);
      toast(result.usedAI ? "AI applied your change" : "Applied", result.summary);
    } catch (err) {
      toast("Couldn't apply that", String(err), "error");
    } finally {
      setBusy(null);
      setPrompt("");
    }
  };

  const openAddAt = (day: number, startMins: number) => {
    setEditingSlot(null);
    setEditorDay(day);
    setEditorStartMin(startMins);
    setModalOpen(true);
  };

  const openEdit = (slot: Slot) => {
    setEditingSlot(slot);
    setEditorDay(slot.day);
    setEditorStartMin(toMin(slot.start));
    setModalOpen(true);
  };

  const dropSlot = (slotId: string, day: number, startMins: number) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    const duration = Math.max(15, toMin(slot.end) - toMin(slot.start));
    const end = Math.min(23 * 60, startMins + duration);
    updateSlot(key, slotId, { day, start: fromMin(startMins), end: fromMin(end) });
    setResultNote(`Moved "${slot.title}" on the grid.`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-widest text-iris-soft">AI planner</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">Schedule</h1>
          <p className="mt-1 text-sm text-muted">
            Week of <strong className="text-ink">{format(weekStart, "MMM d")}</strong> — locked obligations stay put,
            goals flex around them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="app-card flex items-center gap-1 p-1">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="rounded-lg p-1.5 text-muted transition hover:bg-white/[0.06] hover:text-ink"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-1 text-sm tabular-nums text-ink">
              {format(weekStart, "MMM d")} – {format(addWeeks(weekStart, 7), "MMM d")}
            </span>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="rounded-lg p-1.5 text-muted transition hover:bg-white/[0.06] hover:text-ink"
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
            This week
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(SLOT_KIND_META).map(([k, meta]) => (
            <Badge key={k}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.chip }} />
              {meta.label}
            </Badge>
          ))}
          <Badge>🔒 Locked</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setWeek({ start: key, slots: [], generatedAt: Date.now() });
              setResultNote("Cleared — obligations will reappear when you regenerate.");
            }}
            icon={<Trash2 className="h-4 w-4" />}
          >
            Clear tasks
          </Button>
          <Button
            onClick={handleGenerate}
            loading={busy === "generate"}
            className={cn(confirming && "from-amber-500 via-amber-500 to-amber-600")}
            icon={<Sparkles className="h-4 w-4" />}
          >
            {confirming ? "Click again to regenerate" : "Generate week"}
          </Button>
        </div>
      </div>
      {resultNote ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-iris/25 bg-iris/[0.06] px-4 py-3 text-sm text-muted animate-fade-in">
          <p className="whitespace-pre-line">{resultNote}</p>
          <button
            onClick={() => setResultNote(null)}
            className="shrink-0 text-faint transition hover:text-ink"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ) : null}
      <form onSubmit={handlePromptSubmit} className="app-card flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-iris to-sky-500 text-white shadow-[0_0_18px_-2px_rgba(139,108,255,0.6)]">
          <Wand2 className="h-4 w-4" />
        </div>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={'Tell the AI: "move Gym to Thursday 6pm", "add a 30 min break at 3pm on Tuesday"…'}
          className="h-11 w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
        />
        <Button type="submit" size="sm" loading={busy === "edit"} disabled={!prompt.trim()}>
          {busy === "edit" ? "Thinking…" : "Apply"}
        </Button>
      </form>
      <WeekGrid
        weekStart={weekStart}
        slots={slots}
        prefs={state.prefs}
        isCurrentWeek={weekOffset === 0}
        onEdit={openEdit}
        onAddAt={openAddAt}
        onDropSlot={dropSlot}
      />

      {slots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          <p>This week is a blank canvas.</p>
          <p className="mt-1 text-faint">
            Hit <strong className="text-iris-soft">Generate week</strong> and Orbit will lock your obligations and slide
            goal work into the best windows.
          </p>
        </div>
      ) : null}

      <SlotModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        weekStart={key}
        slot={editingSlot}
        dayHint={editorDay}
        startHintMin={editorStartMin}
      />
    </div>
  );
}