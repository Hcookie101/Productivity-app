"use client";

import { useState } from "react";
import { CalendarClock, Plus, ShieldCheck } from "lucide-react";
import type { Obligation } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { ObligationCard, WeekStrip } from "@/components/obligations/ObligationCard";
import { ObligationFormModal } from "@/components/obligations/ObligationFormModal";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ObligationsPage() {
  const obligations = useStore((s) => s.obligations);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Obligation | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-widest text-iris-soft">Non-negotiables</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">Obligations</h1>
          <p className="mt-1 text-sm text-muted">
            The schedule bends around these. The AI treats them as hard constraints.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          icon={<Plus className="h-4 w-4" />}
        >
          Add obligation
        </Button>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-iris/20 bg-iris/[0.06] px-4 py-3 text-sm text-muted">
        <ShieldCheck className="h-5 w-5 shrink-0 text-iris-soft" />
        <p>
          Every obligation maps to a <strong className="text-ink">locked slot</strong> in your schedule — regenerating
          the week will never move them.
        </p>
      </div>

      {obligations.length > 0 ? (
        <>
          <WeekStrip obligations={obligations} />
          <div className="grid gap-3 md:grid-cols-2">
            {obligations.map((o) => (
              <ObligationCard key={o.id} obligation={o} onEdit={(ob) => {
                setEditing(ob);
                setOpen(true);
              }} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title="Add a recurring commitment"
          subtitle="Classes, meetings, workouts, family time — anything the schedule must protect."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              icon={<Plus className="h-4 w-4" />}
            >
              Add your first obligation
            </Button>
          }
        />
      )}

      <ObligationFormModal open={open} onClose={() => setOpen(false)} obligation={editing} />
    </div>
  );
}