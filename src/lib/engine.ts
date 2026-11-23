/**
 * The Vision Alignment Engine.
 *
 * Everything here is deterministic and runs on-device, so the app is fully
 * usable without an AI key. When OPENAI_API_KEY is set, the API routes use the
 * model to word affirmations, milestones and insights, and fall back to these
 * functions on any error.
 */
import type { AppState, Category, Goal, Horizon, JournalEntry, Milestone } from "./types";
import { addDays, clamp, day, daysBetween, lowerFirst, parseDay, uid } from "./utils";

const VERBS = new Set([
  "launch", "build", "start", "grow", "buy", "pay", "save", "earn", "write", "publish", "run", "lose",
  "gain", "learn", "travel", "move", "create", "become", "find", "get", "reach", "open", "hire", "sell",
  "finish", "complete", "master", "make", "land", "scale", "invest", "heal", "train", "read", "speak",
  "host", "own", "double", "triple", "close", "visit", "plan", "release", "join", "lead", "design",
]);

function startsWithVerb(title: string): boolean {
  const first = title.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return VERBS.has(first);
}

function byText(goal: Goal): string {
  if (goal.deadline) {
    const d = parseDay(goal.deadline);
    return ` by ${d.toLocaleDateString(undefined, { month: "long", year: daysBetween(day(), goal.deadline) > 300 ? "numeric" : undefined })}`;
  }
  switch (goal.horizon) {
    case "This month":
      return " this month";
    case "This quarter":
      return " this quarter";
    case "This year":
      return " this year";
    default:
      return "";
  }
}

/** Personalised affirmations, tied to the user's real goals and progress. */
export function localAffirmations(state: AppState, count = 3, seed = Date.now()): { text: string; goalId?: string; action?: string }[] {
  const goals = activeGoals(state);
  const hold = state.profile.vision.holdingBack.trim().replace(/[.!]+$/, "");
  const feels = state.profile.vision.successFeels.trim().replace(/[.!]+$/, "");
  const out: { text: string; goalId?: string; action?: string }[] = [];
  const ordered = prioritise(goals);
  let i = seed % 7;
  for (const g of ordered) {
    if (out.length >= count) break;
    const title = lowerFirst(g.title);
    const verb = startsWithVerb(g.title);
    const pct = goalProgress(g);
    const by = byText(g);
    const templates = verb
      ? [
          `I am building the confidence to ${title}${by}.`,
          `Every focused step I take today moves me closer to the day I ${title}.`,
          `I have what it takes to ${title}${by}, and I prove it with today's action.`,
          pct > 0
            ? `I am ${pct}% of the way to my goal to ${title}, and my momentum is real.`
            : `I begin today. I am someone who follows through, and I will ${title}${by}.`,
        ]
      : [
          `I am creating ${title}${by}, one intentional choice at a time.`,
          `${capital(title)} is already on its way to me because I keep showing up.`,
          pct > 0
            ? `I am ${pct}% of the way to ${title}, and I am proud of my progress.`
            : `I am worthy of ${title}, and I am acting like it today.`,
        ];
    const next = nextMilestone(g);
    out.push({
      text: templates[i % templates.length],
      goalId: g.id,
      action: next ? next.title : `Write the very next step toward "${g.title}"`,
    });
    i += 3;
  }
  if (out.length < count && hold) {
    out.push({ text: `${hold.charAt(0).toUpperCase()}${hold.slice(1)} no longer decides what I am capable of. I move forward anyway.` });
  }
  if (out.length < count && feels) {
    out.push({ text: `I already know how success feels: ${lowerFirst(feels)}. I choose that feeling today.` });
  }
  const want = state.profile.vision.want.trim();
  if (out.length < count && want) {
    out.push({ text: `I am clear on what I want: ${lowerFirst(want)}. I move toward it with grace and grit.` });
  }
  return out.slice(0, count);
}

