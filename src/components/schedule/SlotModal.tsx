"use client";

import { useState } from "react";
import { Trash2, Lock, LockOpen } from "lucide-react";
import type { DayIndex, Slot, SlotKind } from "@/lib/types";
import { DAY_LABELS_FULL, SLOT_KIND_META } from "@/lib/constants";
import { fromMin, toMin } from "@/lib/time";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, TextInput, Select } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Controls";

export function SlotModal({
  open,
  onClose,
  weekStart,
  slot,
  dayHint,
  startHintMin,
}: {
  open: boolean;
  onClose: () => void;
  weekStart: string;
  slot: Slot | null;
  dayHint?: DayIndex;
  startHintMin?: number;
}) {
  const addSlot = useStore((s) => s.addSlot);
  const updateSlot = useStore((s) => s.updateSlot);
  const removeSlot = useStore((s) => s.removeSlot);

  const [title, setTitle] = useState("");
  const [day, setDay] = useState<DayIndex>(0);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [kind, setKind] = useState<SlotKind>("task");
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState("");
  const [syncKey, setSyncKey] = useState("");

  // reset form state whenever the modal opens for a different target
  const initKey = open ? (slot ? `edit:${slot.id}` : `new:${dayHint}:${startHintMin}`) : "closed";
  if (initKey !== syncKey) {
    setSyncKey(initKey);
    if (open && slot) {
      setTitle(slot.title);
      setDay(slot.day);
      setStart(slot.start);
      setEnd(slot.end);
      setKind(slot.kind);
      setLocked(slot.locked);
      setDone(slot.done);
      setNotes(slot.notes ?? "");
    } else if (open) {
      const hint = startHintMin ?? toMin("09:00");
      setTitle("");
      setDay(dayHint ?? 0);
      setStart(fromMin(hint));
      setEnd(fromMin(hint + 60));
      setKind("task");
      setLocked(false);
      setDone(false);
      setNotes("");
    }
  }

  const save = () => {
    if (!title.trim()) return;
    const payload: Slot = {
      id: slot?.id ?? uid("slot"),
      day,
      start,
      end,
      kind: slot?.kind === "obligation" ? "obligation" : kind,
      title: title.trim(),
      locked,
      done,
      notes: notes.trim() || undefined,
      color: slot?.color,
      goalId: slot?.goalId,
      obligationId: slot?.obligationId,
    };
    if (slot) updateSlot(weekStart, slot.id, payload);
    else addSlot(weekStart, payload);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={slot ? "Edit block" : "Add to schedule"}
      footer={
        <>
          {slot ? (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                removeSlot(weekStart, slot.id);
                onClose();
              }}
              icon={<Trash2 className="h-4 w-4" />}
            >
              Delete
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!title.trim()}>
            {slot ? "Save" : "Add block"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title">
          <TextInput autoFocus placeholder="e.g. Deep work on portfolio" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Day">
            <Select value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {DAY_LABELS_FULL.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type">
            <Select
              value={slot?.kind === "obligation" ? "obligation" : kind}
              disabled={slot?.kind === "obligation"}
              onChange={(e) => setKind(e.target.value as SlotKind)}
            >
              {Object.entries(SLOT_KIND_META).map(([k, meta]) => (
                <option key={k} value={k}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <TextInput type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End">
            <TextInput type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <TextInput placeholder="Zoom link, context…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-4">
          {slot?.kind !== "obligation" ? (
            <Toggle
              checked={locked}
              onChange={setLocked}
              label={
                <span className="flex items-center gap-1.5">
                  {locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                  Locked (kept when regenerating)
                </span>
              }
            />
          ) : null}
          {slot ? (
            <Toggle checked={done} onChange={setDone} label="Done" />
          ) : null}
        </div>
      </div>
    </Modal>
  );
}