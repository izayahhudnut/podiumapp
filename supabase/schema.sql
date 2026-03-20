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