function capital(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const MILESTONE_TEMPLATES: Record<Category, string[]> = {
  Career: [
    "Define what success looks like in one paragraph",
    "List the 3 skills or connections that unlock this",
    "Have one conversation with someone already there",
    "Ship the first visible piece of work",
    "Review progress and set next month's focus",
  ],
  Wealth: [
    "Write down your current number and your target",
    "Choose one income lever or saving rule to start",
    "Automate a weekly transfer toward the goal",
    "Cut or renegotiate one recurring expense",
    "Review the numbers and adjust the plan",
  ],
  Health: [
    "Pick the one habit that moves this most",
    "Schedule it on your calendar for 3 days this week",
    "Track it daily for two weeks",
    "Add a second supporting habit",
    "Measure and celebrate the change",
  ],
  Relationships: [
    "Name what you want this relationship to feel like",
    "Plan one intentional moment this week",
    "Have the conversation you've been postponing",
    "Create a recurring ritual together",
    "Reflect on what's changed",
  ],
  "Personal Growth": [
    "Choose one book, course or mentor",
    "Block 30 minutes three times this week",
    "Apply one lesson in real life",
    "Share what you learned with someone",
    "Review and choose the next level",
  ],
  Lifestyle: [
    "Describe the lifestyle in vivid detail",
    "Price it out and set a target date",
    "Take one small step that makes it real now",
    "Remove one thing that doesn't fit the vision",
    "Book or commit to the first big piece",
  ],
  Spirituality: [
    "Choose a daily practice you'll keep for 7 days",
    "Create a space that supports it",
    "Journal on what's shifting each week",
    "Deepen with a retreat, community or teacher",
    "Reflect on who you're becoming",
  ],
};

/** Break a goal into weekly and monthly milestones. */
export function localMilestones(goal: Pick<Goal, "category" | "horizon" | "deadline" | "title">): Milestone[] {
  const base = MILESTONE_TEMPLATES[goal.category] ?? MILESTONE_TEMPLATES["Personal Growth"];
  const start = new Date();
  const end = goal.deadline ? parseDay(goal.deadline) : addDays(start, horizonDays(goal.horizon));
  const span = Math.max(7, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  // The first three steps are weekly, so they land in the next few weeks; the rest spread out to the deadline.
  const weekly = Math.min(3, base.length);
  const lastWeekly = Math.min(span, 7 * weekly);
  return base.map((title, idx) => {
    const offset =
      idx < weekly
        ? Math.min(span, 7 * (idx + 1))
        : Math.round(lastWeekly + ((span - lastWeekly) * (idx - weekly + 1)) / (base.length - weekly));
    const due = addDays(start, Math.max(3, offset));
    return {
      id: uid(),
      title,
      cadence: idx < 3 ? "weekly" : "monthly",
      due: day(due),
      done: false,
    } satisfies Milestone;
  });
}

export function horizonDays(h: Horizon): number {
  switch (h) {
    case "This month":
      return 30;
    case "This quarter":
      return 90;
    case "This year":
      return 365;
    default:
      return 1095;
  }
}

export function activeGoals(state: AppState): Goal[] {
  return state.goals.filter((g) => !g.archived && !g.completedAt);
}

export function goalProgress(g: Goal): number {
  if (g.completedAt) return 100;
  if (!g.milestones.length) return 0;
  return Math.round((g.milestones.filter((m) => m.done).length / g.milestones.length) * 100);
}

export function nextMilestone(g: Goal): Milestone | undefined {
  return [...g.milestones]
    .filter((m) => !m.done)
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))[0];
}

/** Order goals by urgency: nearest deadline / horizon first, lowest progress breaks ties. */
export function prioritise(goals: Goal[]): Goal[] {
  const today = day();
  const urgency = (g: Goal) => {
    const nm = nextMilestone(g);
    const due = nm?.due ?? g.deadline;
    const days = due ? daysBetween(today, due) : horizonDays(g.horizon);
    return days - (100 - goalProgress(g)) / 10;
  };
  return [...goals].sort((a, b) => urgency(a) - urgency(b));
}

