-- =============================================================
-- Islamic Audio & PDF Library — Database Schema + Security Rules
-- =============================================================
-- Run this ENTIRE file once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- It creates every table empty (no sample content) and locks down
-- write access at the DATABASE level using Row Level Security (RLS),
-- so permissions are enforced by Postgres itself, not just hidden in the UI.

-- -------------------------------------------------------------
-- 1. Admins table
-- -------------------------------------------------------------
-- This table holds the user_id(s) of accounts allowed to manage content.
-- It starts EMPTY. After you create your own login (Supabase Auth),
-- you add yourself here (see README "Create the owner/admin account").
create table if not exists app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table app_admins enable row level security;

-- Only an existing admin can view the admin list (prevents users from
-- probing who the admin is). No one can insert/update/delete this table
-- through the API at all — that is done once, safely, via the SQL editor,
-- which uses your Supabase project credentials, not the app.
create policy "admins can view admin list"
  on app_admins for select
  using (exists (select 1 from app_admins a where a.user_id = auth.uid()));

-- -------------------------------------------------------------
-- Helper function: is the current logged-in user an admin?
-- -------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from app_admins where user_id = auth.uid()
  );
$$;

-- -------------------------------------------------------------
-- Helper function: Arabic-aware search normalization
-- -------------------------------------------------------------
-- Strips harakat/diacritics and folds common letter variants (see
-- supabase/migrations/009_arabic_search_normalization.sql for the full
-- rationale) so search can match "سترة", "سُتْرَة" and "سترہ" as the same
-- word. Non-Arabic text passes through unchanged.
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

-- -------------------------------------------------------------
-- 2. Categories
-- -------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  language text not null check (language in ('pashto', 'urdu', 'english', 'arabic')),
  created_at timestamptz not null default now()
);

alter table categories enable row level security;

create policy "anyone can read categories"
  on categories for select
  using (true);

create policy "only admin can write categories"
  on categories for all
  using (is_admin())
  with check (is_admin());

-- -------------------------------------------------------------
-- 3. Scholars / Ulama
-- -------------------------------------------------------------
create table if not exists scholars (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text,
  photo_url text,
  created_at timestamptz not null default now(),
  -- Arabic name, alternate spellings/transliterations, and languages the
  -- scholar taught/wrote in. Admin-entered only — never inferred or
  -- auto-translated (see the "No fake content" principle in the README).
  arabic_name text,
  aliases text[] not null default '{}',
  languages text[] not null default '{}',
  -- Admin can pin this scholar to a "Featured" section, same as books/audio.
  featured boolean not null default false,
  -- Normalized text used for Arabic-diacritic-aware search matching.
  search_normalized text generated always as (
    normalize_arabic(
      coalesce(name, '') || ' ' || coalesce(arabic_name, '') || ' ' ||
      coalesce(array_to_string(aliases, ' '), '') || ' ' || coalesce(bio, '')
    )
  ) stored
);

alter table scholars enable row level security;

create policy "anyone can read scholars"
  on scholars for select
  using (true);

create policy "only admin can write scholars"
  on scholars for all
  using (is_admin())
  with check (is_admin());

