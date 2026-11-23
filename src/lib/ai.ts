"use client";

export type AITask = "affirmations" | "milestones" | "insights" | "journal";

/** Calls the AI route. Returns null when AI isn't configured or fails, so callers fall back to the on-device engine. */
export async function callAI<T>(task: AITask, input: unknown, headers: Record<string, string> = {}): Promise<T | null> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ task, input }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.fallback || json?.error) return null;
    return json as T;
  } catch {
    return null;
  }
}

export interface FeatureFlags {
  ai: boolean;
  payments: boolean;
  cloud: boolean;
}

let flagsPromise: Promise<FeatureFlags> | null = null;
export function getFlags(): Promise<FeatureFlags> {
  if (!flagsPromise) {
    flagsPromise = fetch("/api/config")
      .then((r) => r.json())
      .catch(() => ({ ai: false, payments: false, cloud: false }));
  }
  return flagsPromise;
}