export interface PriorityAction {
  goal: Goal;
  milestone?: Milestone;
  label: string;
  overdue: boolean;
}

export function todaysPriorities(state: AppState, limit = 3): PriorityAction[] {
  const today = day();
  return prioritise(activeGoals(state))
    .slice(0, limit)
    .map((goal) => {
      const milestone = nextMilestone(goal);
      return {
        goal,
        milestone,
        label: milestone ? milestone.title : `Break "${goal.title}" into milestones`,
        overdue: !!milestone?.due && milestone.due < today,
      };
    });
}

/* ---------------- Clarity Index ---------------- */

export interface ClarityBreakdown {
  score: number;
  clarity: number;
  consistency: number;
  progress: number;
}

export function clarityIndex(state: AppState, asOf: Date = new Date()): ClarityBreakdown {
  const asOfDay = day(asOf);
  const goals = state.goals.filter((g) => !g.archived && g.createdAt.slice(0, 10) <= asOfDay);
  // Clarity: are goals defined, motivated, broken down and visualised?
  let clarity = 0;
  if (goals.length) {
    const perGoal = goals.map((g) => {
      let s = 30;
      if (g.why?.trim()) s += 20;
      if (g.deadline) s += 15;
      if (g.milestones.length >= 3) s += 20;
      if (state.vision.some((v) => v.goalId === g.id || v.category === g.category)) s += 15;
      return s;
    });
    clarity = perGoal.reduce((a, b) => a + b, 0) / perGoal.length;
  }
  if (state.profile.vision.want.trim()) clarity = Math.min(100, clarity + 5);

  // Consistency: active days in the last 14 days, weighted toward recent days.
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < 14; i++) {
    const w = i < 7 ? 1.4 : 0.8;
    total += w;
    if ((state.activity[day(addDays(asOf, -i))] ?? 0) > 0) weighted += w;
  }
  const consistency = (weighted / total) * 100;

  // Progress: milestone completion, plus a boost for recent wins.
  const ms = goals.flatMap((g) => g.milestones);
  const doneByThen = ms.filter((m) => m.done && (m.doneAt ?? "").slice(0, 10) <= asOfDay);
  const completion = ms.length ? (doneByThen.length / ms.length) * 100 : 0;
  const recent = doneByThen.filter((m) => m.doneAt && daysBetween(m.doneAt.slice(0, 10), asOfDay) <= 7).length;
  const finished = state.goals.filter((g) => g.completedAt && g.completedAt.slice(0, 10) <= asOfDay).length;
  const progress = clamp(completion * 0.75 + Math.min(25, recent * 6) + finished * 10);

  const score = Math.round(clamp(clarity * 0.3 + consistency * 0.35 + progress * 0.35));
  return { score, clarity: Math.round(clarity), consistency: Math.round(consistency), progress: Math.round(progress) };
}

export type Trend = "improving" | "stable" | "slipping";

export function scoreTrend(state: AppState): { delta: number; trend: Trend; history: { date: string; score: number }[] } {
  const history: { date: string; score: number }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = day(addDays(new Date(), -i));
    const s = state.scores[d];
    if (typeof s === "number") history.push({ date: d, score: s });
  }
  const now = clarityIndex(state).score;
  const weekAgoKey = day(addDays(new Date(), -7));
  const started = state.profile.createdAt.slice(0, 10);
  // A new account has no week to compare yet, so measure from its first recorded score.
  const weekAgo =
    started > weekAgoKey
      ? (history[0]?.score ?? now)
      : (state.scores[weekAgoKey] ?? clarityIndex(state, addDays(new Date(), -7)).score);
  const delta = now - weekAgo;
  const trend: Trend = delta >= 3 ? "improving" : delta <= -3 ? "slipping" : "stable";
  return { delta, trend, history };
}

