"use client";

import { useState } from "react";
import { Sparkles, Plus } from "lucide-react";
import type { Goal } from "@/lib/types";
import { generateSubgoals } from "@/lib/ai/subgoals";
import { useStore } from "@/lib/store";
import { toast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

export function AiSubgoalsModal({
  goal,
  open,
  onClose,
}: {
  goal: Goal | null;
  open: boolean;
  onClose: () => void;
}) {
  const settings = useStore((s) => s.settings);
  const addSubgoals = useStore((s) => s.addSubgoals);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ id: string; title: string; estimatedMinutes: number }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!goal) return;
    setLoading(true);
    setError(null);
        try {
      const result = await generateSubgoals(goal, settings);
      setSuggestions(result.subgoals.map((s) => ({ id: s.id, title: s.title, estimatedMinutes: s.estimatedMinutes })));
      setSelected(new Set(result.subgoals.map((s) => s.id)));
      setNote(result.note ?? null);
    } catch {
      setError("Something went wrong while generating. Please try again.");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!goal) return;
    const subs = suggestions
      .filter((s) => selected.has(s.id))
      .map((s) => ({ id: s.id, title: s.title, estimatedMinutes: s.estimatedMinutes, done: false as const }));
    if (subs.length > 0) {
      addSubgoals(goal.id, subs);
      toast("Subgoals added", `${subs.length} checkpoints added to "${goal.title}".`);
    }
    onClose();
    setSuggestions([]);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-iris-soft" />
          {goal ? `Break down “${goal.title}”` : "Break down a goal"}
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {suggestions.length > 0 ? (
            <Button
              onClick={apply}
              disabled={selected.size === 0}
              icon={<Plus className="h-4 w-4" />}
            >
              Add {selected.size || "selected"}
            </Button>
          ) : (
            <Button loading={loading} onClick={run}>
              Generate
            </Button>
          )}
        </>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl skeleton-shimmer" />
          ))}
          <p className="text-center text-xs text-faint">Asking the AI for a smart breakdown…</p>
        </div>
      ) : error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</p>
      ) : suggestions.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-muted">
            I&apos;ll propose 3–6 concrete, one-sitting checkpoints from the goal, its deadline, and its priority.
          </p>
          <Button loading={loading} className="mt-4" onClick={run} icon={<Sparkles className="h-4 w-4" />}>
            Generate subgoals
          </Button>
        </div>
      ) : (
        <>
          {note ? <p className="mb-3 text-xs text-faint">✨ {note}</p> : null}
          <button
            onClick={() =>
              setSelected(selected.size === suggestions.length ? new Set() : new Set(suggestions.map((s) => s.id)))
            }
            className="mb-3 text-xs font-medium text-iris-soft hover:text-iris"
          >
            {selected.size === suggestions.length ? "Deselect all" : "Select all"}
          </button>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={s.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition",
                    selected.has(s.id)
                      ? "border-iris/40 bg-iris/[0.07]"
                      : "border-line hover:border-line/70 hover:bg-white/[0.03]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold",
                      selected.has(s.id) ? "border-iris bg-iris text-white" : "border-line text-faint"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium leading-5 text-ink">{s.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-faint">{s.estimatedMinutes}m</span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selected.has(s.id)}
                    onChange={() => {
                      const next = new Set(selected);
                      if (next.has(s.id)) next.delete(s.id);
                      else next.add(s.id);
                      setSelected(next);
                    }}
                  />
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}