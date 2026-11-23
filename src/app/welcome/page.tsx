"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Chip, Eyebrow, inputCls, ScoreRing } from "@/components/ui";
import { CheckIcon } from "@/components/icons";
import { generateAffirmations, generateMilestones } from "@/lib/actions";
import { clarityIndex, todaysPriorities } from "@/lib/engine";
import { useStore } from "@/lib/store";
import { CATEGORIES, HORIZONS, type Affirmation, type AppState, type Category, type Goal, type Horizon } from "@/lib/types";
import { cx, uid } from "@/lib/utils";

type DraftGoal = { id: string; title: string; category: Category; horizon: Horizon; why: string };

const QUESTIONS = [
  { key: "want", title: "What do you truly want?", hint: "Dream out loud. Your life one year from now, if nothing held you back.", placeholder: "A thriving coaching business, a home by the water, and mornings that feel calm…" },
  { key: "holdingBack", title: "What's holding you back?", hint: "Be honest. Naming it takes away its power.", placeholder: "Self-doubt, not enough time, fear of being seen…" },
  { key: "successFeels", title: "What will success feel like?", hint: "Describe the feeling, not just the outcome.", placeholder: "Free, proud, at peace, deeply confident…" },
] as const;

const STEPS = 8; // welcome, name, 3 questions, goals, affirmations, preview

