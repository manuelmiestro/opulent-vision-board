import { NextResponse } from "next/server";
import { appUrl, env, features, userFromRequest } from "@/lib/server";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const s = stripe();
  if (!s) return NextResponse.json({ error: "Payments aren't connected yet." }, { status: 503 });
  const { plan } = (await req.json().catch(() => ({}))) as { plan?: "monthly" | "yearly" };
  const price = plan === "yearly" ? env.priceYearly : env.priceMonthly;
  if (!price) return NextResponse.json({ error: "That plan isn't available." }, { status: 400 });

  const user = await userFromRequest(req);
  if (features.cloud && !user) return NextResponse.json({ error: "Sign in to upgrade." }, { status: 401 });

  const base = appUrl(req);
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: user?.id,
    customer_email: user?.email,
    subscription_data: { metadata: { user_id: user?.id ?? "" } },
    metadata: { user_id: user?.id ?? "" },
    success_url: `${base}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/upgrade?canceled=1`,
  });
  return NextResponse.json({ url: session.url });
}
