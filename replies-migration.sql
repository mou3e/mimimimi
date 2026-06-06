create extension if not exists "pgcrypto";

create table if not exists public.message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.wall_messages(id) on delete cascade,
  name text not null default 'anonymous',
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.message_replies enable row level security;

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
