-- =============================================================
-- Migration 009: Arabic-aware search normalization
-- =============================================================
-- Run this ONCE in Supabase SQL Editor for an existing deployment
-- (fresh installs get this via the updated supabase/schema.sql).
--
-- Problem: a visitor searching "سترة" won't find a book titled "سُتْرَة"
-- (with harakat/diacritics) or "ستره" (with a ة/ه variant) using plain
-- ILIKE, because the byte sequences differ even though a human reads them
-- as the same word. This adds a normalization function plus generated
-- columns so search can match across those variants.
--
-- What normalize_arabic() does, in order:
--   1. Strips Arabic diacritics (harakat/tashkeel) entirely.
--   2. Folds alef variants (أ إ آ) to bare alef (ا).
--   3. Folds ta marbuta (ة) to ha (ه).
--   4. Folds alef maksura (ى) to ya (ي).
--   5. Collapses repeated whitespace.
-- Non-Arabic text (Pashto/Urdu/English) passes through unchanged, since
-- none of those characters appear in Latin/other-script strings.

create or replace function normalize_arabic(input text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(coalesce(input, ''), '[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]', '', 'g'),
          '[\u0623\u0625\u0622]', '\u0627', 'g'
        ),
        '\u0629', '\u0647', 'g'
      ),
      '\u0649', '\u064A', 'g'
    )
  );
$$;

-- Books: combine the fields already used for free-text search into one
-- normalized column, generated automatically whenever a row changes.
alter table books
  add column if not exists search_normalized text
    generated always as (
      normalize_arabic(
        coalesce(title, '') || ' ' || coalesce(author, '') || ' ' ||
        coalesce(description, '') || ' ' || coalesce(search_keywords, '')
      )
    ) stored;

alter table audio_lectures
  add column if not exists search_normalized text
    generated always as (
      normalize_arabic(coalesce(title, '') || ' ' || coalesce(description, ''))
    ) stored;

alter table scholars
  add column if not exists search_normalized text
    generated always as (
      normalize_arabic(coalesce(name, '') || ' ' || coalesce(bio, ''))
    ) stored;

create index if not exists books_search_normalized_trgm_idx
  on books using gin (search_normalized gin_trgm_ops);
create index if not exists audio_search_normalized_trgm_idx
  on audio_lectures using gin (search_normalized gin_trgm_ops);
create index if not exists scholars_search_normalized_trgm_idx
  on scholars using gin (search_normalized gin_trgm_ops);
