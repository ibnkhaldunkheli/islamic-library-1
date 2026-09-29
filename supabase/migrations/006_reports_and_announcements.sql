-- =============================================================
-- Migration 006: Reports and announcements
-- =============================================================
-- Run this ONCE in Supabase SQL Editor for an existing deployment
-- (fresh installs get this via the updated supabase/schema.sql).

-- -------------------------------------------------------------
-- Reports — visitors flag a problem with a book or lecture.
-- -------------------------------------------------------------
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (item_type in ('book', 'audio')),
  item_id uuid not null,
  reason text not null check (
    reason in (
      'broken_pdf', 'broken_audio', 'incorrect_information', 'wrong_cover',
      'missing_pages', 'incorrect_scholar', 'incorrect_category', 'other'
    )
  ),
  message text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

alter table reports enable row level security;

-- Anyone (including anonymous visitors) can file a report, but can never
-- read the list back — that would leak other people's reports. This is
-- the same "write allowed, read restricted" shape as the view-count
-- functions, just done as a straightforward RLS policy instead of an RPC
-- since a report needs several free-text fields, not one counter.
create policy "anyone can file a report"
  on reports for insert
  with check (true);

create policy "only admin can view reports"
  on reports for select
  using (is_admin());

create policy "only admin can update reports"
  on reports for update
  using (is_admin())
  with check (is_admin());

create policy "only admin can delete reports"
  on reports for delete
  using (is_admin());

create index if not exists reports_status_idx on reports (status, created_at desc);

-- -------------------------------------------------------------
-- Announcements — admin-authored banner messages.
-- -------------------------------------------------------------
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  link text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;

create policy "anyone can read active announcements"
  on announcements for select
  using (active = true or is_admin());

create policy "only admin can write announcements"
  on announcements for all
  using (is_admin())
  with check (is_admin());
