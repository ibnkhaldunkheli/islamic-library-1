-- =============================================================
-- Migration 011: Security hardening (defense in depth)
-- =============================================================
-- Run this ONCE in Supabase SQL Editor for an existing deployment
-- (fresh installs get this via the updated supabase/schema.sql).
--
-- Everything here is an ADDITIONAL layer on top of the RLS policies that
-- already exist — nothing is loosened or replaced. The goal is: even if a
-- future policy edit is slightly wrong, or someone calls the REST API
-- directly with a crafted body, these triggers make the dangerous fields
-- (user_id, report status, which item a favorite/report points at)
-- impossible to set to anything other than the correct value, at the
-- database layer, regardless of what the client sends.

-- -------------------------------------------------------------
-- 1. Force user_favorites.user_id / user_progress.user_id to the
--    caller's own auth.uid(), no matter what the insert/update body says.
-- -------------------------------------------------------------
-- RLS's `with check (auth.uid() = user_id)` already rejects a request
-- that supplies someone else's user_id — this trigger is a second,
-- independent layer that makes the column simply un-spoofable rather
-- than merely rejected.
create or replace function force_own_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists force_own_user_id_favorites on user_favorites;
create trigger force_own_user_id_favorites
  before insert or update on user_favorites
  for each row execute function force_own_user_id();

drop trigger if exists force_own_user_id_progress on user_progress;
create trigger force_own_user_id_progress
  before insert or update on user_progress
  for each row execute function force_own_user_id();

-- -------------------------------------------------------------
-- 2. Force reports.status to 'open' on insert, regardless of what the
--    client sends. Only an admin's later UPDATE (already RLS-gated to
--    is_admin()) can move a report to 'resolved'.
-- -------------------------------------------------------------
create or replace function force_report_open_on_insert()
returns trigger
language plpgsql
as $$
begin
  new.status := 'open';
  return new;
end;
$$;

drop trigger if exists force_report_open_on_insert on reports;
create trigger force_report_open_on_insert
  before insert on reports
  for each row execute function force_report_open_on_insert();

-- -------------------------------------------------------------
-- 3. Validate that item_id actually refers to a real row in the right
--    table (books or audio_lectures), based on item_type. Applies to
--    reports, user_favorites, and user_progress. This doesn't grant or
--    restrict access to anything — read access to books/audio is already
--    public — it just rejects nonsense/garbage references at write time
--    instead of silently storing them.
-- -------------------------------------------------------------
create or replace function validate_item_reference()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.item_type = 'book' then
    if not exists (select 1 from books where id = new.item_id) then
      raise exception 'item_id does not reference an existing book';
    end if;
  elsif new.item_type = 'audio' then
    if not exists (select 1 from audio_lectures where id = new.item_id) then
      raise exception 'item_id does not reference an existing audio lecture';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_item_reference_reports on reports;
create trigger validate_item_reference_reports
  before insert on reports
  for each row execute function validate_item_reference();

drop trigger if exists validate_item_reference_favorites on user_favorites;
create trigger validate_item_reference_favorites
  before insert on user_favorites
  for each row execute function validate_item_reference();

drop trigger if exists validate_item_reference_progress on user_progress;
create trigger validate_item_reference_progress
  before insert or update on user_progress
  for each row execute function validate_item_reference();