export function streak(state: AppState): number {
  let n = 0;
  let d = new Date();
  if (!(state.activity[day(d)] > 0)) d = addDays(d, -1); // today isn't over yet
  while (state.activity[day(d)] > 0) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/* ---------------- Alignment insights ---------------- */

export interface Insight {
  id: string;
  tone: "gold" | "green" | "muted";
  title: string;
  body: string;
  href?: string;
}

export function alignmentInsights(state: AppState): Insight[] {
  const out: Insight[] = [];
  const today = day();
  const goals = activeGoals(state);

  for (const g of goals) {
    const lastDone = g.milestones
      .filter((m) => m.doneAt)
      .map((m) => m.doneAt!.slice(0, 10))
      .sort()
      .pop();
    const since = daysBetween(lastDone ?? g.createdAt.slice(0, 10), today);
    const pct = goalProgress(g);
    if (!g.milestones.length) {
      out.push({
        id: `nomil-${g.id}`,
        tone: "gold",
        title: `"${g.title}" has no path yet`,
        body: "A vision without steps stays a wish. Break it into milestones so the app can guide your days.",
        href: `/goals/${g.id}`,
      });
    } else if (since >= 7) {
      out.push({
        id: `stale-${g.id}`,
        tone: "gold",
        title: `${since} days since you moved "${g.title}"`,
        body: `Your vision says this matters. Your actions say it's waiting. Try just one step: ${nextMilestone(g)?.title ?? "review the plan"}.`,
        href: `/goals/${g.id}`,
      });
    }
    if (g.deadline) {
      const left = daysBetween(today, g.deadline);
      const totalSpan = Math.max(1, daysBetween(g.createdAt.slice(0, 10), g.deadline));
      const elapsed = 100 - (left / totalSpan) * 100;
      if (left >= 0 && elapsed - pct > 30) {
        out.push({
          id: `behind-${g.id}`,
          tone: "gold",
          title: `"${g.title}" is behind its timeline`,
          body: `${left} ${left === 1 ? "day" : "days"} left and ${pct}% done. Consider narrowing the scope or moving the date, so the goal stays believable.`,
          href: `/goals/${g.id}`,
        });
      }
    }
    if (pct >= 60 && pct < 100) {
      out.push({
        id: `close-${g.id}`,
        tone: "green",
        title: `You're ${pct}% of the way to "${g.title}"`,
        body: "This is where most people coast. Protect the momentum: schedule the next milestone today.",
        href: `/goals/${g.id}`,
      });
    }
  }

  // Vision categories with no goals behind them.
  const goalCats = new Set(goals.map((g) => g.category));
  const visionCats = [...new Set(state.vision.map((v) => v.category))].filter((c) => !goalCats.has(c));
  for (const c of visionCats.slice(0, 2)) {
    out.push({
      id: `vis-${c}`,
      tone: "muted",
      title: `Your board dreams about ${c}, but no goal backs it`,
      body: `Turn one ${c.toLowerCase()} image into a goal with a date, so it becomes part of your plan.`,
      href: "/goals?new=1",
    });
  }

  // Emotional pattern from the journal.
  const mood = moodPattern(state.journal);
  if (mood.recentAvg && mood.priorAvg && mood.recentAvg - mood.priorAvg <= -0.8) {
    out.push({
      id: "mood-dip",
      tone: "muted",
      title: "Your energy has dipped this week",
      body: "Your reflections are heavier than last week. Choose smaller wins and keep your affirmation close today.",
      href: "/journal",
    });
  } else if (mood.recentAvg && mood.priorAvg && mood.recentAvg - mood.priorAvg >= 0.8) {
    out.push({
      id: "mood-up",
      tone: "green",
      title: "Your reflections are lighter this week",
      body: "Whatever you changed is working. Note it in your journal so you can repeat it.",
      href: "/journal",
    });
  }

  const anyDone = goals.some((g) => g.milestones.some((m) => m.done));
  if (!out.length && goals.length && !anyDone) {
    out.push({
      id: "fresh",
      tone: "gold",
      title: "Your plan is set. Now take the first step.",
      body: `Tick off "${todaysPriorities(state, 1)[0]?.label ?? "your first milestone"}" this week. One finished step does more for your momentum than a perfect plan.`,
      href: "/home",
    });
  }
  if (!out.length && goals.length) {
    out.push({
      id: "aligned",
      tone: "green",
      title: "Your actions match your vision",
      body: "Every active goal has moved recently. Keep the rhythm going and raise the bar when it feels easy.",
    });
  }
  return out;
}

export function moodPattern(journal: JournalEntry[]): { recentAvg?: number; priorAvg?: number; byDay: { date: string; mood: number }[] } {
  const today = day();
  const recent = journal.filter((j) => daysBetween(j.date, today) < 7);
  const prior = journal.filter((j) => {
    const d = daysBetween(j.date, today);
    return d >= 7 && d < 14;
  });
  const avg = (xs: JournalEntry[]) => (xs.length ? xs.reduce((a, b) => a + b.mood, 0) / xs.length : undefined);
  const map = new Map<string, number[]>();
  for (const j of journal) map.set(j.date, [...(map.get(j.date) ?? []), j.mood]);
  const byDay = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, ms]) => ({ date, mood: ms.reduce((a, b) => a + b, 0) / ms.length }));
  return { recentAvg: avg(recent), priorAvg: avg(prior), byDay };
}

