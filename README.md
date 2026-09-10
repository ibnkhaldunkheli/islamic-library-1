# Maktaba — Islamic Audio & PDF Library

A Pashto / Urdu / English library of Islamic books (PDF) and audio lectures.
The app ships **completely empty** — no sample books, audio, scholars, or
quotes. You are the only administrator. Everyone else can only browse, read,
and listen.

---

## 1. How this is built, and why

| Piece | Choice | Why |
|---|---|---|
| Frontend + hosting | **Next.js** on **Vercel** | Free tier, deploys straight from GitHub, works great on mobile. |
| Database | **Supabase (Postgres)** | Free tier, and its Row Level Security (RLS) lets the *database itself* enforce "only the admin can write" — not just the app's UI. |
| File storage | **Supabase Storage** | Same project as the database, free tier, simple signed/public URLs for PDFs and audio. |
| Authentication | **Supabase Auth** (email + password) | One account = you. No sign-up page is exposed to visitors. |
| Admin permission check | A tiny `app_admins` table + RLS policies | Even if someone guesses the `/admin` URL or calls the API directly, Postgres refuses any insert/update/delete unless their logged-in user ID is in `app_admins`. |
| Normal users | No login at all | They only ever run `SELECT` (read) queries, which RLS always allows. "Saved" items are stored in the visitor's own browser, not a shared account. |

**How permissions are actually protected:** every table (`books`,
`audio_lectures`, `scholars`, `categories`) and every storage bucket has Row
Level Security turned on. The rules are, in plain words:

- *Anyone* can **read**.
- *Only* a user whose ID is listed in `app_admins` can **write** (insert,
  edit, delete, or upload a file).

This is enforced inside Postgres/Supabase, so it holds even if someone
bypasses the website entirely and calls the API directly. The app's public
`anon` key (the only key ever shipped to the browser) has no special power —
it's the `app_admins` row that grants access, and only you will have one.

---

## 2. Run it on your own computer

