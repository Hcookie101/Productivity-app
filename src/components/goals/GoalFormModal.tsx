"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { GOAL_COLORS, PRIORITIES } from "@/lib/constants";
import { uid, formatDateISO } from "@/lib/utils";
import type { Goal, Priority } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, TextInput, Textarea, Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 21);
  return formatDateISO(d);
}

export function GoalFormModal({
  open,
  onClose,
  goal,
}: {
  open: boolean;
  onClose: () => void;
  goal?: Goal | null;
}) {
  const addGoal = useStore((s) => s.addGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [priority, setPriority] = useState<Priority>("medium");
  const [weeklyHours, setWeeklyHours] = useState(3);
  const [color, setColor] = useState(GOAL_COLORS[0]);
  const [status, setStatus] = useState<Goal["status"]>("active");
  const [syncKey, setSyncKey] = useState("");

  // reset form state whenever the modal opens for a different goal
  const initKey = open ? (goal?.id ?? "new") : "closed";
  if (initKey !== syncKey) {
    setSyncKey(initKey);
    if (open) {
      setTitle(goal?.title ?? "");
      setDescription(goal?.description ?? "");
      setDeadline(goal?.deadline ?? defaultDeadline());
      setPriority(goal?.priority ?? "medium");
      setWeeklyHours(goal ? Math.max(1, goal.weeklyHours) : 3);
      setColor(goal?.color ?? GOAL_COLORS[0]);
      setStatus(goal?.status ?? "active");
    }
  }

  const save = () => {
    if (!title.trim()) return;
    if (goal) {
      updateGoal(goal.id, {
        title: title.trim(),
        description: description.trim(),
        deadline,
        priority,
        weeklyHours,
        color,
        status,
      });
    } else {
      addGoal({
        id: uid("goal"),
        title: title.trim(),
        description: description.trim(),
        deadline,
        priority,
        weeklyHours,
        color,
        status: "active",
        createdAt: Date.now(),
        subgoals: [],
      });
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? "Edit goal" : "New goal"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!title.trim()}>
            {goal ? "Save changes" : "Create goal"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Goal">
          <TextInput
            autoFocus
            placeholder="e.g. Launch my portfolio site"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Description (optional)">
          <Textarea
            placeholder="Why does this matter, and what does done look like?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deadline">
            <TextInput type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
          <Field label="Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hours / week" hint="Used by the AI scheduler.">
            <TextInput
              type="number"
              min={1}
              max={40}
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value) || 3)}
            />
          </Field>
          {goal ? (
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as Goal["status"])}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="done">Done ✓</option>
              </Select>
            </Field>
          ) : null}
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
                  color === c ? "ring-2 ring-white ring-offset-2 ring-offset-panel scale-110" : "opacity-70 hover:opacity-100"
                )}
                style={{ background: c }}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}