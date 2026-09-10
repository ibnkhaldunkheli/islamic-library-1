-- =============================================================
-- Islamic Audio & PDF Library — Database Schema + Security Rules
-- =============================================================

-- -------------------------------------------------------------
-- 1. Admins table
-- -------------------------------------------------------------

create table if not exists app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table app_admins enable row level security;

create policy "admins can view admin list"
  on app_admins for select
  using (exists (select 1 from app_admins a where a.user_id = auth.uid()));

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
  language text not null check (language in ('pashto', 'urdu', 'english', 'arabic')),
  category_id uuid references categories (id) on delete set null,
  cover_url text,
  pdf_url text not null,
  created_at timestamptz not null default now(),

  -- Optional link to a scholar's dedicated profile.
  scholar_id uuid references scholars (id) on delete set null,

  -- Admin-only SEO / search-discoverability fields.
  seo_title text,
  seo_description text,
  search_keywords text,

  -- Number of times this book's page has been opened.
  view_count integer not null default 0
);

alter table books enable row level security;

create policy "anyone can read books"
  on books for select
  using (true);

create policy "only admin can write books"
  on books for all
  using (is_admin())
  with check (is_admin());

create index if not exists books_scholar_id_idx
  on books (scholar_id);

create index if not exists books_view_count_idx
  on books (view_count desc);

-- Trigram search index.
create extension if not exists pg_trgm;

create index if not exists books_search_keywords_trgm_idx
  on books using gin (search_keywords gin_trgm_ops);

create index if not exists books_title_trgm_idx
  on books using gin (title gin_trgm_ops);

create index if not exists books_author_trgm_idx
  on books using gin (author gin_trgm_ops);

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

  -- Number of times this lecture has been played.
  view_count integer not null default 0
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
-- 6. View counters
-- -------------------------------------------------------------

create or replace function increment_book_view(p_book_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update books
  set view_count = view_count + 1
  where id = p_book_id;
$$;

create or replace function increment_audio_view(p_audio_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update audio_lectures
  set view_count = view_count + 1
  where id = p_audio_id;
$$;

grant execute on function increment_book_view(uuid)
  to anon, authenticated;

grant execute on function increment_audio_view(uuid)
  to anon, authenticated;

-- -------------------------------------------------------------
-- 7. Storage buckets
-- -------------------------------------------------------------

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
