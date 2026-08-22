"use client";

import { useState } from "react";
import type { Obligation } from "@/lib/types";
import { DAY_LABELS_FULL, GOAL_COLORS } from "@/lib/constants";
import { uid } from "@/lib/utils";
import { overlaps } from "@/lib/time";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, TextInput, Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export function ObligationFormModal({
  open,
  onClose,
  obligation,
}: {
  open: boolean;
  onClose: () => void;
  obligation?: Obligation | null;
}) {
  const obligations = useStore((s) => s.obligations);
  const addObligation = useStore((s) => s.addObligation);
  const updateObligation = useStore((s) => s.updateObligation);

  const [title, setTitle] = useState("");
  const [day, setDay] = useState(0);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("09:45");
  const [color, setColor] = useState(GOAL_COLORS[4]);
  const [notes, setNotes] = useState("");
  const [conflict, setConflict] = useState<string | null>(null);
  const [syncKey, setSyncKey] = useState("");

  // reset form state whenever the modal opens for a different obligation
  const initKey = open ? (obligation?.id ?? "new") : "closed";
  if (initKey !== syncKey) {
    setSyncKey(initKey);
    if (open) {
      setTitle(obligation?.title ?? "");
      setDay(obligation?.day ?? 0);
      setStart(obligation?.start ?? "09:00");
      setEnd(obligation?.end ?? "09:45");
      setColor(obligation?.color ?? GOAL_COLORS[4]);
      setNotes(obligation?.notes ?? "");
      setConflict(null);
    }
  }

  const save = () => {
    if (!title.trim()) return;
    const others = obligations.filter((o) => o.id !== obligation?.id);
    const clash = others.find(
      (o) => o.day === day && overlaps(start, end, o.start, o.end)
    );
    if (clash) {
      setConflict(`Overlaps with "${clash.title}" (${clash.start}–${clash.end}) on ${DAY_LABELS_FULL[day]}.`);
      return;
    }
    if (obligation) {
      updateObligation(obligation.id, {
        title: title.trim(),
        day,
        start,
        end,
        color,
        notes: notes.trim(),
      });
    } else {
      addObligation({
        id: uid("ob"),
        title: title.trim(),
        day,
        start,
        end,
        color,
        notes: notes.trim(),
      });
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={obligation ? "Edit obligation" : "New obligation"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!title.trim()}>
            {obligation ? "Save changes" : "Add obligation"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title">
          <TextInput
            autoFocus
            placeholder="e.g. Team standup"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Day" hint="Obligations repeat every week.">
          <Select value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {DAY_LABELS_FULL.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <TextInput type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End">
            <TextInput type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {GOAL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "h-8 w-8 rounded-full transition",
                  color === c
                    ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-panel"
                    : "opacity-70 hover:opacity-100"
                )}
                style={{ background: c }}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
        </Field>
        <Field label="Notes (optional)">
          <TextInput
            placeholder="e.g. Zoom link, location…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        {conflict ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[13px] text-rose-300">{conflict}</p>
        ) : null}
      </div>
    </Modal>
  );
}