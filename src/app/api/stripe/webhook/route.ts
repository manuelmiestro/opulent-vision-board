import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/server";
import { stripe } from "@/lib/stripe";
import { saveSubscription } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const s = stripe();
  if (!s || !env.webhookSecret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(raw, sig ?? "", env.webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const sub = await s.subscriptions.retrieve(String(session.subscription));
        await saveSubscription(session.client_reference_id ?? sub.metadata.user_id, sub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await saveSubscription(sub.metadata.user_id, sub);
      break;
    }
  }
  return NextResponse.json({ received: true });
}
