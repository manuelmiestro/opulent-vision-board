"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GoalForm } from "@/components/GoalForm";
import { BackIcon, CheckIcon, RefreshIcon } from "@/components/icons";
import { Button, Card, Eyebrow, inputCls, Progress, Sheet, Toast } from "@/components/ui";
import { VisionTile } from "@/components/VisionTile";
import { generateMilestones } from "@/lib/actions";
import { goalProgress } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Goal, Milestone } from "@/lib/types";
import { cx, day, daysBetween, formatDate, formatShort, uid } from "@/lib/utils";

export default function GoalPage() {
  return (
    <AppShell feature="goals">
      <GoalDetail />
    </AppShell>
  );
}

function GoalDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, update, authHeader } = useStore();
  const router = useRouter();
  const goal = state.goals.find((g) => g.id === id);
  const [editing, setEditing] = useState(false);
  const [newStep, setNewStep] = useState("");
  const [regen, setRegen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!goal) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-[22px]">Goal not found</p>
        <Link href="/goals" className="mt-4 inline-block text-gold">Back to goals</Link>
      </div>
    );
  }

  const g = goal;
  const pct = goalProgress(g);
  const linked = state.vision.filter((v) => v.goalId === g.id);
  const daysLeft = g.deadline ? daysBetween(day(), g.deadline) : null;

  const patch = (p: Partial<Goal>, activity = false) => update((s) => ({ ...s, goals: s.goals.map((x) => (x.id === g.id ? { ...x, ...p } : x)) }), { activity });
  const patchMilestones = (fn: (ms: Milestone[]) => Milestone[], activity = false) => patch({ milestones: fn(g.milestones) }, activity);

  function toggle(m: Milestone) {
    const done = !m.done;
    patchMilestones((ms) => ms.map((x) => (x.id === m.id ? { ...x, done, doneAt: done ? new Date().toISOString() : undefined } : x)), done);
    if (done) {
      const remaining = g.milestones.filter((x) => !x.done && x.id !== m.id).length;
      setToast(remaining === 0 ? "Every milestone done. Time to celebrate?" : `Done. ${remaining} to go.`);
    }
  }

  async function regenerate() {
    setRegen(true);
    const fresh = await generateMilestones(g, await authHeader());
    patchMilestones((ms) => [...ms.filter((m) => m.done), ...fresh]);
    setRegen(false);
    setToast("Fresh plan ready.");
  }

  function complete() {
    patch({ completedAt: new Date().toISOString() }, true);
    setCelebrate(true);
  }

  return (
    <>
      <Link href="/goals" className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-2 px-2 text-muted hover:text-cream">
        <BackIcon width={18} height={18} /> Goals
      </Link>

      <header className="mb-6">
        <Eyebrow>
          {g.category} · {g.horizon}
        </Eyebrow>
        <h1 className="mt-2 text-[30px] leading-tight">{g.title}</h1>
        {g.why && <p className="mt-2 text-muted">Why: {g.why}</p>}
      </header>

      <Card className="mb-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-display text-[40px] leading-none text-gold">{pct}%</p>
            <p className="mt-1 text-[13px] text-faint">
              {g.milestones.filter((m) => m.done).length} of {g.milestones.length} milestones
            </p>
          </div>
          {g.deadline && (
            <div className="text-right">
              <p className="text-[13px] text-muted">{formatDate(g.deadline)}</p>
              <p className={cx("text-[12px]", daysLeft! < 0 ? "text-rose" : "text-faint")}>{daysLeft! < 0 ? `${-daysLeft!} ${-daysLeft! === 1 ? "day" : "days"} past` : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}</p>
            </div>
          )}
        </div>
        <Progress value={pct} tone={g.completedAt ? "green" : "gold"} className="mt-4" />
      </Card>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[22px]">Milestones</h2>
          {!g.completedAt && (
            <button onClick={regenerate} disabled={regen} className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-gold disabled:opacity-50">
              <RefreshIcon width={16} height={16} className={regen ? "animate-spin" : ""} /> {regen ? "Planning…" : "Re-plan with AI"}
            </button>
          )}
        </div>
        <ul className="space-y-2">
          {[...g.milestones]
            .sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? "").localeCompare(b.due ?? ""))
            .map((m) => (
              <li key={m.id} className="group flex items-center gap-3 rounded-2xl border border-line bg-charcoal py-1 pl-1 pr-3">
                <button
                  onClick={() => toggle(m)}
                  className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition", m.done ? "text-green-bright" : "text-faint hover:text-gold")}
                  aria-label={m.done ? "Mark not done" : "Mark done"}
                >
                  {m.done ? <CheckIcon width={20} height={20} /> : <span className="h-5 w-5 rounded-full border-[1.5px] border-current" />}
                </button>
                <div className="min-w-0 flex-1 py-2">
                  <p className={cx("text-[14px]", m.done && "text-faint line-through")}>{m.title}</p>
                  <p className="text-[11px] uppercase tracking-wider text-faint">
                    {m.cadence}
                    {m.due && ` · ${formatShort(m.due)}`}
                  </p>
                </div>
                <button onClick={() => patchMilestones((ms) => ms.filter((x) => x.id !== m.id))} className="h-9 w-9 text-faint opacity-60 hover:text-rose group-hover:opacity-100" aria-label="Delete milestone">
                  ✕
                </button>
              </li>
            ))}
        </ul>
        {!g.completedAt && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newStep.trim()) return;
              patchMilestones((ms) => [...ms, { id: uid(), title: newStep.trim(), cadence: "weekly", done: false }]);
              setNewStep("");
            }}
          >
            <input className={inputCls} placeholder="Add your own step" value={newStep} onChange={(e) => setNewStep(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={!newStep.trim()}>
              Add
            </Button>
          </form>
        )}
      </section>

      {linked.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-[22px]">On your board</h2>
          <div className="columns-2 gap-3">
            {linked.map((v) => (
              <VisionTile key={v.id} item={v} goals={state.goals} />
            ))}
          </div>
        </section>
      )}

      <div className="space-y-3 pb-4">
        {!g.completedAt ? (
          <Button className="w-full" onClick={complete}>
            I achieved this goal
          </Button>
        ) : (
          <Button variant="secondary" className="w-full" onClick={() => patch({ completedAt: undefined })}>
            Reopen goal
          </Button>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="ghost" className="flex-1" onClick={() => patch({ archived: !g.archived })}>
            {g.archived ? "Unarchive" : "Archive"}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm(`Delete "${g.title}" and its milestones?`)) {
                update((s) => ({ ...s, goals: s.goals.filter((x) => x.id !== g.id), vision: s.vision.map((v) => (v.goalId === g.id ? { ...v, goalId: undefined } : v)) }));
                router.replace("/goals");
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit goal">
        <GoalForm
          initial={g}
          submitLabel="Save changes"
          onSubmit={(d) => {
            patch(d);
            setEditing(false);
          }}
        />
      </Sheet>

      {celebrate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 px-8 text-center" onClick={() => setCelebrate(false)}>
          <div>
            <div className="pop mx-auto flex h-24 w-24 items-center justify-center rounded-full gold-fill text-ink">
              <CheckIcon width={44} height={44} />
            </div>
            <p className="rise mt-8 text-[12px] font-bold uppercase tracking-[0.2em] text-gold">Vision realised</p>
            <h2 className="rise mt-3 text-[32px] leading-tight">You did it, {state.profile.name || "visionary"}.</h2>
            <p className="rise mt-3 text-muted">“{g.title}” is now part of your story. Take a moment to feel it.</p>
            <Button className="mt-8" onClick={() => router.push("/journal?write=1")}>
              Capture this moment
            </Button>
          </div>
        </div>
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
