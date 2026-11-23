import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { saveSubscription } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

/** Confirms a finished Checkout session. Backs up the webhook so access unlocks immediately. */
export async function GET(req: Request) {
  const s = stripe();
  const id = new URL(req.url).searchParams.get("session_id");
  if (!s || !id) return NextResponse.json({ paid: false }, { status: 400 });
  try {
    const session = await s.checkout.sessions.retrieve(id, { expand: ["subscription"] });
    const sub = session.subscription as import("stripe").Stripe.Subscription | null;
    const paid = session.status === "complete" && !!sub && ["active", "trialing"].includes(sub.status);
    if (sub) await saveSubscription(session.client_reference_id, sub);
    return NextResponse.json({ paid });
  } catch {
    return NextResponse.json({ paid: false }, { status: 400 });
  }
}
