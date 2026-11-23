"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ArrowIcon, CheckIcon, GearIcon, SparkIcon } from "@/components/icons";
import { Card, Eyebrow, Progress, ScoreRing, Toast } from "@/components/ui";
import { generateAffirmations, todaysAffirmations } from "@/lib/actions";
import { alignmentInsights, goalProgress, journalPrompts, scoreTrend, smartNudge, streak, todaysPriorities, clarityIndex } from "@/lib/engine";
import { useStore } from "@/lib/store";
import { DASHBOARD_CARDS, type AppState } from "@/lib/types";
import { cx, day, formatShort, greeting } from "@/lib/utils";

const CARD_FEATURE: Record<string, string> = {
  board: "board",
  journal: "journal",
  score: "progress",
  milestones: "goals",
  affirmation: "affirmations",
};

export default function Home() {
  return (
    <AppShell feature="home">
      <Dashboard />
    </AppShell>
  );
}

function Dashboard() {
  const { state, update, authHeader } = useStore();
  const [toast, setToast] = useState<string | null>(null);
  const generating = useRef(false);
  const today = todaysAffirmations(state);

  // Serve today's affirmations once per day.
  useEffect(() => {
    if (today.length || generating.current || !state.goals.length) return;
    generating.current = true;
    (async () => {
      const fresh = await generateAffirmations(state, 3, await authHeader());
      update((s) => ({ ...s, affirmations: [...fresh, ...s.affirmations].slice(0, 300) }));
      generating.current = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today.length]);

  const order = useMemo(() => cardOrder(state), [state]);
  const nudge = smartNudge(state);
  const insight = alignmentInsights(state)[0];

  function completeMilestone(goalId: string, milestoneId: string) {
    update(
      (s) => ({
        ...s,
        goals: s.goals.map((g) =>
          g.id !== goalId ? g : { ...g, milestones: g.milestones.map((m) => (m.id === milestoneId ? { ...m, done: true, doneAt: new Date().toISOString() } : m)) },
        ),
      }),
      { activity: true },
    );
    setToast("Beautiful. One step closer.");
  }

  const cards: Record<string, React.ReactNode> = {
    priority: <PriorityCard key="priority" state={state} onDone={completeMilestone} />,
    affirmation: <AffirmationCard key="affirmation" state={state} />,
    score: <ScoreCard key="score" state={state} />,
    board: <BoardCard key="board" state={state} />,
    journal: <JournalCard key="journal" state={state} />,
    milestones: <MilestonesCard key="milestones" state={state} />,
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="text-muted">{greeting()},</p>
          <h1 className="text-[30px] leading-tight">{state.profile.name || "Visionary"}</h1>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/affirmations" className="flex h-11 w-11 items-center justify-center rounded-full text-gold hover:bg-raised" aria-label="Affirmations">
            <SparkIcon />
          </Link>
          <Link href="/settings" className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-cream" aria-label="Settings">
            <GearIcon />
          </Link>
        </div>
      </header>

      {nudge && (
        <Link href={nudge.href} className="rise flex items-center gap-4 rounded-2xl border border-gold/40 bg-gold/10 p-4">
          <span className="flex-1 text-[14px] text-gold-light">{nudge.text}</span>
          <span className="shrink-0 rounded-full gold-fill px-4 py-2 text-[12px] font-bold text-ink">{nudge.cta}</span>
        </Link>
      )}

      {order.map((id) => cards[id])}

      {insight && (
        <Card className="rise">
          <Eyebrow className={cx(insight.tone === "green" && "text-green-bright", insight.tone === "muted" && "text-muted")}>Alignment insight</Eyebrow>
          <p className="mt-2 font-display text-[18px] leading-snug">{insight.title}</p>
          <p className="mt-1.5 text-muted">{insight.body}</p>
          <Link href="/progress" className="mt-3 inline-flex min-h-11 items-center gap-1 text-[13px] font-bold text-gold">
            All insights <ArrowIcon width={16} height={16} />
          </Link>
        </Card>
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function cardOrder(state: AppState): string[] {
  const saved = state.profile.dashboard.filter((c) => (DASHBOARD_CARDS as readonly string[]).includes(c));
  const all = [...saved, ...DASHBOARD_CARDS.filter((c) => !saved.includes(c))];
  if (!state.profile.adaptiveDashboard) return all;
  // Priority stays on top; the rest follow what this person opens most.
  const [first, ...rest] = all;
  return [first, ...rest.sort((a, b) => (state.usage[CARD_FEATURE[b]] ?? 0) - (state.usage[CARD_FEATURE[a]] ?? 0))];
}

function PriorityCard({ state, onDone }: { state: AppState; onDone: (goalId: string, milestoneId: string) => void }) {
  const items = todaysPriorities(state, 3);
  if (!items.length) {
    return (
      <Card>
        <Eyebrow>Today's priority</Eyebrow>
        <p className="mt-2 font-display text-[18px]">Set a goal to get your first next step.</p>
        <Link href="/goals?new=1" className="mt-3 inline-flex min-h-11 items-center text-gold">Add a goal →</Link>
      </Card>
    );
  }
  const [top, ...more] = items;
  return (
    <Card className="rise">
      <Eyebrow>Today's top priority</Eyebrow>
      <div className="mt-3 flex items-start gap-4">
        {top.milestone ? (
          <button
            onClick={() => onDone(top.goal.id, top.milestone!.id)}
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-gold text-gold transition hover:bg-gold hover:text-ink"
            aria-label={`Mark "${top.label}" done`}
          >
            <CheckIcon width={20} height={20} />
          </button>
        ) : null}
        <Link href={`/goals/${top.goal.id}`} className="min-w-0 flex-1">
          <p className="font-display text-[20px] leading-snug">{top.label}</p>
          <p className={cx("mt-1 text-[13px]", top.overdue ? "text-rose" : "text-faint")}>
            {top.goal.title}
            {top.milestone?.due && ` · ${top.overdue ? "was due" : "due"} ${formatShort(top.milestone.due)}`}
          </p>
        </Link>
      </div>
      {more.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-line pt-3">
          {more.map((p) => (
            <li key={p.goal.id} className="flex items-center gap-3">
              {p.milestone && (
                <button onClick={() => onDone(p.goal.id, p.milestone!.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-faint hover:text-gold" aria-label={`Mark "${p.label}" done`}>
                  <span className="h-5 w-5 rounded-full border border-current" />
                </button>
              )}
              <Link href={`/goals/${p.goal.id}`} className="min-w-0 flex-1 truncate py-2 text-[14px] text-muted hover:text-cream">
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AffirmationCard({ state }: { state: AppState }) {
  const aff = todaysAffirmations(state)[0];
  return (
    <Link href="/affirmations" className="rise block rounded-2xl border border-gold/30 bg-gradient-to-br from-charcoal to-ink p-5">
      <Eyebrow>Today's affirmation</Eyebrow>
      {aff ? (
        <p className="mt-3 font-display text-[21px] leading-snug text-gold-light">“{aff.text}”</p>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="skeleton h-5 w-full rounded" />
          <div className="skeleton h-5 w-3/4 rounded" />
        </div>
      )}
      {aff?.action && <p className="mt-3 text-[13px] text-muted">Pair it with: {aff.action}</p>}
    </Link>
  );
}

function ScoreCard({ state }: { state: AppState }) {
  const { score } = clarityIndex(state);
  const { delta } = scoreTrend(state);
  const s = streak(state);
  return (
    <Link href="/progress" className="rise flex items-center gap-5 rounded-2xl border border-line bg-charcoal p-5 transition hover:border-gold/40">
      <ScoreRing score={score} size={84} stroke={7} />
      <div className="min-w-0">
        <Eyebrow>Clarity Score</Eyebrow>
        <p className="mt-1 text-muted">{score >= 70 ? "Your actions and vision are in sync." : score >= 40 ? "You're building momentum. Keep showing up." : "Small daily steps will lift this fast."}</p>
        <p className="mt-1.5 text-[13px]">
          <span className={delta >= 0 ? "text-green-bright" : "text-rose"}>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)} this week
          </span>
          <span className="text-faint"> · {s} day streak</span>
        </p>
      </div>
    </Link>
  );
}

function BoardCard({ state }: { state: AppState }) {
  const items = state.vision.slice(0, 4);
  return (
    <Link href="/board" className="rise block rounded-2xl border border-line bg-charcoal p-5 transition hover:border-gold/40">
      <div className="flex items-center justify-between">
        <Eyebrow>Your vision board</Eyebrow>
        <span className="text-[12px] text-faint">{state.vision.length} {state.vision.length === 1 ? "piece" : "pieces"}</span>
      </div>
      {items.length ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {items.map((v) => (
            <div key={v.id} className="aspect-square overflow-hidden rounded-lg bg-raised">
              {v.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.content} alt={v.caption ?? ""} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center p-1.5 text-center font-display text-[10px] leading-tight text-gold-light">{v.type === "text" ? v.content.slice(0, 40) : v.type === "video" ? "▶ Video" : "♪ Audio"}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-muted">Add the images, words and sounds of the life you're creating.</p>
      )}
    </Link>
  );
}

function JournalCard({ state }: { state: AppState }) {
  const prompt = journalPrompts(state)[new Date().getDate() % 3] ?? journalPrompts(state)[0];
  const done = state.journal.some((j) => j.date === day());
  return (
    <Link href="/journal?write=1" className="rise block rounded-2xl border border-line bg-charcoal p-5 transition hover:border-gold/40">
      <div className="flex items-center justify-between">
        <Eyebrow>Reflection</Eyebrow>
        {done && <span className="text-[12px] text-green-bright">✓ Done today</span>}
      </div>
      <p className="mt-2 font-display text-[18px] leading-snug">{prompt}</p>
      <p className="mt-2 text-[13px] text-gold">Write for two minutes →</p>
    </Link>
  );
}

function MilestonesCard({ state }: { state: AppState }) {
  const upcoming = state.goals
    .filter((g) => !g.archived && !g.completedAt)
    .flatMap((g) => g.milestones.filter((m) => !m.done && m.due).map((m) => ({ g, m })))
    .sort((a, b) => a.m.due!.localeCompare(b.m.due!))
    .slice(0, 4);
  const goals = state.goals.filter((g) => !g.archived && !g.completedAt).slice(0, 3);
  return (
    <Link href="/goals" className="rise block rounded-2xl border border-line bg-charcoal p-5 transition hover:border-gold/40">
      <Eyebrow>Upcoming milestones</Eyebrow>
      {upcoming.length ? (
        <ul className="mt-3 space-y-2.5">
          {upcoming.map(({ g, m }) => (
            <li key={m.id} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[14px]">{m.title}</span>
              <span className="shrink-0 text-[12px] text-faint">{formatShort(m.due)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted">No milestones scheduled.</p>
      )}
      {goals.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          {goals.map((g) => (
            <div key={g.id}>
              <div className="mb-1.5 flex justify-between text-[12px]">
                <span className="truncate text-muted">{g.title}</span>
                <span className="text-gold">{goalProgress(g)}%</span>
              </div>
              <Progress value={goalProgress(g)} />
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
