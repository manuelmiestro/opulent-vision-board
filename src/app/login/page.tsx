"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button, Eyebrow, Field, inputCls } from "@/components/ui";
import { getSupabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";

type Mode = "signin" | "signup" | "reset" | "update";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const { ready, cloud, session, state } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>((params.get("mode") as Mode) || "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (ready && session && mode !== "update") router.replace(state.profile.onboarded ? "/home" : "/welcome");
  }, [ready, session, mode, state.profile.onboarded, router]);

  if (ready && !cloud) {
    return (
      <Shell>
        <Eyebrow>Preview mode</Eyebrow>
        <h1 className="mt-3 text-[30px] leading-tight">Accounts switch on with the database.</h1>
        <p className="mt-3 text-muted">
          This preview keeps everything on this device. Once Supabase is connected, you'll sign in with email, Google or Apple and your vision syncs across every device.
        </p>
        <Button className="mt-8 w-full" onClick={() => router.replace(state.profile.onboarded ? "/home" : "/welcome")}>
          Continue on this device
        </Button>
      </Shell>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/home` } });
        if (error) throw error;
        if (!data.session) setNotice("Check your inbox to confirm your email, then sign in.");
      } else if (mode === "reset") {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/login?mode=update` });
        if (error) throw error;
        setNotice("If that email has an account, a reset link is on its way.");
      } else if (mode === "update") {
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        setNotice("Password updated.");
        router.replace("/home");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "apple") {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}/home` } });
    if (error) setError(error.message);
  }

  const titles: Record<Mode, string> = {
    signin: "Welcome back.",
    signup: "Save your vision.",
    reset: "Reset your password.",
    update: "Choose a new password.",
  };

  return (
    <Shell>
      <Eyebrow>Opulent Vision Board</Eyebrow>
      <h1 className="mt-3 text-[32px] leading-tight">{titles[mode]}</h1>
      {mode === "signup" && <p className="mt-2 text-muted">Create your account so your board, goals and journal sync across your devices.</p>}

      {(mode === "signin" || mode === "signup") && (
        <div className="mt-8 space-y-3">
          {process.env.NEXT_PUBLIC_ENABLE_APPLE === "1" && (
            <Button variant="secondary" className="w-full" onClick={() => oauth("apple")}>
               Continue with Apple
            </Button>
          )}
          <Button variant="secondary" className="w-full" onClick={() => oauth("google")}>
            Continue with Google
          </Button>
          <div className="flex items-center gap-3 py-2 text-[12px] text-faint">
            <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      )}

      <form onSubmit={submit} className="mt-4 space-y-4">
        {mode !== "update" && (
          <Field label="Email">
            <input type="email" required autoComplete="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        )}
        {mode !== "reset" && (
          <Field label={mode === "update" ? "New password" : "Password"} hint={mode === "signup" || mode === "update" ? "At least 8 characters." : undefined}>
            <input
              type="password"
              required
              minLength={mode === "signin" ? 1 : 8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        {error && <p className="rounded-xl border border-rose/40 bg-rose/10 px-4 py-3 text-[13px] text-rose">{error}</p>}
        {notice && <p className="rounded-xl border border-green/50 bg-green/15 px-4 py-3 text-[13px] text-green-bright">{notice}</p>}
        <Button type="submit" className="w-full" loading={busy}>
          {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Save password"}
        </Button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-1 text-[13px]">
        {mode === "signin" && (
          <>
            <button className="min-h-11 text-gold-light" onClick={() => setMode("signup")}>New here? Create an account</button>
            <button className="min-h-11 text-faint" onClick={() => setMode("reset")}>Forgot password?</button>
          </>
        )}
        {mode !== "signin" && mode !== "update" && (
          <button className="min-h-11 text-gold-light" onClick={() => setMode("signin")}>I already have an account</button>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-[calc(env(safe-area-inset-top)+24px)]">
      <div className="rise">{children}</div>
    </div>
  );
}
