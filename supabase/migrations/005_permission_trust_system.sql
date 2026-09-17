-- =============================================================
-- Migration 005: Permission / trust system for books and audio
-- =============================================================
-- Run this ONCE in Supabase SQL Editor if you already have a deployed
-- database (fresh installs get this via the updated supabase/schema.sql).
--
-- Adds explicit "do we actually have the right to publish this?" metadata
-- to books and audio_lectures, plus a downloadable flag for audio (books
-- already default to downloadable via the PDF reader's download button).
--
-- Nothing here changes RLS: only admins could ever write these columns
-- before, and that stays true — this just adds columns to an
-- already-locked-down table.

alter table books
  add column if not exists permission_status text
    not null default 'unknown'
    check (permission_status in ('authorized', 'public_domain', 'author_permission', 'publisher_permission', 'unknown')),
  add column if not exists permission_note text,
  add column if not exists copyright_note text,
  add column if not exists source_note text;

alter table audio_lectures
  add column if not exists permission_status text
    not null default 'unknown'
    check (permission_status in ('authorized', 'public_domain', 'author_permission', 'publisher_permission', 'unknown')),
  add column if not exists permission_note text,
  add column if not exists copyright_note text,
  add column if not exists source_note text,
  add column if not exists downloadable boolean not null default true;

-- Note: `permission_status = 'unknown'` is the default so existing rows
-- don't silently claim authorization they were never given. The app layer
-- is responsible for surfacing this honestly on each detail page — it is
-- NOT used to hide already-published content, only to display accurate
-- status. Deciding whether to un-publish anything with unknown status is
-- an editorial decision for the admin, not something this migration does.
