-- Opulent Vision Board: database schema
-- Run once in the Supabase SQL editor (Project > SQL > New query).

-- One row per user holding their whole workspace (goals, board, journal, affirmations).
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

drop policy if exists "Users read their own state" on public.user_state;
create policy "Users read their own state" on public.user_state
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert their own state" on public.user_state;
create policy "Users insert their own state" on public.user_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their own state" on public.user_state;
create policy "Users update their own state" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own state" on public.user_state;
create policy "Users delete their own state" on public.user_state
  for delete using (auth.uid() = user_id);

-- Subscriptions are written only by the server (Stripe webhook, service role).
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id text,
  subscription_id text,
  status text,
  price_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Users read their own subscription" on public.subscriptions;
create policy "Users read their own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);
-- No insert/update/delete policies: only the service role key can write.

-- Real-time cross-device sync.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'user_state'
  ) then
    alter publication supabase_realtime add table public.user_state;
  end if;
end $$;
