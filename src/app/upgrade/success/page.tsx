"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CheckIcon } from "@/components/icons";
import { useStore } from "@/lib/store";

export default function SuccessPage() {
  return (
    <AppShell feature="upgrade" bare>
      <Suspense>
        <Success />
      </Suspense>
    </AppShell>
  );
}

function Success() {
  const params = useSearchParams();
  const { session, update, refreshSubscription } = useStore();
  const [status, setStatus] = useState<"checking" | "paid" | "pending">("checking");

  useEffect(() => {
    const id = params.get("session_id");
    if (!id) return setStatus("pending");
    fetch(`/api/stripe/verify?session_id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then(async ({ paid }) => {
        if (paid) {
          if (!session) update((s) => ({ ...s, profile: { ...s.profile, premium: true } }));
          await refreshSubscription();
        }
        setStatus(paid ? "paid" : "pending");
      })
      .catch(() => setStatus("pending"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center text-center">
      {status === "checking" ? (
        <p className="text-muted">Confirming your membership…</p>
      ) : status === "paid" ? (
        <>
          <div className="pop flex h-24 w-24 items-center justify-center rounded-full gold-fill text-ink">
            <CheckIcon width={44} height={44} />
          </div>
          <h1 className="rise mt-8 text-[32px]">Welcome to Premium.</h1>
          <p className="rise mt-3 max-w-xs text-muted">Every feature is unlocked. Your future self thanks you.</p>
          <Link href="/home" className="mt-8 rounded-xl gold-fill px-6 py-3 font-bold text-ink">
            Enter my sanctuary
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-[28px]">We're still confirming your payment.</h1>
          <p className="mt-3 max-w-xs text-muted">This can take a minute. Your Premium access will appear automatically.</p>
          <Link href="/home" className="mt-8 text-gold">Back to home</Link>
        </>
      )}
    </div>
  );
}