-- -------------------------------------------------------------
-- 4. Books (PDFs)
-- -------------------------------------------------------------
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  description text,
  language text not null check (language in ('pashto', 'urdu', 'english', 'arabic')),
  category_id uuid references categories (id) on delete set null,
  cover_url text,
  pdf_url text not null,
  created_at timestamptz not null default now(),
  -- Optional link to a scholar's dedicated profile (see
  -- supabase/migrations/003_book_scholar_relationship.sql for the note on
  -- existing databases). The free-text `author` column above is kept as a
  -- fallback for writers who don't have a scholar profile yet.
  scholar_id uuid references scholars (id) on delete set null,
  -- Admin-only SEO / search-discoverability fields (see
  -- supabase/migrations/002_book_seo_search.sql for the note on existing
  -- databases). Never rendered as a visible keyword list to visitors.
  seo_title text,
  seo_description text,
  search_keywords text,
  -- Number of times this book's page has been opened. Only ever changed
  -- by the increment_book_view() function below (see "View counters").
  view_count integer not null default 0,
  -- Trust / permission metadata (see supabase/migrations/005_permission_trust_system.sql
  -- for the note on existing databases). Defaults to 'unknown' rather than
  -- assuming authorization — the admin sets this explicitly per item.
  permission_status text not null default 'unknown'
    check (permission_status in ('authorized', 'public_domain', 'author_permission', 'publisher_permission', 'unknown')),
  permission_note text,
  copyright_note text,
  source_note text,
  -- Admin can pin this book to the homepage "Featured" section,
  -- independent of recency or view count.
  featured boolean not null default false,
  -- Storage-provider bookkeeping alongside pdf_url/cover_url above (see
  -- lib/storage/README.md). Supabase Storage is the only active provider;
  -- these columns just make the underlying object locatable for a future
  -- migration or mirroring job instead of only having the public URL.
  storage_provider text not null default 'supabase',
  storage_bucket text,
  storage_path text,
  file_size bigint,
  mime_type text,
  -- Normalized text used for Arabic-diacritic-aware search matching (see
  -- supabase/migrations/009_arabic_search_normalization.sql).
  search_normalized text generated always as (
    normalize_arabic(
      coalesce(title, '') || ' ' || coalesce(author, '') || ' ' ||
      coalesce(description, '') || ' ' || coalesce(search_keywords, '')
    )
  ) stored
);

alter table books enable row level security;

create policy "anyone can read books"
  on books for select
  using (true);

create policy "only admin can write books"
  on books for all
  using (is_admin())
  with check (is_admin());

create index if not exists books_scholar_id_idx on books (scholar_id);
create index if not exists books_view_count_idx on books (view_count desc);
create index if not exists books_featured_idx on books (featured) where featured = true;

-- Trigram search index (fresh installs only — existing databases should
-- run supabase/migrations/002_book_seo_search.sql instead).
create extension if not exists pg_trgm;
create index if not exists books_search_keywords_trgm_idx on books using gin (search_keywords gin_trgm_ops);
create index if not exists books_title_trgm_idx on books using gin (title gin_trgm_ops);
create index if not exists books_author_trgm_idx on books using gin (author gin_trgm_ops);
create index if not exists books_search_normalized_trgm_idx on books using gin (search_normalized gin_trgm_ops);

