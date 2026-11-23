"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HeartIcon, RefreshIcon } from "@/components/icons";
import { Button, Chip, Empty, inputCls, PageHeader, Sheet, Toast } from "@/components/ui";
import { FREE_LIMITS, generateAffirmations, todaysAffirmations } from "@/lib/actions";
import { useStore } from "@/lib/store";
import type { Affirmation } from "@/lib/types";
import { cx, day, formatDate } from "@/lib/utils";

export default function AffirmationsPage() {
  return (
    <AppShell feature="affirmations">
      <Affirmations />
    </AppShell>
  );
}

function Affirmations() {
  const { state, update, authHeader, isPremium } = useStore();
  const [tab, setTab] = useState<"today" | "favorites" | "history">("today");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Affirmation | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const today = todaysAffirmations(state);
  const regenKey = `regen:${day()}`;
  const regensToday = state.usage[regenKey] ?? 0;
  const canRegen = isPremium || regensToday < FREE_LIMITS.regenerationsPerDay;

  async function regenerate() {
    if (!canRegen) return setToast("Premium unlocks unlimited fresh affirmations.");
    setBusy(true);
    const fresh = await generateAffirmations(state, 3, await authHeader());
    update((s) => ({
      ...s,
      usage: { ...s.usage, [regenKey]: (s.usage[regenKey] ?? 0) + 1 },
      // Keep favourites from today, replace the rest.
      affirmations: [...fresh, ...s.affirmations.filter((a) => a.date !== day() || a.favorite)].slice(0, 300),
    }));
    setBusy(false);
  }

  const toggleFav = (a: Affirmation) => update((s) => ({ ...s, affirmations: s.affirmations.map((x) => (x.id === a.id ? { ...x, favorite: !x.favorite } : x)) }));

  const favorites = state.affirmations.filter((a) => a.favorite);
  const history = state.affirmations.filter((a) => a.date !== day());
  const byDate = history.reduce<Record<string, Affirmation[]>>((acc, a) => ((acc[a.date] ||= []).push(a), acc), {});

  return (
    <>
      <PageHeader eyebrow="Affirmations" title="Words for who you're becoming" />
      <div className="mb-5 flex gap-2">
        <Chip active={tab === "today"} onClick={() => setTab("today")}>Today</Chip>
        <Chip active={tab === "favorites"} onClick={() => setTab("favorites")}>Favorites · {favorites.length}</Chip>
        <Chip active={tab === "history"} onClick={() => setTab("history")}>History</Chip>
      </div>

      {tab === "today" && (
        <>
          {!state.goals.length ? (
            <Empty title="Affirmations start with a goal" body="Your affirmations are written from your real goals, so add one first." action={<Link href="/goals?new=1" className="text-gold">Add a goal →</Link>} />
          ) : (
            <div className="space-y-4">
              {(busy || !today.length ? [] : today).map((a, i) => (
                <AffirmationCard key={a.id} a={a} delay={i * 120} goalTitle={state.goals.find((g) => g.id === a.goalId)?.title} onFav={() => toggleFav(a)} onEdit={() => setEditing(a)} />
              ))}
              {(busy || !today.length) && [0, 1, 2].map((i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
              <Button variant="secondary" className="w-full" onClick={regenerate} loading={busy}>
                <RefreshIcon width={18} height={18} /> {canRegen ? "Write me fresh ones" : "Fresh ones with Premium"}
              </Button>
            </div>
          )}
        </>
      )}

      {tab === "favorites" &&
        (favorites.length ? (
          <div className="space-y-3">
            {favorites.map((a) => (
              <AffirmationCard key={a.id} a={a} compact goalTitle={state.goals.find((g) => g.id === a.goalId)?.title} onFav={() => toggleFav(a)} onEdit={() => setEditing(a)} />
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-muted">Tap the heart on any affirmation to keep it here.</p>
        ))}

      {tab === "history" &&
        (Object.keys(byDate).length ? (
          <div className="space-y-6">
            {Object.entries(byDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, list]) => (
                <section key={date}>
                  <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-faint">{formatDate(date)}</p>
                  <ul className="space-y-2">
                    {list.map((a) => (
                      <li key={a.id} className="flex items-start gap-3 rounded-xl border border-line bg-charcoal p-4">
                        <p className="flex-1 font-display text-[15px] leading-snug text-cream">“{a.text}”</p>
                        <button onClick={() => toggleFav(a)} className={cx("h-9 w-9 shrink-0", a.favorite ? "text-gold" : "text-faint")} aria-label="Favorite">
                          <HeartIcon filled={a.favorite} width={18} height={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        ) : (
          <p className="py-10 text-center text-muted">Past affirmations will appear here.</p>
        ))}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Make it yours">
        {editing && (
          <EditForm
            a={editing}
            onSave={(text) => {
              update((s) => ({ ...s, affirmations: s.affirmations.map((x) => (x.id === editing.id ? { ...x, text } : x)) }));
              setEditing(null);
              setToast("Saved in your words.");
            }}
          />
        )}
      </Sheet>
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

function AffirmationCard({ a, goalTitle, onFav, onEdit, compact, delay = 0 }: { a: Affirmation; goalTitle?: string; onFav: () => void; onEdit: () => void; compact?: boolean; delay?: number }) {
  return (
    <article className="rise rounded-2xl border border-gold/25 bg-gradient-to-br from-charcoal to-ink p-6" style={{ animationDelay: `${delay}ms` }}>
      <p className={cx("font-display leading-snug text-gold-light", compact ? "text-[18px]" : "text-[22px]")}>“{a.text}”</p>
      {a.action && !compact && (
        <p className="mt-4 rounded-xl bg-raised px-4 py-3 text-[13px] text-cream">
          <span className="font-bold text-gold">Today's action: </span>
          {a.action}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between">
        <span className="min-w-0 truncate text-[12px] text-faint">{goalTitle ? `For “${goalTitle}”` : "For your vision"}</span>
        <div className="flex shrink-0">
          <button onClick={onEdit} className="h-11 px-3 text-[13px] text-muted hover:text-cream">
            Edit
          </button>
          <button onClick={onFav} className={cx("flex h-11 w-11 items-center justify-center", a.favorite ? "text-gold" : "text-faint hover:text-gold")} aria-label={a.favorite ? "Remove favorite" : "Save favorite"}>
            <HeartIcon filled={a.favorite} />
          </button>
        </div>
      </div>
    </article>
  );
}

function EditForm({ a, onSave }: { a: Affirmation; onSave: (t: string) => void }) {
  const [text, setText] = useState(a.text);
  return (
    <div className="space-y-4">
      <textarea rows={4} className={inputCls} value={text} onChange={(e) => setText(e.target.value)} />
      <Button className="w-full" disabled={!text.trim()} onClick={() => onSave(text.trim())}>
        Save
      </Button>
    </div>
  );
}
