"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SparkIcon } from "@/components/icons";
import { Card, Eyebrow, PageHeader, Progress, ScoreRing, Sparkline } from "@/components/ui";
import { aiContext } from "@/lib/actions";
import { callAI } from "@/lib/ai";
import { alignmentInsights, clarityIndex, goalProgress, scoreTrend, streak, type Insight } from "@/lib/engine";
import { useStore } from "@/lib/store";
import { addDays, cx, day } from "@/lib/utils";

export default function ProgressPage() {
  return (
    <AppShell feature="progress">
      <ProgressView />
    </AppShell>
  );
}

function ProgressView() {
  const { state, authHeader, isPremium } = useStore();
  const ci = clarityIndex(state);
  const { delta, trend } = scoreTrend(state);
  const [aiInsights, setAiInsights] = useState<Insight[] | null>(null);
  const [loading, setLoading] = useState(false);

  const series = useMemo(() => {
    const pts: number[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      const key = day(d);
      if (key < state.profile.createdAt.slice(0, 10)) continue;
      pts.push(state.scores[key] ?? clarityIndex(state, d).score);
    }
    return pts;
  }, [state]);

  const goals = state.goals.filter((g) => !g.archived);
  const achieved = goals.filter((g) => g.completedAt).length;
  const ms = goals.flatMap((g) => g.milestones);
  const msDone = ms.filter((m) => m.done).length;
  const current = streak(state);
  const best = bestStreak(state.activity);
  const insights = alignmentInsights(state);

  async function deeper() {
    setLoading(true);
    const res = await callAI<{ insights: { title: string; body: string; tone?: Insight["tone"] }[] }>("insights", aiContext(state), await authHeader());
    setAiInsights(
      res?.insights?.slice(0, 3).map((x, i) => ({ id: `ai-${i}`, title: x.title, body: x.body, tone: x.tone ?? "muted" })) ?? [
        { id: "none", tone: "muted", title: "Deeper insights need the AI connection", body: "Your on-device insights above are still current." },
      ],
    );
    setLoading(false);
  }

  return (
    <>
      <PageHeader eyebrow="Progress & insights" title="Your momentum" />

      <Card className="mb-4">
        <div className="flex items-center gap-5">
          <ScoreRing score={ci.score} size={108} stroke={9} />
          <div className="min-w-0">
            <Eyebrow>Clarity Index</Eyebrow>
            <p className="mt-1 font-display text-[20px] capitalize">{trend}</p>
            <p className={cx("text-[13px]", delta >= 0 ? "text-green-bright" : "text-rose")}>
              {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)} points vs last week
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {[
            { label: "Clarity", value: ci.clarity, hint: "Defined, motivated, visualised goals" },
            { label: "Consistency", value: ci.consistency, hint: "Days you showed up, last 2 weeks" },
            { label: "Progress", value: ci.progress, hint: "Milestones and wins" },
          ].map((r) => (
            <div key={r.label}>
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="text-muted">
                  {r.label} <span className="text-faint">· {r.hint}</span>
                </span>
                <span className="text-gold">{r.value}</span>
              </div>
              <Progress value={r.value} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <Eyebrow>28-day trend</Eyebrow>
        <div className="mt-3">
          <Sparkline points={series} />
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat value={`${current}`} label="day streak" />
        <Stat value={`${best}`} label="best streak" />
        <Stat value={ms.length ? `${Math.round((msDone / ms.length) * 100)}%` : "–"} label="milestones done" />
      </div>

      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <Eyebrow>Last 4 weeks</Eyebrow>
          <span className="text-[12px] text-faint">{achieved} goals achieved</span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Active days">
          {Array.from({ length: 28 }).map((_, i) => {
            const d = day(addDays(new Date(), i - 27));
            const n = state.activity[d] ?? 0;
            return <div key={d} title={`${d}: ${n} actions`} className={cx("aspect-square rounded-md", n === 0 ? "bg-raised" : n < 3 ? "bg-gold/40" : n < 6 ? "bg-gold/70" : "gold-fill")} />;
          })}
        </div>
      </Card>

      {goals.length > 0 && (
        <Card className="mb-4">
          <Eyebrow>Goal completion</Eyebrow>
          <ul className="mt-3 space-y-3">
            {goals.map((g) => (
              <li key={g.id}>
                <Link href={`/goals/${g.id}`} className="block">
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className="truncate">{g.title}</span>
                    <span className="text-gold">{goalProgress(g)}%</span>
                  </div>
                  <Progress value={goalProgress(g)} tone={g.completedAt ? "green" : "gold"} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section className="mb-4">
        <h2 className="mb-3 text-[22px]">Alignment insights</h2>
        <div className="space-y-3">
          {[...insights, ...(aiInsights ?? [])].map((ins) => (
            <InsightCard key={ins.id} ins={ins} />
          ))}
          {!insights.length && !aiInsights && <p className="text-muted">Add a goal and a few days of activity to see insights.</p>}
        </div>
        {!aiInsights &&
          (isPremium ? (
            <button onClick={deeper} disabled={loading} className="mt-3 inline-flex min-h-11 items-center gap-2 text-[13px] font-bold text-gold disabled:opacity-50">
              <SparkIcon width={16} height={16} /> {loading ? "Analysing your patterns…" : "Ask AI for a deeper read"}
            </button>
          ) : (
            <Link href="/upgrade" className="mt-3 inline-flex min-h-11 items-center gap-2 text-[13px] font-bold text-gold">
              <SparkIcon width={16} height={16} /> Deeper AI insights with Premium
            </Link>
          ))}
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-charcoal p-4 text-center">
      <p className="font-display text-[26px] text-gold-light">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-faint">{label}</p>
    </div>
  );
}

function InsightCard({ ins }: { ins: Insight }) {
  const body = (
    <div className={cx("rounded-2xl border bg-charcoal p-5", ins.tone === "gold" ? "border-gold/40" : ins.tone === "green" ? "border-green/60" : "border-line")}>
      <p className={cx("font-display text-[17px] leading-snug", ins.tone === "green" && "text-green-bright", ins.tone === "gold" && "text-gold-light")}>{ins.title}</p>
      <p className="mt-1.5 text-[14px] text-muted">{ins.body}</p>
    </div>
  );
  return ins.href ? <Link href={ins.href}>{body}</Link> : body;
}

function bestStreak(activity: Record<string, number>): number {
  const days = Object.keys(activity)
    .filter((d) => activity[d] > 0)
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && day(addDays(new Date(prev + "T12:00:00"), 1)) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
