# Opulent Vision Board

AI-powered vision-to-execution app for Keisha Burton, built from the Opulent Vision Board product spec and design system v1.0.
This is the web version (installable PWA), built with Next.js and deployed on Vercel.

## What's in it

| Spec screen | Route |
| --- | --- |
| Onboarding flow (vision questions, goals, first affirmations, dashboard preview) | `/welcome` |
| Login / sign up (email, Google, Apple, password reset) | `/login` |
| Home dashboard (priority, affirmation, Clarity Score, board, journal, milestones; adaptive order) | `/home` |
| Vision board viewer (Now highlighting, categories, full-screen inspiration mode) | `/board` |
| Vision board editor (images, words, video links, voice notes; link to goals) | `/board/edit` |
| Goals & milestones (AI-planned weekly/monthly milestones) | `/goals`, `/goals/[id]` |
| Affirmations center (daily feed, favorites, history, edit, regenerate) | `/affirmations` |
| Journal & reflection (goal-aware prompts, moods, search, AI insight) | `/journal` |
| Progress & insights (Clarity Index, trend, streaks, alignment insights) | `/progress` |
| Settings (profile, nudges, subscription, sync, appearance, layout, export) | `/settings` |
| Premium paywall + Stripe Checkout | `/upgrade` |

The **Vision Alignment Engine** (`src/lib/engine.ts`) runs on-device: it prioritises today's actions, computes the Clarity Index,
spots gaps between vision and behaviour, picks smart nudges that back off when you're active, and writes personalised affirmations.
When `OPENAI_API_KEY` is set, `/api/ai` uses the model for wording and falls back to the engine on any error.

## Modes

Every integration is optional, so the app always runs:

- **Preview mode (no env vars):** data is saved in the browser; Premium can be previewed.
- **Supabase:** accounts, row-level-secured storage and real-time sync across devices. Run `supabase/schema.sql`, then set the keys.
- **OpenAI:** AI affirmations, milestone plans and insights.
- **Stripe:** subscriptions via Checkout, a webhook that records status in Supabase, and the billing portal.

See `.env.example` for every variable.

## Stripe setup

1. Create a product "Opulent Premium" with a monthly and/or yearly recurring price. Put the price IDs in `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY`.
2. Add a webhook endpoint `https://<domain>/api/stripe/webhook` for `checkout.session.completed` and `customer.subscription.*`, and set `STRIPE_WEBHOOK_SECRET`.
3. Enable the customer billing portal in Stripe settings.

## Native apps

The spec targets iOS and Android with RevenueCat. This web build shares the same data model and Supabase backend,
so a React Native / Expo app can be added later against the same tables.

## Develop

```bash
npm install
npm run dev
```
