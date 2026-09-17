-- =============================================================
-- Migration 007: Audio series / part number
-- =============================================================
-- Run this ONCE in Supabase SQL Editor for an existing deployment
-- (fresh installs get this via the updated supabase/schema.sql).
--
-- Lets a set of lectures be grouped into a named series with an ordering,
-- so a multi-part lecture series can show "Part 3 of 12" and next/previous
-- navigation between parts.

alter table audio_lectures
  add column if not exists series_name text,
  add column if not exists part_number integer;

create index if not exists audio_lectures_series_idx on audio_lectures (series_name, part_number);
