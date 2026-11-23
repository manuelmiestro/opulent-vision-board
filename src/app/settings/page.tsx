"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BackIcon } from "@/components/icons";
import { Button, Card, Chip, Eyebrow, Field, inputCls, PageHeader, Toast } from "@/components/ui";
import { useStore } from "@/lib/store";
import { DASHBOARD_CARDS, type NudgeLevel, type NudgeWindow } from "@/lib/types";
import { cx } from "@/lib/utils";

const CARD_LABELS: Record<string, string> = {
  priority: "Today's priority",
  affirmation: "Daily affirmation",
  score: "Clarity Score",
  board: "Vision board",
  journal: "Reflection prompt",
  milestones: "Upcoming milestones",
};

export default function SettingsPage() {
  return (
    <AppShell feature="settings">
      <Settings />
    </AppShell>
  );
}

function Settings() {
  const { state, update, cloud, session, sync, signOut, reset, isPremium, subscriptionActive, authHeader } = useStore();
  const router = useRouter();
  const [name, setName] = useState(state.profile.name);
  const [vision, setVision] = useState(state.profile.vision);
  const [toast, setToast] = useState<string | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const p = state.profile;
  const setProfile = (patch: Partial<typeof p>) => update((s) => ({ ...s, profile: { ...s.profile, ...patch } }));

  const order = [...p.dashboard.filter((c) => (DASHBOARD_CARDS as readonly string[]).includes(c)), ...DASHBOARD_CARDS.filter((c) => !p.dashboard.includes(c))];
  const move = (i: number, dir: -1 | 1) => {
    const next = [...order];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setProfile({ dashboard: next, adaptiveDashboard: false });
  };

  async function enableNotifications(on: boolean) {
    if (on && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission().catch(() => undefined);
    }
    setProfile({ notifications: { ...p.notifications, enabled: on } });
  }

  async function manageBilling() {
    setBillingBusy(true);
    const res = await fetch("/api/stripe/portal", { method: "POST", headers: await authHeader() });
    const json = await res.json().catch(() => ({}));
    setBillingBusy(false);
    if (json.url) location.href = json.url;
    else setToast(json.error ?? "Billing isn't available right now.");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `opulent-vision-board-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const syncLabel: Record<typeof sync, string> = {
    local: "Saved on this device",
    syncing: "Syncing…",
    synced: "Synced across your devices",
    offline: "Offline. Changes will sync when you reconnect.",
    error: "Sync paused. Changes are safe on this device.",
  };

  return (
    <>
      <Link href="/home" className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-2 px-2 text-muted hover:text-cream">
        <BackIcon width={18} height={18} /> Home
      </Link>
      <PageHeader eyebrow="Settings" title="Your preferences" />

      <div className="space-y-4 pb-6">
        <Card>
          <Eyebrow>Profile</Eyebrow>
          <div className="mt-4 space-y-4">
            <Field label="Name">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="What I truly want">
              <textarea rows={2} className={inputCls} value={vision.want} onChange={(e) => setVision({ ...vision, want: e.target.value })} />
            </Field>
            <Field label="What's holding me back">
              <textarea rows={2} className={inputCls} value={vision.holdingBack} onChange={(e) => setVision({ ...vision, holdingBack: e.target.value })} />
            </Field>
            <Field label="What success will feel like">
              <textarea rows={2} className={inputCls} value={vision.successFeels} onChange={(e) => setVision({ ...vision, successFeels: e.target.value })} />
            </Field>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setProfile({ name: name.trim(), vision });
                setToast("Profile saved.");
              }}
            >
              Save profile
            </Button>
          </div>
        </Card>

        <Card>
          <Eyebrow>Subscription</Eyebrow>
          <p className="mt-3 font-display text-[20px]">{isPremium ? "Premium" : "Free plan"}</p>
          <p className="mt-1 text-muted">{isPremium ? "Unlimited goals, board, fresh affirmations and AI insights." : "Up to 3 goals, 12 board pieces and one fresh set of affirmations a day."}</p>
          <div className="mt-4">
            {subscriptionActive ? (
              <Button variant="secondary" className="w-full" loading={billingBusy} onClick={manageBilling}>
                Manage billing
              </Button>
            ) : isPremium && !session ? (
              <Button variant="ghost" className="w-full" onClick={() => setProfile({ premium: false })}>
                End preview Premium
              </Button>
            ) : (
              <Button className="w-full" onClick={() => router.push("/upgrade")}>
                See Premium
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <Eyebrow>Smart nudges</Eyebrow>
          <p className="mt-2 text-muted">Context-aware reminders that back off when you're already active.</p>
          <div className="mt-4 flex gap-2">
            <Chip active={p.notifications.enabled} onClick={() => enableNotifications(true)}>On</Chip>
            <Chip active={!p.notifications.enabled} onClick={() => enableNotifications(false)}>Off</Chip>
          </div>
          {p.notifications.enabled && (
            <div className="mt-5 space-y-4">
              <Field label="Best time for me">
                <div className="flex gap-2">
                  {(["morning", "midday", "evening"] as NudgeWindow[]).map((w) => (
                    <Chip key={w} active={p.notifications.window === w} onClick={() => setProfile({ notifications: { ...p.notifications, window: w } })}>
                      {w[0].toUpperCase() + w.slice(1)}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="How often" hint="Gentle stops nudging after one action a day; focused keeps you company until three.">
                <div className="flex gap-2">
                  {(["gentle", "balanced", "focused"] as NudgeLevel[]).map((l) => (
                    <Chip key={l} active={p.notifications.level === l} onClick={() => setProfile({ notifications: { ...p.notifications, level: l } })}>
                      {l[0].toUpperCase() + l.slice(1)}
                    </Chip>
                  ))}
                </div>
              </Field>
            </div>
          )}
        </Card>

        <Card>
          <Eyebrow>Appearance</Eyebrow>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(
              [
                { id: "noir", label: "Noir & Gold", swatch: "bg-[#0D0D0D]" },
                { id: "ivory", label: "Ivory & Rose", swatch: "bg-[#FDF5F6]" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setProfile({ theme: t.id })}
                className={cx("flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left text-[13px]", p.theme === t.id ? "border-gold text-gold-light" : "border-line text-muted")}
              >
                <span className={cx("h-6 w-6 rounded-full border border-gold/60", t.swatch)} />
                {t.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <Eyebrow>Dashboard layout</Eyebrow>
          <div className="mt-3 flex gap-2">
            <Chip active={p.adaptiveDashboard} onClick={() => setProfile({ adaptiveDashboard: true })}>Adaptive</Chip>
            <Chip active={!p.adaptiveDashboard} onClick={() => setProfile({ adaptiveDashboard: false })}>My order</Chip>
          </div>
          <p className="mt-2 text-[12px] text-faint">{p.adaptiveDashboard ? "Cards you use most rise to the top." : "Cards stay in the order you set."}</p>
          <ul className="mt-3 divide-y divide-line">
            {order.map((c, i) => (
              <li key={c} className="flex items-center justify-between py-1">
                <span className="text-[14px]">{CARD_LABELS[c]}</span>
                <span className="flex">
                  <button className="h-10 w-10 text-faint hover:text-cream disabled:opacity-20" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                  <button className="h-10 w-10 text-faint hover:text-cream disabled:opacity-20" disabled={i === order.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <Eyebrow>Cloud sync</Eyebrow>
          <p className="mt-3 text-[14px]">{cloud ? syncLabel[sync] : "Preview mode: saved on this device only."}</p>
          {session?.user.email && <p className="mt-1 text-[13px] text-faint">Signed in as {session.user.email}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={exportData}>
              Export my data
            </Button>
            {session && (
              <Button variant="ghost" onClick={async () => { await signOut(); router.replace("/login"); }}>
                Sign out
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <Eyebrow className="text-rose">Start over</Eyebrow>
          <p className="mt-2 text-muted">Erase your goals, board, journal and affirmations{cloud && session ? " on every device" : " on this device"}.</p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={() => {
              if (confirm("Erase everything and start again? This can't be undone.")) {
                reset();
                router.replace("/welcome");
              }
            }}
          >
            Erase my data
          </Button>
        </Card>
      </div>
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
