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
-- 2. Categories
-- -------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  language text not null check (language in ('pashto', 'urdu', 'english')),
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
  created_at timestamptz not null default now()
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
  language text not null check (language in ('pashto', 'urdu', 'english')),
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
  search_keywords text
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

-- Trigram search index (fresh installs only — existing databases should
-- run supabase/migrations/002_book_seo_search.sql instead).
create extension if not exists pg_trgm;
create index if not exists books_search_keywords_trgm_idx on books using gin (search_keywords gin_trgm_ops);
create index if not exists books_title_trgm_idx on books using gin (title gin_trgm_ops);
create index if not exists books_author_trgm_idx on books using gin (author gin_trgm_ops);

-- -------------------------------------------------------------
-- 5. Audio lectures
-- -------------------------------------------------------------
create table if not exists audio_lectures (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  scholar_id uuid references scholars (id) on delete set null,
  description text,
  language text not null check (language in ('pashto', 'urdu', 'english')),
  category_id uuid references categories (id) on delete set null,
  audio_url text not null,
  created_at timestamptz not null default now()
);

alter table audio_lectures enable row level security;

create policy "anyone can read audio_lectures"
  on audio_lectures for select
  using (true);

create policy "only admin can write audio_lectures"
  on audio_lectures for all
  using (is_admin())
  with check (is_admin());

-- -------------------------------------------------------------
-- 6. Storage buckets (PDFs, audio, cover images, scholar photos)
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
-- Done. All tables above are empty. No sample rows are inserted.
-- -------------------------------------------------------------
