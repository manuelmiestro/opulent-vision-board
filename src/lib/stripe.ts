import "server-only";
import Stripe from "stripe";
import { env } from "./server";

let client: Stripe | null = null;
export function stripe(): Stripe | null {
  if (!env.stripeKey) return null;
  if (!client) client = new Stripe(env.stripeKey);
  return client;
}
