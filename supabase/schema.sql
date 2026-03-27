create extension if not exists "pgcrypto";

create table if not exists public.debates (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  topic text not null,
  description text,
  is_public boolean not null default true,
  status text not null default 'live' check (status in ('live', 'scheduled', 'ended')),
  scheduled_for timestamptz,
  thumbnail_url text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Add thumbnail_url to existing tables that were created before this column
alter table public.debates add column if not exists thumbnail_url text;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id)
);

create table if not exists public.debate_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debate_id uuid not null references public.debates(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, debate_id)
);

alter table public.profiles enable row level security;
alter table public.debate_likes enable row level security;

drop policy if exists "users can read any profile" on public.profiles;
create policy "users can read any profile"
on public.profiles for select to authenticated using (true);

drop policy if exists "users can manage their own profile" on public.profiles;
create policy "users can manage their own profile"
on public.profiles for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can read likes" on public.debate_likes;
create policy "users can read likes"
on public.debate_likes for select to authenticated using (true);

drop policy if exists "users can manage their own likes" on public.debate_likes;
create policy "users can manage their own likes"
on public.debate_likes for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.debate_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debate_id uuid not null references public.debates(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, debate_id)
);

alter table public.debate_saves enable row level security;

drop policy if exists "users can read saves" on public.debate_saves;
create policy "users can read saves"
on public.debate_saves for select to authenticated using (true);

drop policy if exists "users can manage their own saves" on public.debate_saves;
create policy "users can manage their own saves"
on public.debate_saves for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.debate_messages (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references public.debates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  user_avatar text,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.debates enable row level security;
alter table public.debate_messages enable row level security;

drop policy if exists "authenticated users can create debates" on public.debates;
create policy "authenticated users can create debates"
on public.debates
for insert
to authenticated
with check (auth.uid() = host_user_id);

drop policy if exists "authenticated users can read debates" on public.debates;
create policy "authenticated users can read debates"
on public.debates
for select
to authenticated
using (true);

drop policy if exists "hosts can update their debates" on public.debates;
create policy "hosts can update their debates"
on public.debates
for update
to authenticated
using (auth.uid() = host_user_id)
with check (auth.uid() = host_user_id);

drop policy if exists "hosts can delete their debates" on public.debates;
create policy "hosts can delete their debates"
on public.debates
for delete
to authenticated
using (auth.uid() = host_user_id);

drop policy if exists "authenticated users can read messages" on public.debate_messages;
create policy "authenticated users can read messages"
on public.debate_messages
for select
to authenticated
using (true);

drop policy if exists "authenticated users can send messages" on public.debate_messages;
create policy "authenticated users can send messages"
on public.debate_messages
for insert
to authenticated
with check (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.debates;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.debate_messages;
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- Gifting system
-- ============================================================

-- Gift type catalog
create table if not exists public.gift_types (
  id text primary key,
  name text not null,
  emoji text not null,
  coin_cost integer not null check (coin_cost > 0),
  diamond_value integer not null check (diamond_value > 0)
);

-- Coin balances (viewers buy coins to send gifts)
create table if not exists public.coin_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Diamond balances (hosts earn diamonds from gifts, convert to cash)
create table if not exists public.diamond_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  total_earned integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

-- Individual gift events sent during debates
create table if not exists public.gift_events (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references public.debates(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  gift_type_id text not null references public.gift_types(id),
  coin_amount integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.gift_types enable row level security;
alter table public.coin_balances enable row level security;
alter table public.diamond_balances enable row level security;
alter table public.gift_events enable row level security;

drop policy if exists "anyone can read gift types" on public.gift_types;
create policy "anyone can read gift types"
on public.gift_types for select to authenticated using (true);

drop policy if exists "users can read own coin balance" on public.coin_balances;
create policy "users can read own coin balance"
on public.coin_balances for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can read own diamond balance" on public.diamond_balances;
create policy "users can read own diamond balance"
on public.diamond_balances for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "anyone can read gift events" on public.gift_events;
create policy "anyone can read gift events"
on public.gift_events for select to authenticated using (true);

-- Seed gift catalog
insert into public.gift_types (id, name, emoji, coin_cost, diamond_value) values
  ('rose',    'Rose',    '🌹',  10,  5),
  ('fire',    'Fire',    '🔥',  25,  12),
  ('star',    'Star',    '⭐',  50,  25),
  ('diamond', 'Diamond', '💎', 100,  55),
  ('rocket',  'Rocket',  '🚀', 200, 110),
  ('crown',   'Crown',   '👑', 500, 280)
on conflict (id) do nothing;

-- Atomic send_gift: deduct sender coins, credit host diamonds, record event
create or replace function public.send_gift(
  p_debate_id uuid,
  p_sender_id uuid,
  p_sender_name text,
  p_recipient_id uuid,
  p_gift_type_id text
) returns uuid language plpgsql security definer as $$
declare
  v_gift public.gift_types;
  v_balance integer;
  v_event_id uuid;
begin
  if auth.uid() != p_sender_id then
    raise exception 'Unauthorized';
  end if;

  select * into v_gift from public.gift_types where id = p_gift_type_id;
  if not found then raise exception 'Gift type not found'; end if;

  select balance into v_balance
  from public.coin_balances where user_id = p_sender_id for update;

  if v_balance is null or v_balance < v_gift.coin_cost then
    raise exception 'Insufficient coins';
  end if;

  update public.coin_balances
  set balance = balance - v_gift.coin_cost, updated_at = now()
  where user_id = p_sender_id;

  insert into public.diamond_balances (user_id, balance, total_earned)
  values (p_recipient_id, v_gift.diamond_value, v_gift.diamond_value)
  on conflict (user_id) do update
  set balance = public.diamond_balances.balance + v_gift.diamond_value,
      total_earned = public.diamond_balances.total_earned + v_gift.diamond_value,
      updated_at = now();

  insert into public.gift_events (
    debate_id, sender_id, sender_name, recipient_id, gift_type_id, coin_amount
  ) values (
    p_debate_id, p_sender_id, p_sender_name, p_recipient_id, p_gift_type_id, v_gift.coin_cost
  ) returning id into v_event_id;

  return v_event_id;
end;
$$;

-- Demo coin top-up (swap with Stripe webhook in production)
create or replace function public.add_coins(
  p_user_id uuid,
  p_amount integer
) returns void language plpgsql security definer as $$
begin
  if auth.uid() != p_user_id then raise exception 'Unauthorized'; end if;
  insert into public.coin_balances (user_id, balance)
  values (p_user_id, p_amount)
  on conflict (user_id) do update
  set balance = public.coin_balances.balance + p_amount, updated_at = now();
end;
$$;

-- Enable realtime for gift events
do $$
begin
  alter publication supabase_realtime add table public.gift_events;
exception
  when duplicate_object then null;
end $$;

insert into storage.buckets (id, name, public)
values ('debate-thumbnails', 'debate-thumbnails', true)
on conflict (id) do nothing;

drop policy if exists "authenticated users can upload thumbnails" on storage.objects;
create policy "authenticated users can upload thumbnails"
on storage.objects for insert to authenticated
with check (bucket_id = 'debate-thumbnails' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "anyone can view thumbnails" on storage.objects;
create policy "anyone can view thumbnails"
on storage.objects for select to authenticated
using (bucket_id = 'debate-thumbnails');