**Requirements:** [Node.js](https://nodejs.org) 18 or newer installed.

```bash
# 1. Unzip the project, then open a terminal in that folder
cd islamic-library

# 2. Install dependencies
npm install

# 3. Copy the environment template and fill it in (see Section 3 first)
cp .env.local.example .env.local

# 4. Start the app
npm run dev
```

Open http://localhost:3000 in your browser.

---

## 3. Create your free Supabase project (the database + storage)

1. Go to [supabase.com](https://supabase.com) and sign up (free).
2. Click **New project**. Pick any name and a strong database password
   (save that password somewhere safe — you may need it later).
3. Once the project is ready, go to **Settings → API**. You'll see:
   - **Project URL** → copy into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → copy into `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Go to **SQL Editor → New query**, open the file `supabase/schema.sql`
   from this project, paste its entire contents in, and click **Run**.
   This creates every table, turns on Row Level Security, and creates the
   four storage buckets — all empty.

---

## 4. Create the owner/admin account (this is *you*)

1. In Supabase, go to **Authentication → Users → Add user → Create new user**.
2. Enter your email and a password. Leave "Auto Confirm User" checked.
3. Click **Create user**, then click on the user you just created and copy
   their **User UID** (a long string of letters and numbers).
4. Go to **SQL Editor → New query** and run this, replacing the UID:

   ```sql
   insert into app_admins (user_id) values ('PASTE-YOUR-USER-UID-HERE');
   ```

5. In `.env.local`, set `NEXT_PUBLIC_OWNER_EMAIL` to the email you used
   (this is just used for display; the real permission comes from step 4).

That's it — this is the *only* account that will ever be able to add,
edit, or delete content. Do not repeat this step for anyone else.

---

## 5. Deploy it for real (Vercel, free)

1. Push this project to a GitHub repository (create one on
   [github.com](https://github.com), then follow GitHub's "push an existing
   repository" instructions, or use GitHub Desktop if you prefer a
   point-and-click tool).
2. Go to [vercel.com](https://vercel.com), sign up with your GitHub account.
3. Click **Add New → Project**, choose your repository.
4. Under **Environment Variables**, add the same three values from your
   `.env.local` file (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_OWNER_EMAIL`).
5. Click **Deploy**. In a couple of minutes you'll get a live URL like
   `https://your-library.vercel.app`.

---

## 6. Access the admin dashboard

Go to `https://your-library.vercel.app/login` and sign in with the email
and password you created in Section 4. You'll be taken to `/admin`.
No one else sees a login link that does anything useful — normal visitors
who click "Owner login" just reach the same sign-in form, and it will
reject any account that isn't yours.

---

## 7. Upload your first PDF book

1. In the admin dashboard, click **Books → Add book**.
2. Fill in title, author, description, language, and category (categories
   are optional — add some first under **Categories** if you want them).
3. Choose the PDF file and, optionally, a cover image.
4. Click **Add book**. It now appears instantly on the public **Books** page.

## 8. Upload your first audio lecture

1. Click **Audio → Add lecture**.
2. Fill in the title, description, language, category, and pick the
   Shaykh/Ulama from the dropdown (add scholars first if the list is empty).
3. Choose the audio file (MP3, M4A, etc.) and click **Add lecture**.

## 9. Add a scholar

Click **Ulama → Add scholar**, enter their name and an optional short bio
and photo.

## 10. Update or delete content

Every admin list (Books, Audio, Ulama, Categories) has **Edit** and
**Delete** buttons next to each item. Editing a book or lecture without
choosing a new file keeps the existing file — you only need to attach a
new PDF/audio/image if you're replacing it.

## 11. Back up your content

Your data lives entirely in Supabase, so backups are handled there:

- **Database:** Supabase Dashboard → **Database → Backups** (daily backups
  are included even on the free tier, with a short retention window).
- **Files:** Supabase Dashboard → **Storage**, download any bucket's
  contents, or use the [Supabase CLI](https://supabase.com/docs/guides/cli)
  to script a full export whenever you want extra peace of mind.

## 12. Change the app name or logo later

- The name "Maktaba" appears in `components/NavBar.tsx` and in
  `app/layout.tsx` (the `<title>` and description). Edit the text there.
- The circular logo mark is plain text (`م`) styled with CSS in
  `NavBar.tsx` — replace it with an `<img>` tag pointing at your own logo
  file if you'd like a custom image instead.
- After editing, commit and push to GitHub; Vercel redeploys automatically.

---

## Project structure

```
app/
  page.tsx                Home
  books/                  Public book listing + PDF viewer
  audio/                  Public lecture listing + audio player
  ulama/                  Public scholar listing
  search/                 Cross-content search
  saved/                  Locally bookmarked items
  login/                  Owner sign-in
  admin/                  Owner-only dashboard (guarded 3 ways — see below)
components/                Shared UI pieces
lib/supabase/              Supabase client helpers
supabase/schema.sql         Database tables + RLS security policies
```

**Why admin access is safe, in three layers:**
1. `middleware.ts` redirects signed-out visitors away from `/admin`.
2. `app/admin/layout.tsx` re-checks on the server before rendering anything.
3. `supabase/schema.sql` — the real backstop — refuses any database write
   or file upload that doesn't come from the one user ID in `app_admins`,
   no matter how the request was made.

## Notes on the current version

- "Saved" items are stored in the visitor's browser (no account needed for
  normal users), matching the brief's "save locally" option.
- "Continue reading" and "Continue listening" are implemented the same
  way — the last page/playback position is remembered on-device (no
  account or extra database table needed) and surfaced as a "Continue…"
  section on the home page when there's something in progress.
- If you're updating an existing deployment (not a fresh install), run
  `supabase/migrations/004_arabic_language_and_view_counts.sql` once in
  the SQL Editor to add the Arabic language option and view-count
  tracking used by "Most read" sorting.
