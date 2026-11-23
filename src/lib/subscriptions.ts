import "server-only";
import type Stripe from "stripe";
import { adminSupabase } from "./server";

export async function saveSubscription(userId: string | undefined | null, sub: Stripe.Subscription) {
  const sb = adminSupabase();
  if (!sb || !userId) return;
  const item = sub.items.data[0];
  await sb.from("subscriptions").upsert(
    {
      user_id: userId,
      customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      subscription_id: sub.id,
      status: sub.status,
      price_id: item?.price.id ?? null,
      current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}
