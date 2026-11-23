"use client";

import { callAI } from "./ai";
import { localAffirmations, localMilestones } from "./engine";
import type { Affirmation, AppState, Goal, Milestone } from "./types";
import { addDays, day, uid } from "./utils";

/** Compact, privacy-light summary of the user's world for the AI. */
export function aiContext(state: AppState) {
  return {
    name: state.profile.name,
    vision: state.profile.vision,
    today: day(),
    goals: state.goals
      .filter((g) => !g.archived)
      .map((g) => ({
        id: g.id,
        title: g.title,
        category: g.category,
        horizon: g.horizon,
        deadline: g.deadline,
        why: g.why,
        completed: !!g.completedAt,
        milestones: g.milestones.map((m) => ({ title: m.title, done: m.done, due: m.due, doneAt: m.doneAt?.slice(0, 10) })),
      })),
    recentJournal: state.journal.slice(0, 8).map((j) => ({ date: j.date, mood: j.mood, text: j.text.slice(0, 300) })),
    activeDaysLast14: Object.entries(state.activity).filter(([d, n]) => n > 0 && d >= day(addDays(new Date(), -14))).length,
  };
}

export async function generateAffirmations(state: AppState, count: number, headers: Record<string, string>): Promise<Affirmation[]> {
  const ai = await callAI<{ affirmations: { text: string; goalId?: string | null; action?: string }[] }>(
    "affirmations",
    { ...aiContext(state), count },
    headers,
  );
  const goalIds = new Set(state.goals.map((g) => g.id));
  const raw =
    ai?.affirmations?.filter((a) => a && typeof a.text === "string" && a.text.trim()).slice(0, count) ??
    localAffirmations(state, count, Date.now() + state.affirmations.length);
  const now = new Date().toISOString();
  return raw.map((a) => ({
    id: uid(),
    text: a.text.trim(),
    goalId: a.goalId && goalIds.has(a.goalId) ? a.goalId : undefined,
    action: a.action ?? undefined,
    date: day(),
    createdAt: now,
  }));
}

export async function generateMilestones(goal: Pick<Goal, "title" | "category" | "horizon" | "deadline" | "why">, headers: Record<string, string>): Promise<Milestone[]> {
  const ai = await callAI<{ milestones: { title: string; cadence: "weekly" | "monthly"; dueInDays: number }[] }>(
    "milestones",
    { ...goal, today: day() },
    headers,
  );
  if (ai?.milestones?.length) {
    return ai.milestones.slice(0, 6).map((m) => ({
      id: uid(),
      title: String(m.title).slice(0, 120),
      cadence: m.cadence === "monthly" ? "monthly" : "weekly",
      due: day(addDays(new Date(), Math.max(1, Math.min(2000, Number(m.dueInDays) || 7)))),
      done: false,
    }));
  }
  return localMilestones(goal);
}

export function todaysAffirmations(state: AppState): Affirmation[] {
  const today = day();
  return state.affirmations.filter((a) => a.date === today);
}

/** Free plan limits; premium removes them. */
export const FREE_LIMITS = { goals: 3, regenerationsPerDay: 1, visionItems: 12 };
