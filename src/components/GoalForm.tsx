"use client";

import { useState } from "react";
import { Button, Chip, Field, inputCls } from "./ui";
import { CATEGORIES, HORIZONS, type Category, type Goal, type Horizon } from "@/lib/types";

export type GoalDraft = Pick<Goal, "title" | "category" | "horizon" | "deadline" | "why">;

export function GoalForm({ initial, submitLabel, onSubmit, busy }: { initial?: Partial<GoalDraft>; submitLabel: string; onSubmit: (g: GoalDraft) => void; busy?: boolean }) {
  const [g, setG] = useState<GoalDraft>({
    title: initial?.title ?? "",
    category: initial?.category ?? "Career",
    horizon: initial?.horizon ?? "This year",
    deadline: initial?.deadline,
    why: initial?.why ?? "",
  });
  const set = (p: Partial<GoalDraft>) => setG((x) => ({ ...x, ...p }));
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (g.title.trim()) onSubmit({ ...g, title: g.title.trim(), why: g.why?.trim() || undefined, deadline: g.deadline || undefined });
      }}
    >
      <Field label="Goal">
        <input autoFocus className={inputCls} placeholder="e.g. Pay off my car" value={g.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Category">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {CATEGORIES.map((c) => (
            <Chip key={c} active={g.category === c} onClick={() => set({ category: c as Category })}>
              {c}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Time horizon">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {HORIZONS.map((h) => (
            <Chip key={h} active={g.horizon === h} onClick={() => set({ horizon: h as Horizon })}>
              {h}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Target date (optional)">
        <input type="date" className={inputCls} value={g.deadline ?? ""} onChange={(e) => set({ deadline: e.target.value || undefined })} />
      </Field>
      <Field label="Why it matters (optional)" hint="Your why powers your affirmations.">
        <textarea rows={2} className={inputCls} value={g.why ?? ""} onChange={(e) => set({ why: e.target.value })} />
      </Field>
      <Button type="submit" className="w-full" disabled={!g.title.trim()} loading={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
