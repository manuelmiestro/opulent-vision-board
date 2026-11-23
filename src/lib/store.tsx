"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AppState } from "./types";
import { DASHBOARD_CARDS } from "./types";
import { getSupabase, supabaseEnabled } from "./supabase";
import { clarityIndex } from "./engine";
import { day } from "./utils";

export function emptyState(): AppState {
  const now = new Date().toISOString();
  return {
    version: 1,
    profile: {
      name: "",
      vision: { want: "", holdingBack: "", successFeels: "" },
      onboarded: false,
      premium: false,
      notifications: { enabled: true, window: "morning", level: "balanced" },
      dashboard: [...DASHBOARD_CARDS],
      adaptiveDashboard: true,
      theme: "noir",
      createdAt: now,
    },
    goals: [],
    vision: [],
    affirmations: [],
    journal: [],
    activity: {},
    scores: {},
    usage: {},
    updatedAt: now,
  };
}

function migrate(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const s = raw as Partial<AppState>;
  return {
    ...base,
    ...s,
    profile: {
      ...base.profile,
      ...(s.profile ?? {}),
      vision: { ...base.profile.vision, ...(s.profile?.vision ?? {}) },
      notifications: { ...base.profile.notifications, ...(s.profile?.notifications ?? {}) },
    },
    version: 1,
  };
}

const LOCAL_KEY = (userId?: string) => `ovb:state:${userId ?? "demo"}`;

function readLocal(userId?: string): AppState | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY(userId));
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeLocal(state: AppState, userId?: string): string | null {
  try {
    localStorage.setItem(LOCAL_KEY(userId), JSON.stringify(state));
    return null;
  } catch {
    return "Storage is full. Remove a few large images from your vision board.";
  }
}

type SyncStatus = "local" | "syncing" | "synced" | "offline" | "error";

interface Ctx {
  ready: boolean;
  state: AppState;
  session: Session | null;
  cloud: boolean;
  sync: SyncStatus;
  storageError: string | null;
  subscriptionActive: boolean;
  isPremium: boolean;
  /** Apply a change. `activity` marks it as a meaningful action for streaks and the Clarity Index. */
  update: (fn: (s: AppState) => AppState, opts?: { activity?: boolean }) => void;
  track: (feature: string) => void;
  reset: () => void;
  signOut: () => Promise<void>;
  authHeader: () => Promise<Record<string, string>>;
  refreshSubscription: () => Promise<void>;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>(emptyState);
  const [session, setSession] = useState<Session | null>(null);
  const [sync, setSync] = useState<SyncStatus>(supabaseEnabled ? "syncing" : "local");
  const [storageError, setStorageError] = useState<string | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const userId = session?.user.id;
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(state);
  latest.current = state;

  // Session bootstrap
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      const local = readLocal();
      setState(local ?? emptyState());
      setReady(true);
      return;
    }
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load state for the signed-in user, merge with local, and listen for other devices.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let cancelled = false;
    (async () => {
      const local = readLocal(userId) ?? (userId ? readLocal() : null);
      if (!userId) {
        setState(local ?? emptyState());
        setReady(true);
        setSync("local");
        return;
      }
      setSync("syncing");
      const { data, error } = await sb.from("user_state").select("state, updated_at").eq("user_id", userId).maybeSingle();
      if (cancelled) return;
      if (error) {
        setState(local ?? emptyState());
        setSync(navigator.onLine ? "error" : "offline");
      } else {
        const remote = data?.state ? migrate(data.state) : null;
        const pick = !remote ? local : !local ? remote : remote.updatedAt >= local.updatedAt ? remote : local;
        const next = pick ?? emptyState();
        setState(next);
        writeLocal(next, userId);
        setSync("synced");
        if (!remote || (local && local.updatedAt > remote.updatedAt)) schedulePush(next);
      }
      setReady(true);
    })();

    if (!userId) return () => void (cancelled = true);
    const channel = sb
      .channel(`state-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_state", filter: `user_id=eq.${userId}` }, (payload) => {
        const incoming = (payload.new as { state?: unknown })?.state;
        if (!incoming) return;
        const remote = migrate(incoming);
        if (remote.updatedAt > latest.current.updatedAt) {
          setState(remote);
          writeLocal(remote, userId);
        }
      })
      .subscribe();
    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const refreshSubscription = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !userId) return setSubscriptionActive(false);
    const { data } = await sb.from("subscriptions").select("status").eq("user_id", userId).maybeSingle();
    setSubscriptionActive(data?.status === "active" || data?.status === "trialing");
  }, [userId]);

  useEffect(() => {
    void refreshSubscription();
  }, [refreshSubscription]);

  // Retry pushes when the device comes back online.
  useEffect(() => {
    const on = () => {
      if (userId) schedulePush(latest.current);
    };
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function schedulePush(next: AppState) {
    const sb = getSupabase();
    if (!sb || !userId) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    setSync("syncing");
    pushTimer.current = setTimeout(async () => {
      if (!navigator.onLine) return setSync("offline");
      const { error } = await sb
        .from("user_state")
        .upsert({ user_id: userId, state: next, updated_at: next.updatedAt }, { onConflict: "user_id" });
      setSync(error ? "error" : "synced");
    }, 1200);
  }

  const update = useCallback<Ctx["update"]>(
    (fn, opts) => {
      setState((prev) => {
        let next = fn(prev);
        const today = day();
        if (opts?.activity) next = { ...next, activity: { ...next.activity, [today]: (next.activity[today] ?? 0) + 1 } };
        const score = clarityIndex(next).score;
        next = { ...next, scores: { ...next.scores, [today]: score }, updatedAt: new Date().toISOString() };
        setStorageError(writeLocal(next, userId));
        schedulePush(next);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId],
  );

  const track = useCallback<Ctx["track"]>(
    (feature) => {
      setState((prev) => {
        const next = { ...prev, usage: { ...prev.usage, [feature]: (prev.usage[feature] ?? 0) + 1 } };
        writeLocal(next, userId);
        return next;
      });
    },
    [userId],
  );

  const reset = useCallback(() => {
    const fresh = emptyState();
    setState(fresh);
    writeLocal(fresh, userId);
    schedulePush(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
    setSession(null);
  }, []);

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const sb = getSupabase();
    if (!sb) return {};
    const { data } = await sb.auth.getSession();
    return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      state,
      session,
      cloud: supabaseEnabled,
      sync,
      storageError,
      subscriptionActive,
      // Signed-in cloud users are premium only through a verified Stripe subscription.
      isPremium: session ? subscriptionActive : state.profile.premium,
      update,
      track,
      reset,
      signOut,
      authHeader,
      refreshSubscription,
    }),
    [ready, state, session, sync, storageError, subscriptionActive, update, track, reset, signOut, authHeader, refreshSubscription],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
