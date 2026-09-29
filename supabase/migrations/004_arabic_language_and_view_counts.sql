-- =============================================================
-- Migration: Arabic language option + view-count popularity tracking
-- =============================================================
-- Additive/adjustment only. Safe to run on the existing production database:
--   - Widens the existing language CHECK constraints to also allow
--     'arabic'. Every existing row's language value ('pashto' | 'urdu' |
--     'english') is still valid, so no existing data is touched or
--     invalidated.
--   - Adds a new `view_count` column (default 0) to `books` and
--     `audio_lectures`. Every existing row gets 0, nothing is dropped.
--   - Adds two SECURITY DEFINER functions that only ever increment a
--     single integer column by 1 — they cannot be used to read, modify,
--     or delete anything else, so exposing them to anonymous/public
--     visitors does not weaken the RLS "only admin can write" policies
--     already in place on these tables.
--
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

-- -------------------------------------------------------------
-- 1. Allow 'arabic' as a fourth language value
-- -------------------------------------------------------------
alter table categories drop constraint if exists categories_language_check;
alter table categories
  add constraint categories_language_check
  check (language in ('pashto', 'urdu', 'english', 'arabic'));

alter table books drop constraint if exists books_language_check;
alter table books
  add constraint books_language_check
  check (language in ('pashto', 'urdu', 'english', 'arabic'));

alter table audio_lectures drop constraint if exists audio_lectures_language_check;
alter table audio_lectures
  add constraint audio_lectures_language_check
  check (language in ('pashto', 'urdu', 'english', 'arabic'));

-- -------------------------------------------------------------
-- 2. View-count columns (for "Most read" sorting + admin analytics)
-- -------------------------------------------------------------
alter table books
  add column if not exists view_count integer not null default 0;

alter table audio_lectures
  add column if not exists view_count integer not null default 0;

comment on column books.view_count is
  'Number of times this book''s page has been opened. Incremented via the increment_book_view() function, never written directly by clients.';
comment on column audio_lectures.view_count is
  'Number of times this lecture has been played. Incremented via the increment_audio_view() function, never written directly by clients.';

create index if not exists books_view_count_idx on books (view_count desc);

-- -------------------------------------------------------------
-- 3. Safe, narrow increment functions
-- -------------------------------------------------------------
-- SECURITY DEFINER lets these bypass the "only admin can write" RLS
-- policy for exactly one purpose: bumping the view counter by 1 for a
-- given row. They take no other input and expose no other capability,
-- so granting execute to anonymous visitors is safe — it cannot be used
-- to edit titles, delete books, or touch any other column/table.
create or replace function increment_book_view(p_book_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update books set view_count = view_count + 1 where id = p_book_id;
$$;

create or replace function increment_audio_view(p_audio_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update audio_lectures set view_count = view_count + 1 where id = p_audio_id;
$$;

grant execute on function increment_book_view(uuid) to anon, authenticated;
grant execute on function increment_audio_view(uuid) to anon, authenticated;

-- -------------------------------------------------------------
-- Done. Existing books, audio lectures, storage, auth, and RLS
-- write-protection are unchanged.
-- -------------------------------------------------------------