-- -------------------------------------------------------------
-- 5. Audio lectures
-- -------------------------------------------------------------
create table if not exists audio_lectures (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  scholar_id uuid references scholars (id) on delete set null,
  description text,
  language text not null check (language in ('pashto', 'urdu', 'english', 'arabic')),
  category_id uuid references categories (id) on delete set null,
  audio_url text not null,
  created_at timestamptz not null default now(),
  -- Number of times this lecture has been played. Only ever changed by
  -- the increment_audio_view() function below (see "View counters").
  view_count integer not null default 0,
  -- Trust / permission metadata (see supabase/migrations/005_permission_trust_system.sql
  -- for the note on existing databases).
  permission_status text not null default 'unknown'
    check (permission_status in ('authorized', 'public_domain', 'author_permission', 'publisher_permission', 'unknown')),
  permission_note text,
  copyright_note text,
  source_note text,
  -- Explicit download permission. When false, the detail page must show a
  -- clear "not available" message instead of just hiding the button.
  downloadable boolean not null default true,
  -- Optional grouping for multi-part lecture series (e.g. a tafsir series
  -- given over several sittings). Two lectures share a series when their
  -- series_name matches exactly; part_number controls the display order
  -- and the next/previous part navigation on the detail page.
  series_name text,
  part_number integer,
  -- Admin can pin this lecture to the homepage "Featured" section.
  featured boolean not null default false,
  -- Storage-provider bookkeeping alongside audio_url above (see
  -- lib/storage/README.md). Same purpose/notes as the matching columns
  -- on `books`.
  storage_provider text not null default 'supabase',
  storage_bucket text,
  storage_path text,
  file_size bigint,
  mime_type text,
  -- Normalized text used for Arabic-diacritic-aware search matching.
  search_normalized text generated always as (
    normalize_arabic(coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored
);

alter table audio_lectures enable row level security;

create policy "anyone can read audio_lectures"
  on audio_lectures for select
  using (true);

create policy "only admin can write audio_lectures"
  on audio_lectures for all
  using (is_admin())
  with check (is_admin());

create index if not exists audio_lectures_series_idx on audio_lectures (series_name, part_number);
create index if not exists audio_lectures_featured_idx on audio_lectures (featured) where featured = true;
create index if not exists audio_search_normalized_trgm_idx on audio_lectures using gin (search_normalized gin_trgm_ops);
create index if not exists scholars_search_normalized_trgm_idx on scholars using gin (search_normalized gin_trgm_ops);
create index if not exists scholars_featured_idx on scholars (featured) where featured = true;

-- -------------------------------------------------------------
-- 6. View counters
-- -------------------------------------------------------------
-- SECURITY DEFINER lets these bypass the "only admin can write" policy
-- for exactly one narrow purpose: bumping a row's view_count by 1. They
-- take no other input and touch no other column/table, so it's safe to
-- let anonymous visitors call them.
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
-- 7. Storage buckets (PDFs, audio, cover images, scholar photos)
-- -------------------------------------------------------------
-- Public buckets: files are readable by anyone with the link (needed so the
-- in-app PDF viewer and audio player can load them), but nobody can upload,
-- replace, or delete files unless they are in app_admins.
insert into storage.buckets (id, name, public)
values
  ('book-pdfs', 'book-pdfs', true),
  ('book-covers', 'book-covers', true),
  ('audio-files', 'audio-files', true),
  ('scholar-photos', 'scholar-photos', true)
on conflict (id) do nothing;

create policy "public can read book-pdfs"
  on storage.objects for select
  using (bucket_id = 'book-pdfs');

create policy "admin can write book-pdfs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'book-pdfs' and is_admin());

create policy "admin can update book-pdfs"
  on storage.objects for update to authenticated
  using (bucket_id = 'book-pdfs' and is_admin());

create policy "admin can delete book-pdfs"
  on storage.objects for delete to authenticated
  using (bucket_id = 'book-pdfs' and is_admin());

create policy "public can read book-covers"
  on storage.objects for select
  using (bucket_id = 'book-covers');

create policy "admin can write book-covers"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'book-covers' and is_admin());

create policy "admin can update book-covers"
  on storage.objects for update to authenticated
  using (bucket_id = 'book-covers' and is_admin());

create policy "admin can delete book-covers"
  on storage.objects for delete to authenticated
  using (bucket_id = 'book-covers' and is_admin());

create policy "public can read audio-files"
  on storage.objects for select
  using (bucket_id = 'audio-files');

create policy "admin can write audio-files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'audio-files' and is_admin());

create policy "admin can update audio-files"
  on storage.objects for update to authenticated
  using (bucket_id = 'audio-files' and is_admin());

create policy "admin can delete audio-files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'audio-files' and is_admin());

create policy "public can read scholar-photos"
  on storage.objects for select
  using (bucket_id = 'scholar-photos');

create policy "admin can write scholar-photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'scholar-photos' and is_admin());

create policy "admin can update scholar-photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'scholar-photos' and is_admin());

create policy "admin can delete scholar-photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'scholar-photos' and is_admin());

-- -------------------------------------------------------------
-- 8. Reports (visitors flag a problem with a book or lecture)
-- -------------------------------------------------------------
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (item_type in ('book', 'audio')),
  item_id uuid not null,
  reason text not null check (
    reason in (
      'broken_pdf', 'broken_audio', 'incorrect_information', 'wrong_cover',
      'missing_pages', 'incorrect_scholar', 'incorrect_category', 'other'
    )
  ),
  message text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

alter table reports enable row level security;

create policy "anyone can file a report"
  on reports for insert
  with check (true);

create policy "only admin can view reports"
  on reports for select
  using (is_admin());

create policy "only admin can update reports"
  on reports for update
  using (is_admin())
  with check (is_admin());

create policy "only admin can delete reports"
  on reports for delete
  using (is_admin());

create index if not exists reports_status_idx on reports (status, created_at desc);

-- -------------------------------------------------------------
-- 9. Announcements (admin-authored banner messages)
-- -------------------------------------------------------------
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  link text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;

create policy "anyone can read active announcements"
  on announcements for select
  using (active = true or is_admin());

create policy "only admin can write announcements"
  on announcements for all
  using (is_admin())
  with check (is_admin());

-- -------------------------------------------------------------
-- 10. Visitor accounts — favorites & progress sync
-- -------------------------------------------------------------
-- Separate from the on-device localStorage favorites/progress
-- (lib/saved.ts, lib/progress.ts), which keep working unchanged for
-- anyone who never signs in. Signing up here creates an ordinary
-- Supabase Auth user with zero admin rights — only rows in `app_admins`
-- can write to books/audio/etc.
create table if not exists user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('book', 'audio')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

alter table user_favorites enable row level security;

create policy "users can read own favorites"
  on user_favorites for select
  using (auth.uid() = user_id);

create policy "users can insert own favorites"
  on user_favorites for insert
  with check (auth.uid() = user_id);

create policy "users can delete own favorites"
  on user_favorites for delete
  using (auth.uid() = user_id);

create index if not exists user_favorites_user_idx on user_favorites (user_id, created_at desc);

create table if not exists user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('book', 'audio')),
  item_id uuid not null,
  position numeric not null,
  updated_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

