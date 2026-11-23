"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BackIcon, CheckIcon } from "@/components/icons";
import { Button, Eyebrow } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cx } from "@/lib/utils";

type Price = { id: string; amount: number | null; currency: string; interval: string | null; trialDays: number | null } | null;
type Prices = { enabled: boolean; monthly?: Price; yearly?: Price; testMode?: boolean };

const BENEFITS = [
  "Unlimited goals and vision board pieces",
  "Fresh AI affirmations whenever you want them",
  "AI insights from your journal and patterns",
  "Deeper Vision Alignment reads",
  "Sync across phone, tablet and desktop",
];

function money(p: NonNullable<Price>) {
  if (p.amount == null) return "";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency.toUpperCase(), minimumFractionDigits: p.amount % 100 ? 2 : 0 }).format(p.amount / 100);
}

export default function UpgradePage() {
  return (
    <AppShell feature="upgrade" bare>
      <Suspense>
        <Upgrade />
      </Suspense>
    </AppShell>
  );
}

function Upgrade() {
  const { isPremium, session, update, authHeader } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [prices, setPrices] = useState<Prices | null>(null);
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("canceled") ? "Checkout was canceled. You haven't been charged." : null);

  useEffect(() => {
    fetch("/api/stripe/prices")
      .then((r) => r.json())
      .then((p: Prices) => {
        setPrices(p);
        if (p.enabled && !p.yearly) setPlan("monthly");
      })
      .catch(() => setPrices({ enabled: false }));
  }, []);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout couldn't start.");
      location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout couldn't start.");
      setBusy(false);
    }
  }

  const options = prices?.enabled ? ([["yearly", prices.yearly], ["monthly", prices.monthly]] as const).filter(([, p]) => p) : [];

  return (
    <div className="mx-auto max-w-md pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <button onClick={() => router.back()} className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-2 px-2 text-muted hover:text-cream">
        <BackIcon width={18} height={18} /> Back
      </button>
      <Eyebrow>Opulent Premium</Eyebrow>
      <h1 className="mt-3 text-[34px] leading-tight">
        Invest in your <span className="gold-text">future self.</span>
      </h1>
      <ul className="mt-6 space-y-3">
        {BENEFITS.map((b) => (
          <li key={b} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full gold-fill text-ink">
              <CheckIcon width={14} height={14} />
            </span>
            {b}
          </li>
        ))}
      </ul>

      {isPremium ? (
        <div className="mt-8 rounded-2xl border border-green/60 bg-green/15 p-5 text-center">
          <p className="font-display text-[20px] text-green-bright">You're Premium.</p>
          <Link href="/home" className="mt-2 inline-block text-gold">Back to your sanctuary →</Link>
        </div>
      ) : !prices ? (
        <div className="mt-8 space-y-3">
          <div className="skeleton h-20 rounded-2xl" />
          <div className="skeleton h-20 rounded-2xl" />
        </div>
      ) : prices.enabled ? (
        <div className="mt-8 space-y-3">
          {prices.testMode && <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-center text-[12px] text-gold-light">Stripe test mode: no real charges.</p>}
          {options.map(([id, p]) => (
            <button
              key={id}
              onClick={() => setPlan(id)}
              className={cx("flex w-full items-center justify-between rounded-2xl border p-5 text-left transition", plan === id ? "border-gold bg-gold/10" : "border-line bg-charcoal")}
            >
              <div>
                <p className="font-bold capitalize">{id}</p>
                {p!.trialDays ? <p className="text-[12px] text-green-bright">{p!.trialDays}-day free trial</p> : null}
              </div>
              <p className="font-display text-[22px]">
                {money(p!)}
                <span className="text-[13px] text-faint">/{p!.interval === "year" ? "yr" : "mo"}</span>
              </p>
            </button>
          ))}
          {error && <p className="text-center text-[13px] text-rose">{error}</p>}
          <Button className="w-full" loading={busy} onClick={checkout}>
            Continue to secure checkout
          </Button>
          <p className="text-center text-[12px] text-faint">Cancel anytime from Settings. Payments are handled by Stripe.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          <p className="rounded-xl border border-line bg-charcoal p-4 text-[13px] text-muted">
            Payments aren't connected in this preview yet. You can try every Premium feature on this device.
          </p>
          {!session && (
            <Button
              className="w-full"
              onClick={() => {
                update((s) => ({ ...s, profile: { ...s.profile, premium: true } }));
                router.push("/home");
              }}
            >
              Try Premium in preview
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
