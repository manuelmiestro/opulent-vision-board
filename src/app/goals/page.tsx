"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GoalForm, type GoalDraft } from "@/components/GoalForm";
import { PlusIcon } from "@/components/icons";
import { Button, Chip, Empty, PageHeader, Progress, Sheet } from "@/components/ui";
import { FREE_LIMITS, generateMilestones } from "@/lib/actions";
import { goalProgress, nextMilestone, prioritise } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { formatShort, uid } from "@/lib/utils";

export default function GoalsPage() {
  return (
    <AppShell feature="goals">
      <Suspense>
        <Goals />
      </Suspense>
    </AppShell>
  );
}

function Goals() {
  const { state, update, authHeader, isPremium } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<"active" | "done" | "archived">("active");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (params.get("new")) setOpen(true);
  }, [params]);

  const active = prioritise(state.goals.filter((g) => !g.archived && !g.completedAt));
  const done = state.goals.filter((g) => g.completedAt && !g.archived);
  const archived = state.goals.filter((g) => g.archived);
  const list = tab === "active" ? active : tab === "done" ? done : archived;
  const atLimit = !isPremium && active.length >= FREE_LIMITS.goals;

  async function create(d: GoalDraft) {
    setBusy(true);
    const milestones = await generateMilestones(d, await authHeader());
    const goal: Goal = { id: uid(), ...d, milestones, createdAt: new Date().toISOString() };
    update((s) => ({ ...s, goals: [goal, ...s.goals] }), { activity: true });
    setBusy(false);
    setOpen(false);
    router.push(`/goals/${goal.id}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Goals & milestones"
        title="Your path forward"
        action={
          <Button className="h-11 w-11 !px-0" onClick={() => (atLimit ? router.push("/upgrade") : setOpen(true))} aria-label="New goal">
            <PlusIcon width={20} height={20} />
          </Button>
        }
      />
      <div className="mb-5 flex gap-2">
        <Chip active={tab === "active"} onClick={() => setTab("active")}>Active · {active.length}</Chip>
        <Chip active={tab === "done"} onClick={() => setTab("done")}>Achieved · {done.length}</Chip>
        {archived.length > 0 && <Chip active={tab === "archived"} onClick={() => setTab("archived")}>Archived</Chip>}
      </div>

      {atLimit && tab === "active" && (
        <Link href="/upgrade" className="mb-4 block rounded-2xl border border-gold/40 bg-gold/10 p-4 text-[14px] text-gold-light">
          Free plan holds {FREE_LIMITS.goals} active goals. Upgrade for unlimited goals →
        </Link>
      )}

      {list.length === 0 ? (
        tab === "active" ? (
          <Empty title="No active goals" body="Add a goal and we'll break it into weekly and monthly milestones." action={<Button onClick={() => setOpen(true)}>Add a goal</Button>} />
        ) : (
          <p className="py-10 text-center text-muted">{tab === "done" ? "Your wins will gather here." : "Nothing archived."}</p>
        )
      ) : (
        <ul className="space-y-3">
          {list.map((g) => {
            const pct = goalProgress(g);
            const next = nextMilestone(g);
            return (
              <li key={g.id}>
                <Link href={`/goals/${g.id}`} className="block rounded-2xl border border-line bg-charcoal p-5 transition hover:border-gold/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
                        {g.category} · {g.deadline ? formatShort(g.deadline) : g.horizon}
                      </p>
                      <p className="mt-1 font-display text-[19px] leading-snug">{g.title}</p>
                    </div>
                    <span className="font-display text-[20px] text-gold">{pct}%</span>
                  </div>
                  <Progress value={pct} tone={g.completedAt ? "green" : "gold"} className="mt-4" />
                  {next && !g.completedAt && <p className="mt-3 truncate text-[13px] text-muted">Next: {next.title}</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={open} onClose={() => { setOpen(false); if (params.get("new")) router.replace("/goals"); }} title="New goal">
        <GoalForm submitLabel={busy ? "Building your plan…" : "Create goal & plan"} busy={busy} onSubmit={create} />
      </Sheet>
    </>
  );
}
