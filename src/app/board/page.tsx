"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ExpandIcon } from "@/components/icons";
import { Chip, Empty, LinkButton, PageHeader } from "@/components/ui";
import { isNow, VisionTile } from "@/components/VisionTile";
import { todaysAffirmations } from "@/lib/actions";
import { useStore } from "@/lib/store";
import { CATEGORIES, type Category } from "@/lib/types";

export default function BoardPage() {
  return (
    <AppShell feature="board">
      <Board />
    </AppShell>
  );
}

function Board() {
  const { state } = useStore();
  const [filter, setFilter] = useState<Category | "All" | "Now">("All");
  const [inspire, setInspire] = useState(false);
  const usedCats = CATEGORIES.filter((c) => state.vision.some((v) => v.category === c));

  const items = useMemo(() => {
    const list = state.vision.filter((v) => (filter === "All" ? true : filter === "Now" ? isNow(v, state.goals) : v.category === filter));
    // What matters now floats to the top.
    return [...list].sort((a, b) => Number(isNow(b, state.goals)) - Number(isNow(a, state.goals)));
  }, [state.vision, state.goals, filter]);

  return (
    <>
      <PageHeader
        eyebrow="Vision board"
        title="The life you're creating"
        action={
          <div className="flex gap-2">
            {state.vision.length > 0 && (
              <button onClick={() => setInspire(true)} className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-gold hover:border-gold" aria-label="Inspiration mode">
                <ExpandIcon width={18} height={18} />
              </button>
            )}
            <LinkButton href="/board/edit" variant="secondary" className="px-4">
              Edit
            </LinkButton>
          </div>
        }
      />
      {state.vision.length === 0 ? (
        <Empty
          title="Your board is waiting"
          body="Add images, words, video and voice notes that make your vision feel real. Tie each one to a goal so it lights up when it matters."
          action={<LinkButton href="/board/edit">Start my board</LinkButton>}
        />
      ) : (
        <>
          <div className="no-scrollbar -mx-5 mb-5 flex gap-2 overflow-x-auto px-5">
            {(["All", "Now", ...usedCats] as const).map((c) => (
              <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
                {c === "Now" ? "✦ Now" : c}
              </Chip>
            ))}
          </div>
          {items.length ? (
            <div className="columns-2 gap-3 sm:columns-3">
              {items.map((v) => (
                <VisionTile key={v.id} item={v} goals={state.goals} />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-muted">Nothing here yet.</p>
          )}
        </>
      )}
      {inspire && <Inspiration onClose={() => setInspire(false)} />}
    </>
  );
}

/** Full-screen, auto-advancing daily inspiration mode. */
function Inspiration({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const slides = state.vision;
  const affs = todaysAffirmations(state);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 7000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((n) => (n + 1) % slides.length);
      if (e.key === "ArrowLeft") setI((n) => (n - 1 + slides.length) % slides.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [slides.length, onClose]);
  const item = slides[i];
  const aff = affs[i % Math.max(1, affs.length)];
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink" role="dialog" aria-label="Inspiration mode">
      <div className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+12px)]">
        <span className="text-[12px] text-faint">
          {i + 1} / {slides.length}
        </span>
        <button onClick={onClose} className="flex h-11 w-11 items-center justify-center text-muted" aria-label="Close">
          ✕
        </button>
      </div>
      <button className="flex flex-1 items-center justify-center px-6" onClick={() => setI((n) => (n + 1) % slides.length)} aria-label="Next">
        <div key={item.id} className="rise w-full max-w-md">
          <VisionTile item={item} goals={state.goals} large />
        </div>
      </button>
      {aff && (
        <p key={aff.id + i} className="rise mx-auto max-w-md px-8 pb-[calc(env(safe-area-inset-bottom)+40px)] text-center font-display text-[20px] leading-snug text-gold-light">
          “{aff.text}”
        </p>
      )}
    </div>
  );
}
