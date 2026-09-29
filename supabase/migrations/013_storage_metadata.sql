-- =============================================================
-- Migration 013: Storage provider metadata
-- =============================================================
-- Run this ONCE in Supabase SQL Editor for an existing deployment
-- (fresh installs get this via the updated supabase/schema.sql).
--
-- Supabase Storage remains the only active provider — see
-- lib/storage/README.md. These columns don't change that; they just
-- record, alongside the existing public pdf_url/audio_url, exactly which
-- provider/bucket/object-key produced that URL and how big/what type the
-- file is. That's what would let a future migration or mirroring job
-- operate on the underlying object instead of re-deriving it from a URL.
--
-- Existing rows get storage_provider = 'supabase' (since that's where
-- every file uploaded through this app so far actually lives) with the
-- rest left null — there's no reliable way to recover the exact bucket/
-- object-key for files uploaded before this migration purely from their
-- public URL, so those columns simply stay empty for old rows rather
-- than guessing. Every new upload after this migration fills them in.

alter table books
  add column if not exists storage_provider text not null default 'supabase',
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists file_size bigint,
  add column if not exists mime_type text;

alter table audio_lectures
  add column if not exists storage_provider text not null default 'supabase',
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists file_size bigint,
  add column if not exists mime_type text;
