-- =============================================================
-- Migration: Book <-> Scholar relationship
-- =============================================================
-- Additive only. Safe to run on the existing production database:
--   - Does NOT drop or modify any existing table, column, or row.
--   - Does NOT touch the existing `author` free-text column — it is left
--     exactly as-is for books whose writer isn't (yet) a full Ulama
--     profile, or as a display fallback.
--   - Does NOT touch RLS policies on books (the existing
--     "anyone can read books" / "only admin can write books" policies
--     already cover this new column automatically).
--   - Mirrors the audio_lectures.scholar_id column/pattern that already
--     exists in schema.sql, so the two tables stay consistent.
--
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table books
  add column if not exists scholar_id uuid references scholars (id) on delete set null;

comment on column books.scholar_id is
  'Optional link to a scholars row, set by the admin when the book''s author has a dedicated Ulama profile. When set, the book appears under "Books by this Shaykh" on that profile page. The free-text author column is kept as-is for books whose writer has no profile yet.';

create index if not exists books_scholar_id_idx on books (scholar_id);

-- -------------------------------------------------------------
-- Done. Existing books, storage, auth, and RLS are unchanged.
-- -------------------------------------------------------------
