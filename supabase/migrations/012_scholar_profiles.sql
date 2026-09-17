-- =============================================================
-- Migration 012: Richer scholar profiles
-- =============================================================
-- Run this ONCE in Supabase SQL Editor for an existing deployment
-- (fresh installs get this via the updated supabase/schema.sql).

alter table scholars
  add column if not exists arabic_name text,
  add column if not exists aliases text[] not null default '{}',
  add column if not exists languages text[] not null default '{}',
  add column if not exists featured boolean not null default false;

-- The search_normalized generated column needs to be recreated to include
-- the new arabic_name/aliases fields — Postgres doesn't support altering a
-- generated column's expression in place, so this drops and re-adds it.
-- Existing data is recomputed automatically; nothing is lost.
alter table scholars drop column if exists search_normalized;
alter table scholars
  add column search_normalized text generated always as (
    normalize_arabic(
      coalesce(name, '') || ' ' || coalesce(arabic_name, '') || ' ' ||
      coalesce(array_to_string(aliases, ' '), '') || ' ' || coalesce(bio, '')
    )
  ) stored;

create index if not exists scholars_search_normalized_trgm_idx
  on scholars using gin (search_normalized gin_trgm_ops);
create index if not exists scholars_featured_idx on scholars (featured) where featured = true;