/* ---------------- Journal prompts ---------------- */

export function journalPrompts(state: AppState): string[] {
  const [top] = prioritise(activeGoals(state));
  const prompts: string[] = [];
  if (top) {
    prompts.push(`What is one thing you did, or could do today, to move "${top.title}" forward?`);
    if (top.why) prompts.push(`You said "${top.title}" matters because ${lowerFirst(top.why)}. Does that still feel true?`);
  }
  const hold = state.profile.vision.holdingBack.trim();
  if (hold) prompts.push(`Where did "${lowerFirst(hold)}" show up today, and how did you respond?`);
  prompts.push("What are you proud of from the last 24 hours?");
  prompts.push("What would the future version of you do differently tomorrow?");
  prompts.push("What drained your energy today, and what restored it?");
  return prompts;
}

/* ---------------- Smart nudges ---------------- */

export interface Nudge {
  id: string;
  text: string;
  href: string;
  cta: string;
}

/**
 * Context-aware nudge. Returns at most one, and backs off when the user has
 * already been active today.
 */
export function smartNudge(state: AppState, now: Date = new Date()): Nudge | null {
  const n = state.profile.notifications;
  if (!n.enabled) return null;
  const today = day(now);
  const actionsToday = state.activity[today] ?? 0;
  const threshold = n.level === "gentle" ? 1 : n.level === "balanced" ? 2 : 3;
  if (actionsToday >= threshold) return null; // back off: they're engaged

  const h = now.getHours();
  const inWindow =
    (n.window === "morning" && h >= 6 && h < 12) ||
    (n.window === "midday" && h >= 11 && h < 16) ||
    (n.window === "evening" && h >= 17 && h < 23);

  const journaled = state.journal.some((j) => j.date === today);
  const [p] = todaysPriorities(state, 1);
  if (h >= 18 && !journaled) {
    return { id: "reflect", text: "Two minutes of reflection keeps today's lessons. Want to close the day?", href: "/journal", cta: "Reflect" };
  }
  if (p && (inWindow || p.overdue)) {
    return {
      id: `act-${p.goal.id}`,
      text: p.overdue ? `"${p.label}" slipped past its date. A small step today resets the streak.` : `Your highest-leverage move today: ${p.label}.`,
      href: `/goals/${p.goal.id}`,
      cta: "Do it",
    };
  }
  if (!state.affirmations.some((a) => a.date === today)) {
    return { id: "aff", text: "Your affirmation for today is ready.", href: "/affirmations", cta: "Read it" };
  }
  return null;
}
