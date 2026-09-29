-- Migration 014: authenticated comments, replies, reports, and moderation.
-- Run once on an existing deployment. It is safe to re-run and does not delete content.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('book', 'audio')),
  item_id uuid not null,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  status text not null default 'visible' check (status in ('visible', 'reported', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comments_item_idx on public.comments(item_type, item_id, created_at desc);
create index if not exists comments_parent_idx on public.comments(parent_id);
alter table public.comments enable row level security;

drop policy if exists "anyone can read visible comments" on public.comments;
drop policy if exists "signed in users can comment" on public.comments;
drop policy if exists "users edit own comments" on public.comments;
drop policy if exists "users delete own comments" on public.comments;
create policy "anyone can read visible comments" on public.comments for select using (status = 'visible' or auth.uid() = user_id or is_admin());
create policy "signed in users can comment" on public.comments for insert to authenticated with check (auth.uid() = user_id and status = 'visible');
create policy "users edit own comments" on public.comments for update to authenticated using (auth.uid() = user_id or is_admin()) with check (auth.uid() = user_id or is_admin());
create policy "users delete own comments" on public.comments for delete to authenticated using (auth.uid() = user_id or is_admin());

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 1 and 500),
  created_at timestamptz not null default now(),
  unique(comment_id, reporter_id)
);
alter table public.comment_reports enable row level security;
drop policy if exists "users create comment reports" on public.comment_reports;
drop policy if exists "users read own comment reports" on public.comment_reports;
drop policy if exists "admins moderate reports" on public.comment_reports;
create policy "users create comment reports" on public.comment_reports for insert to authenticated with check (auth.uid() = reporter_id);
create policy "users read own comment reports" on public.comment_reports for select to authenticated using (auth.uid() = reporter_id or is_admin());
create policy "admins moderate reports" on public.comment_reports for all to authenticated using (is_admin()) with check (is_admin());

create or replace function public.validate_comment_reference()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.item_type = 'book' and not exists (select 1 from public.books where id = new.item_id) then
    raise exception 'item_id does not reference an existing book';
  elsif new.item_type = 'audio' and not exists (select 1 from public.audio_lectures where id = new.item_id) then
    raise exception 'item_id does not reference an existing audio lecture';
  end if;
  if new.parent_id is not null and not exists (
    select 1 from public.comments parent
    where parent.id = new.parent_id and parent.item_type = new.item_type and parent.item_id = new.item_id
  ) then
    raise exception 'parent comment belongs to a different item';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_comment_reference_trigger on public.comments;
create trigger validate_comment_reference_trigger before insert or update on public.comments for each row execute function public.validate_comment_reference();

create or replace function public.touch_comment_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists touch_comment_updated_at_trigger on public.comments;
create trigger touch_comment_updated_at_trigger before update on public.comments for each row execute function public.touch_comment_updated_at();
