import { NextResponse } from "next/server";
import { env } from "@/lib/server";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = stripe();
  if (!s) return NextResponse.json({ enabled: false });
  const load = async (id?: string) => {
    if (!id) return null;
    try {
      const p = await s.prices.retrieve(id);
      return { id: p.id, amount: p.unit_amount, currency: p.currency, interval: p.recurring?.interval ?? null, trialDays: p.recurring?.trial_period_days ?? null };
    } catch {
      return null;
    }
  };
  const [monthly, yearly] = await Promise.all([load(env.priceMonthly), load(env.priceYearly)]);
  return NextResponse.json({ enabled: Boolean(monthly || yearly), monthly, yearly, testMode: env.stripeKey?.startsWith("sk_test_") ?? false });
}