export default function Welcome() {
  const { ready, state, update, cloud, session, authHeader } = useStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [vision, setVision] = useState({ want: "", holdingBack: "", successFeels: "" });
  const [goals, setGoals] = useState<DraftGoal[]>([newDraft()]);
  const [affs, setAffs] = useState<Affirmation[]>([]);
  const [builtGoals, setBuiltGoals] = useState<Goal[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && state.profile.onboarded) router.replace("/home");
  }, [ready, state.profile.onboarded, router]);

  const validGoals = goals.filter((g) => g.title.trim());

  async function buildPlan() {
    setBusy(true);
    setStep(6);
    const headers = await authHeader();
    const now = new Date().toISOString();
    const built: Goal[] = await Promise.all(
      validGoals.map(async (g) => ({
        id: g.id,
        title: g.title.trim(),
        category: g.category,
        horizon: g.horizon,
        why: g.why.trim() || undefined,
        createdAt: now,
        milestones: await generateMilestones({ ...g, why: g.why || undefined }, headers),
      })),
    );
    const draft: AppState = {
      ...state,
      profile: { ...state.profile, name: name.trim(), vision },
      goals: built,
    };
    const first = await generateAffirmations(draft, 3, headers);
    setBuiltGoals(built);
    setAffs(first);
    setBusy(false);
  }

  function finish() {
    update(
      (s) => ({
        ...s,
        profile: { ...s.profile, name: name.trim(), vision, onboarded: true },
        goals: builtGoals,
        affirmations: affs,
      }),
      { activity: true },
    );
    router.replace(cloud && !session ? "/login?mode=signup" : "/home");
  }

  const preview = useMemo<AppState>(
    () => ({ ...state, profile: { ...state.profile, name, vision }, goals: builtGoals, affirmations: affs, activity: { ...state.activity } }),
    [state, name, vision, builtGoals, affs],
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+20px)]">
      {step > 0 && (
        <div className="mb-8 flex items-center gap-3">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={busy || step >= 7} className="min-h-11 text-muted disabled:opacity-0" aria-label="Back">
            ←
          </button>
          <div className="flex flex-1 gap-1.5" aria-label={`Step ${step} of ${STEPS - 1}`}>
            {Array.from({ length: STEPS - 1 }).map((_, i) => (
              <div key={i} className={cx("h-1 flex-1 rounded-full transition-colors duration-500", i < step ? "gold-fill" : "bg-raised")} />
            ))}
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="rise flex flex-1 flex-col justify-between">
          <div className="pt-10">
            <Eyebrow>Opulent Vision Board</Eyebrow>
            <h1 className="mt-4 text-[40px] leading-[1.1]">
              Envision your <span className="gold-text">future self.</span>
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-muted">
              Your vision board, goals, affirmations and journal in one quiet sanctuary. AI connects what you dream to what you do each day.
            </p>
            <ul className="mt-8 space-y-4">
              {["A living vision board that highlights what matters now", "Affirmations written from your real goals", "Daily next steps and a Clarity Score that shows momentum"].map((t) => (
                <li key={t} className="flex gap-3 text-cream">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/50 text-gold">
                    <CheckIcon width={14} height={14} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3 pt-10">
            <Button className="w-full" onClick={() => setStep(1)}>
              Begin my vision
            </Button>
            {cloud && (
              <Button variant="ghost" className="w-full" onClick={() => router.push("/login")}>
                I already have an account
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <Step
          title="First, what should we call you?"
          hint="This is your private space."
          onNext={() => setStep(2)}
          disabled={!name.trim()}
        >
          <input autoFocus className={inputCls} placeholder="Your first name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && setStep(2)} />
        </Step>
      )}

      {QUESTIONS.map((q, i) =>
        step === i + 2 ? (
          <Step key={q.key} eyebrow={`Vision clarity · ${i + 1} of 3`} title={q.title} hint={q.hint} onNext={() => setStep(step + 1)} disabled={vision[q.key].trim().length < 3}>
            <textarea autoFocus rows={5} className={inputCls} placeholder={q.placeholder} value={vision[q.key]} onChange={(e) => setVision((v) => ({ ...v, [q.key]: e.target.value }))} />
          </Step>
        ) : null,
      )}

      {step === 5 && (
        <Step
          eyebrow="Your goals"
          title={`${name ? name + ", c" : "C"}hoose 3 to 5 goals`}
          hint="Big or small. We'll break each one into steps for you."
          onNext={buildPlan}
          nextLabel="Create my plan"
          disabled={!validGoals.length}
        >
          <div className="space-y-4">
            {goals.map((g, idx) => (
              <div key={g.id} className="space-y-3 rounded-2xl border border-line bg-charcoal p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-faint">Goal {idx + 1}</span>
                  {goals.length > 1 && (
                    <button className="min-h-9 px-2 text-[12px] text-faint hover:text-rose" onClick={() => setGoals((gs) => gs.filter((x) => x.id !== g.id))}>
                      Remove
                    </button>
                  )}
                </div>
                <input className={inputCls} placeholder="e.g. Launch my coaching business" value={g.title} onChange={(e) => setGoals((gs) => gs.map((x) => (x.id === g.id ? { ...x, title: e.target.value } : x)))} />
                <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
                  {CATEGORIES.map((c) => (
                    <Chip key={c} active={g.category === c} onClick={() => setGoals((gs) => gs.map((x) => (x.id === g.id ? { ...x, category: c } : x)))}>
                      {c}
                    </Chip>
                  ))}
                </div>
                <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
                  {HORIZONS.map((h) => (
                    <Chip key={h} active={g.horizon === h} onClick={() => setGoals((gs) => gs.map((x) => (x.id === g.id ? { ...x, horizon: h } : x)))}>
                      {h}
                    </Chip>
                  ))}
                </div>
                <input className={inputCls} placeholder="Why does this matter to you? (optional)" value={g.why} onChange={(e) => setGoals((gs) => gs.map((x) => (x.id === g.id ? { ...x, why: e.target.value } : x)))} />
              </div>
            ))}
            {goals.length < 5 && (
              <Button variant="secondary" className="w-full" onClick={() => setGoals((gs) => [...gs, newDraft()])}>
                + Add another goal
              </Button>
            )}
          </div>
        </Step>
      )}

      {step === 6 && (
        <div className="rise flex flex-1 flex-col">
          <Eyebrow>Your first affirmations</Eyebrow>
          <h1 className="mt-3 text-[30px] leading-tight">{busy ? "Writing words made only for you…" : "These were written for you."}</h1>
          <div className="mt-8 flex-1 space-y-4">
            {busy
              ? [0, 1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)
              : affs.map((a, i) => (
                  <div key={a.id} className="rise rounded-2xl border border-gold/30 bg-charcoal p-5" style={{ animationDelay: `${i * 140}ms` }}>
                    <p className="font-display text-[19px] leading-snug text-gold-light">“{a.text}”</p>
                    {a.action && <p className="mt-3 text-[13px] text-muted">Today: {a.action}</p>}
                  </div>
                ))}
          </div>
          <Button className="mt-8 w-full" disabled={busy} onClick={() => setStep(7)}>
            See my dashboard
          </Button>
        </div>
      )}

      {step === 7 && <PreviewStep state={preview} name={name} onEnter={finish} />}
    </div>
  );
}

function newDraft(): DraftGoal {
  return { id: uid(), title: "", category: "Career", horizon: "This year", why: "" };
}

function Step({
  eyebrow,
  title,
  hint,
  children,
  onNext,
  nextLabel = "Continue",
  disabled,
}: {
  eyebrow?: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
  onNext: () => void;
  nextLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="rise flex flex-1 flex-col">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="mt-3 text-[30px] leading-tight">{title}</h1>
      {hint && <p className="mt-2 text-muted">{hint}</p>}
      <div className="mt-8 flex-1">{children}</div>
      <Button className="mt-8 w-full" disabled={disabled} onClick={onNext}>
        {nextLabel}
      </Button>
    </div>
  );
}

function PreviewStep({ state, name, onEnter }: { state: AppState; name: string; onEnter: () => void }) {
  const score = clarityIndex({ ...state, activity: { ...state.activity, [new Date().toISOString().slice(0, 10)]: 1 } }).score;
  const [top] = todaysPriorities(state, 1);
  return (
    <div className="flex flex-1 flex-col">
      <div className="pop mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-full gold-fill text-ink">
        <CheckIcon width={30} height={30} />
      </div>
      <h1 className="mt-6 text-center text-[30px] leading-tight">Your vision has a plan, {name || "friend"}.</h1>
      <p className="mt-2 text-center text-muted">Here's a preview of your daily sanctuary.</p>
      <div className="mt-8 space-y-3">
        <div className="rise flex items-center gap-5 rounded-2xl border border-line bg-charcoal p-5">
          <ScoreRing score={score} size={76} stroke={7} />
          <div>
            <Eyebrow>Clarity Score</Eyebrow>
            <p className="mt-1 text-muted">Your starting point. It grows as you act on your vision.</p>
          </div>
        </div>
        {top && (
          <div className="rise rounded-2xl border border-line bg-charcoal p-5" style={{ animationDelay: "120ms" }}>
            <Eyebrow>Today's top priority</Eyebrow>
            <p className="mt-2 font-display text-[18px]">{top.label}</p>
            <p className="mt-1 text-[13px] text-faint">for “{top.goal.title}”</p>
          </div>
        )}
        <div className="rise rounded-2xl border border-line bg-charcoal p-5" style={{ animationDelay: "240ms" }}>
          <Eyebrow>Your goals</Eyebrow>
          <ul className="mt-2 space-y-1.5">
            {state.goals.map((g) => (
              <li key={g.id} className="flex justify-between gap-3 text-[14px]">
                <span className="truncate">{g.title}</span>
                <span className="shrink-0 text-faint">{g.milestones.length} steps</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Button className="mt-auto w-full" onClick={onEnter}>
        Enter my sanctuary
      </Button>
    </div>
  );
}
