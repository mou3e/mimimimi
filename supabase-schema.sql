create extension if not exists "pgcrypto";

create table if not exists public.friend_status (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  zone text not null default 'America/Toronto',
  mood text not null default 'new friend',
  chat_window text not null default '19:00-22:00',
  note text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.wall_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'anonymous',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.wall_messages(id) on delete cascade,
  name text not null default 'anonymous',
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.friend_status enable row level security;
alter table public.wall_messages enable row level security;
alter table public.message_replies enable row level security;

drop policy if exists "friend_status_read_all" on public.friend_status;
drop policy if exists "friend_status_insert_all" on public.friend_status;
drop policy if exists "friend_status_update_all" on public.friend_status;
drop policy if exists "friend_status_delete_all" on public.friend_status;

create policy "friend_status_read_all"
on public.friend_status
for select
using (true);

create policy "friend_status_insert_all"
on public.friend_status
for insert
with check (true);

create policy "friend_status_update_all"
on public.friend_status
for update
using (true)
with check (true);

create policy "friend_status_delete_all"
on public.friend_status
for delete
using (true);

drop policy if exists "wall_messages_read_all" on public.wall_messages;
drop policy if exists "wall_messages_insert_all" on public.wall_messages;

create policy "wall_messages_read_all"
on public.wall_messages
for select
using (true);

create policy "wall_messages_insert_all"
on public.wall_messages
for insert
with check (true);

drop policy if exists "message_replies_read_all" on public.message_replies;
drop policy if exists "message_replies_insert_all" on public.message_replies;

create policy "message_replies_read_all"
on public.message_replies
for select
using (true);

create policy "message_replies_insert_all"
on public.message_replies
for insert
with check (true);
