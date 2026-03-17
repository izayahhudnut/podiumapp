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
  created_at timestamptz not null default timezone('utc', now())
);

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
