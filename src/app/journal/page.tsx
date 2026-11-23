"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PlusIcon, SparkIcon } from "@/components/icons";
import { Button, Card, Chip, Empty, Eyebrow, Field, inputCls, PageHeader, Sheet, Toast } from "@/components/ui";
import { aiContext } from "@/lib/actions";
import { callAI } from "@/lib/ai";
import { journalPrompts, moodPattern } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { JournalEntry } from "@/lib/types";
import { cx, day, formatDate, formatShort, uid } from "@/lib/utils";

const MOODS = [
  { v: 1, label: "Heavy", icon: "☁︎" },
  { v: 2, label: "Low", icon: "◔" },
  { v: 3, label: "Steady", icon: "◑" },
  { v: 4, label: "Good", icon: "◕" },
  { v: 5, label: "Radiant", icon: "✦" },
] as const;

export default function JournalPage() {
  return (
    <AppShell feature="journal">
      <Suspense>
        <Journal />
      </Suspense>
    </AppShell>
  );
}

function Journal() {
  const { state, update, authHeader, isPremium } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("write")) setOpen(true);
  }, [params]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.journal.filter((j) => !q || j.text.toLowerCase().includes(q) || j.prompt.toLowerCase().includes(q));
  }, [state.journal, query]);

  const mood = moodPattern(state.journal);

  function save(entry: JournalEntry) {
    update((s) => ({ ...s, journal: [entry, ...s.journal] }), { activity: true });
    setOpen(false);
    if (params.get("write")) router.replace("/journal");
    setToast("Reflection saved.");
  }

  async function getInsight() {
    if (!isPremium) return router.push("/upgrade");
    setLoadingInsight(true);
    const res = await callAI<{ insight: string }>("journal", aiContext(state), await authHeader());
    setInsight(res?.insight ?? localInsight(state.journal));
    setLoadingInsight(false);
  }

  return (
    <>
      <PageHeader
        eyebrow="Journal & reflection"
        title="Your inner record"
        action={
          <Button className="h-11 w-11 !px-0" onClick={() => setOpen(true)} aria-label="New reflection">
            <PlusIcon width={20} height={20} />
          </Button>
        }
      />

      {state.journal.length > 0 && (
        <Card className="mb-5">
          <div className="flex items-center justify-between">
            <Eyebrow>Emotional pattern</Eyebrow>
            <span className="text-[12px] text-faint">last {mood.byDay.length} entries</span>
          </div>
          <div className="mt-4 flex h-20 items-end gap-1.5" aria-label="Mood by day">
            {mood.byDay.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${formatShort(d.date)}: ${d.mood.toFixed(1)}/5`}>
                <div className={cx("w-full max-w-4 rounded-t", d.mood >= 4 ? "bg-green-bright" : d.mood >= 3 ? "gold-fill" : "bg-rose/70")} style={{ height: `${(d.mood / 5) * 72}px` }} />
              </div>
            ))}
          </div>
          {insight ? (
            <p className="rise mt-4 rounded-xl bg-raised p-4 text-[14px] leading-relaxed text-cream">{insight}</p>
          ) : (
            <button onClick={getInsight} disabled={loadingInsight} className="mt-3 inline-flex min-h-11 items-center gap-2 text-[13px] font-bold text-gold disabled:opacity-50">
              <SparkIcon width={16} height={16} /> {loadingInsight ? "Reading your reflections…" : isPremium ? "Get an AI insight" : "AI insights with Premium"}
            </button>
          )}
        </Card>
      )}

      {state.journal.length > 3 && <input className={cx(inputCls, "mb-4")} placeholder="Search your reflections" value={query} onChange={(e) => setQuery(e.target.value)} />}

      {state.journal.length === 0 ? (
        <Empty title="Two minutes a day" body="Quick, guided reflections that connect how you feel to where you're going." action={<Button onClick={() => setOpen(true)}>Write my first reflection</Button>} />
      ) : (
        <ul className="space-y-3">
          {filtered.map((j) => {
            const goal = state.goals.find((g) => g.id === j.goalId);
            return (
              <li key={j.id} className="rounded-2xl border border-line bg-charcoal p-5">
                <div className="flex items-center justify-between text-[12px] text-faint">
                  <span>{formatDate(j.date)}</span>
                  <span>
                    {MOODS[j.mood - 1].icon} {MOODS[j.mood - 1].label}
                  </span>
                </div>
                <p className="mt-2 text-[13px] italic text-gold-light">{j.prompt}</p>
                <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed">{j.text}</p>
                {goal && <p className="mt-3 text-[12px] text-faint">Connected to “{goal.title}”</p>}
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={open} onClose={() => { setOpen(false); if (params.get("write")) router.replace("/journal"); }} title="Reflect">
        <EntryForm onSave={save} />
      </Sheet>
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

function EntryForm({ onSave }: { onSave: (e: JournalEntry) => void }) {
  const { state } = useStore();
  const prompts = journalPrompts(state);
  const [prompt, setPrompt] = useState(prompts[0]);
  const [text, setText] = useState("");
  const [mood, setMood] = useState<JournalEntry["mood"]>(3);
  const [goalId, setGoalId] = useState(() => state.goals.find((g) => prompts[0].includes(g.title))?.id ?? "");
  const goals = state.goals.filter((g) => !g.archived);
  return (
    <div className="space-y-5">
      <Field label="Prompt">
        <div className="space-y-2">
          {prompts.slice(0, 4).map((p) => (
            <button key={p} onClick={() => setPrompt(p)} className={cx("w-full rounded-xl border px-4 py-3 text-left text-[14px] transition", prompt === p ? "border-gold bg-gold/10 text-gold-light" : "border-line text-muted")}>
              {p}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Your reflection">
        <textarea autoFocus rows={5} className={inputCls} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write freely…" />
      </Field>
      <Field label="How do you feel?">
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map((m) => (
            <button key={m.v} onClick={() => setMood(m.v)} className={cx("flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-[11px] transition", mood === m.v ? "border-gold bg-gold/15 text-gold-light" : "border-line text-faint")}>
              <span className="text-[18px]">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </Field>
      {goals.length > 0 && (
        <Field label="Connect to a goal">
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            <Chip active={!goalId} onClick={() => setGoalId("")}>None</Chip>
            {goals.map((g) => (
              <Chip key={g.id} active={goalId === g.id} onClick={() => setGoalId(g.id)}>
                {g.title}
              </Chip>
            ))}
          </div>
        </Field>
      )}
      <Button
        className="w-full"
        disabled={!text.trim()}
        onClick={() => onSave({ id: uid(), date: day(), prompt, text: text.trim(), mood, goalId: goalId || undefined, createdAt: new Date().toISOString() })}
      >
        Save reflection
      </Button>
    </div>
  );
}

function localInsight(journal: JournalEntry[]): string {
  const p = moodPattern(journal);
  const linked = journal.filter((j) => j.goalId);
  const goalMood = linked.length ? linked.reduce((a, b) => a + b.mood, 0) / linked.length : undefined;
  const all = journal.reduce((a, b) => a + b.mood, 0) / Math.max(1, journal.length);
  if (goalMood && goalMood - all > 0.4) return "You feel noticeably better on days you reflect on a goal. Progress, even small, lifts your mood. Keep linking reflections to what you're building.";
  if (p.recentAvg && p.priorAvg && p.recentAvg < p.priorAvg) return "This week has felt heavier than last. Be gentle with yourself: choose one small, sure win tomorrow and let it count.";
  return "Your mood is steady. Consistency like this is the soil goals grow in. Try ending each reflection with one sentence about tomorrow's first step.";
}
