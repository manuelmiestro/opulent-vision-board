import { NextResponse } from "next/server";
import { adminSupabase, appUrl, userFromRequest } from "@/lib/server";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const s = stripe();
  const sb = adminSupabase();
  const user = await userFromRequest(req);
  if (!s || !sb || !user) return NextResponse.json({ error: "Billing isn't available." }, { status: 400 });
  const { data } = await sb.from("subscriptions").select("customer_id").eq("user_id", user.id).maybeSingle();
  if (!data?.customer_id) return NextResponse.json({ error: "No subscription found." }, { status: 404 });
  const portal = await s.billingPortal.sessions.create({ customer: data.customer_id, return_url: `${appUrl(req)}/settings` });
  return NextResponse.json({ url: portal.url });
}
