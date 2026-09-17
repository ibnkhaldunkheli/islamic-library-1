-- =============================================================
-- Migration 010: Visitor accounts — favorites & progress sync
-- =============================================================
-- Run this ONCE in Supabase SQL Editor for an existing deployment
-- (fresh installs get this via the updated supabase/schema.sql).
--
-- IMPORTANT — this migration assumes you want public sign-up enabled.
-- Before running it, in the Supabase dashboard go to
-- Authentication → Providers → Email and make sure "Allow new users to
-- sign up" is ON (it's on by default, but the admin-only setup in this
-- project's README may have led you to turn it off). This is separate
-- from the `app_admins` table — anyone who signs up here gets an
-- ordinary account with zero admin rights; only rows in `app_admins`
-- can ever write to books/audio/etc, exactly as before.
--
-- These tables are intentionally separate from the on-device
-- localStorage favorites/progress (lib/saved.ts, lib/progress.ts), which
-- keep working unchanged for anyone who never signs in.

create table if not exists user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('book', 'audio')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

alter table user_favorites enable row level security;

create policy "users can read own favorites"
  on user_favorites for select
  using (auth.uid() = user_id);

create policy "users can insert own favorites"
  on user_favorites for insert
  with check (auth.uid() = user_id);

create policy "users can delete own favorites"
  on user_favorites for delete
  using (auth.uid() = user_id);

create index if not exists user_favorites_user_idx on user_favorites (user_id, created_at desc);

create table if not exists user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('book', 'audio')),
  item_id uuid not null,
  -- Page number for books, playback position in seconds for audio.
  position numeric not null,
  updated_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

alter table user_progress enable row level security;

create policy "users can read own progress"
  on user_progress for select
  using (auth.uid() = user_id);

create policy "users can upsert own progress"
  on user_progress for insert
  with check (auth.uid() = user_id);

create policy "users can update own progress"
  on user_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own progress"
  on user_progress for delete
  using (auth.uid() = user_id);

create index if not exists user_progress_user_idx on user_progress (user_id, updated_at desc);
