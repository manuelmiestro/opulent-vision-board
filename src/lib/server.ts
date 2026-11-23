import "server-only";
import { createClient } from "@supabase/supabase-js";

export const env = {
  openaiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  stripeKey: process.env.STRIPE_SECRET_KEY,
  priceMonthly: process.env.STRIPE_PRICE_MONTHLY,
  priceYearly: process.env.STRIPE_PRICE_YEARLY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseService: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

export const features = {
  ai: Boolean(env.openaiKey),
  payments: Boolean(env.stripeKey && (env.priceMonthly || env.priceYearly)),
  cloud: Boolean(env.supabaseUrl && env.supabaseAnon),
};

/** Service-role client for trusted server writes (subscriptions). */
export function adminSupabase() {
  if (!env.supabaseUrl || !env.supabaseService) return null;
  return createClient(env.supabaseUrl, env.supabaseService, { auth: { persistSession: false } });
}

/** Resolve the signed-in user from a bearer token sent by the client. */
export async function userFromRequest(req: Request): Promise<{ id: string; email?: string } | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ") || !env.supabaseUrl || !env.supabaseAnon) return null;
  const sb = createClient(env.supabaseUrl, env.supabaseAnon, { auth: { persistSession: false } });
  const { data } = await sb.auth.getUser(auth.slice(7));
  return data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null;
}

export function appUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
}