alter table user_progress enable row level security;

create policy "users can read own progress"
  on user_progress for select
  using (auth.uid() = user_id);

create policy "users can upsert own progress"
  on user_progress for insert
  with check (auth.uid() = user_id);

create policy "users can update own progress"
  on user_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own progress"
  on user_progress for delete
  using (auth.uid() = user_id);

create index if not exists user_progress_user_idx on user_progress (user_id, updated_at desc);

-- -------------------------------------------------------------
-- 11. Security hardening triggers (defense in depth)
-- -------------------------------------------------------------
-- Additional layer on top of the RLS policies above — nothing here
-- replaces or loosens them. Makes the dangerous fields (user_id, report
-- status, which item a reference points at) impossible to spoof at the
-- database layer, independent of the RLS `with check` clauses that
-- already reject spoofed values.
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

create trigger force_own_user_id_favorites
  before insert or update on user_favorites
  for each row execute function force_own_user_id();

create trigger force_own_user_id_progress
  before insert or update on user_progress
  for each row execute function force_own_user_id();

create or replace function force_report_open_on_insert()
returns trigger
language plpgsql
as $$
begin
  new.status := 'open';
  return new;
end;
$$;

create trigger force_report_open_on_insert
  before insert on reports
  for each row execute function force_report_open_on_insert();

-- Validates item_id actually refers to a real row in the right table
-- (books or audio_lectures) based on item_type. Doesn't grant or restrict
-- any access — read access to books/audio is already public — it just
-- rejects nonsense/garbage references at write time.
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

create trigger validate_item_reference_reports
  before insert on reports
  for each row execute function validate_item_reference();

create trigger validate_item_reference_favorites
  before insert on user_favorites
  for each row execute function validate_item_reference();

create trigger validate_item_reference_progress
  before insert or update on user_progress
  for each row execute function validate_item_reference();

-- -------------------------------------------------------------
-- Done. All tables above are empty. No sample rows are inserted.
-- -------------------------------------------------------------
