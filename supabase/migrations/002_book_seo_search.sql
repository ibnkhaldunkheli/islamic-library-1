-- =============================================================
-- Migration: SEO + search discoverability fields for Books
-- =============================================================
-- Additive only. Safe to run on the existing production database:
--   - Does NOT drop or modify any existing table, column, or row.
--   - Does NOT touch RLS policies on books (the existing
--     "anyone can read books" / "only admin can write books"
--     policies already cover these new columns automatically).
--   - Does NOT insert any sample/demo data.
--
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

-- New nullable columns on books. All default to null, so every
-- existing row is unaffected until the admin fills them in.
alter table books
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists search_keywords text;

comment on column books.seo_title is
  'Admin-only. Optional override for the <title>/og:title metadata on the book page. Falls back to the book title when empty.';
comment on column books.seo_description is
  'Admin-only. Optional override for the meta/og description on the book page. Falls back to the book description when empty.';
comment on column books.search_keywords is
  'Admin-only, never shown to visitors. Free-text list of extra search terms and alternative spellings (any mix of Arabic, Urdu, Pashto, English), e.g. "سترہ نماز, احکام سترہ, sutrah, ahkam al sutrah". Matched by the internal search alongside title, author and category.';

-- Trigram index so ILIKE '%term%' search across keywords/title/author
-- stays fast as the library grows. pg_trgm ships with Supabase Postgres.
create extension if not exists pg_trgm;

create index if not exists books_search_keywords_trgm_idx
  on books using gin (search_keywords gin_trgm_ops);

create index if not exists books_title_trgm_idx
  on books using gin (title gin_trgm_ops);

create index if not exists books_author_trgm_idx
  on books using gin (author gin_trgm_ops);

-- -------------------------------------------------------------
-- Done. Existing books, storage, auth, and RLS are unchanged.
-- -------------------------------------------------------------
