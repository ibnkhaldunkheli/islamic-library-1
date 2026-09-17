-- =============================================================
-- Migration 008: Featured content
-- =============================================================
-- Run this ONCE in Supabase SQL Editor for an existing deployment
-- (fresh installs get this via the updated supabase/schema.sql).
--
-- Lets the admin pin specific books/lectures to a "Featured" section on
-- the homepage, independent of recency or view count.

alter table books
  add column if not exists featured boolean not null default false;

alter table audio_lectures
  add column if not exists featured boolean not null default false;

create index if not exists books_featured_idx on books (featured) where featured = true;
create index if not exists audio_lectures_featured_idx on audio_lectures (featured) where featured = true;
