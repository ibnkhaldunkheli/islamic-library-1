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


## Maktaba V2 modernization notes

The V2 frontend uses a blue/navy design system, responsive bottom navigation on small screens, capped server-side pagination for Books and Audio, ISR-style 60-second revalidation for public collection pages, and a richer PDF reader toolbar with persistent zoom, presets, fullscreen, fit/reset controls, and keyboard navigation.

### Required migration

For an existing Supabase deployment, run `supabase/migrations/014_comments.sql` once in the SQL Editor. It creates the `comments` and `comment_reports` tables with RLS. No existing table or content is deleted.

### Deployment

No new environment variables or external providers are required for this V2 slice. Keep the existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_OWNER_EMAIL` values in Vercel. Install with `npm ci`, validate with `npx tsc --noEmit`, and deploy with `npm run build` / the existing GitHub → Vercel workflow.

The optional R2/B2 provider metadata columns remain supported by the existing storage abstraction, but no private provider credentials are added to the browser or required by the default Supabase provider.

### V2.1 database installation order

- **Fresh installation:** run the complete `supabase/schema.sql` once. It includes the original Maktaba schema, all storage policies, visitor favorites/progress, reports, announcements, and comments.
- **Existing installation:** do not rerun the full schema. Apply only migrations that have not already been applied, including `014_comments.sql` if comments have not yet been installed. Migration 014 is idempotent and preserves existing content.

## PDF Reader Remastered

The reader now keeps one stable PDF.js document per URL session, uses a dedicated nested reading viewport, IntersectionObserver-driven nearby-page rendering, per-page render cancellation/generation guards, cached PDF pages/text, distant canvas cleanup, stable rotation and fit calculations, lightweight thumbnails, search highlighting, mobile pinch/pan support, reduced-motion-compatible loading polish, and a one-step download confirmation modal. The reader remains client-side and does not change the Supabase architecture.

## Maktaba complete UI/UX remaster

The application shell now follows the BookBase-inspired Maktaba language: a responsive desktop sidebar, search-first top bar, mobile bottom navigation, navy/royal-blue surfaces, premium cover-first cards, scholarly directory cards, modern category directory, consistent account/admin surfaces, reusable skeleton states, and restrained reduced-motion-compatible transitions. Existing routes, Supabase queries, authentication, storage, reader, audio, comments, reports, saved items, offline downloads, and admin CRUD remain in place.

## Final consistency pass

The final pass aligns saved items, offline downloads, scholar profiles, book/audio detail pages, account surfaces, admin CRUD screens, and route loading states with the shared Maktaba design system. Authenticated PDF readers restore their saved page from `user_progress` after the stable PDF document is ready, while anonymous readers continue using local progress; progress continues saving both locally and to Supabase for authenticated users.

## PDF Reader V3

The PDF reader was replaced behind the existing `<PdfReader url title bookId />` interface with a modular performance-first PDF.js implementation.

### Architecture

- `components/pdf-reader/PdfDocument.ts` owns one PDF.js document/worker lifecycle and supports Supabase URLs plus IndexedDB offline blobs.
- `PdfViewport.tsx` owns one internal natural-scroll container and uses `IntersectionObserver` to identify the approximate current page.
- `PdfPage.tsx` keeps stable page-height placeholders and mounts active canvases only for the current page and nearby pages.
- `PdfRenderQueue.ts` bounds PDF.js rendering to one task at a time and supports queued-job cancellation.
- `PdfCache.ts` keeps a small LRU page cache rather than retaining every page forever.
- `PdfProgress.ts` restores cloud progress for authenticated users and local progress for visitors, with debounced saves and visibility-change persistence.
- `PdfSearch.ts` extracts text only when search is opened and requested; no text layer is created during normal reading.
- `PdfToolbar.tsx` provides compact page, zoom, fit, search, fullscreen, and download controls.

### Intentional V3 simplifications

Removed from the reader to prioritize stability and memory usage: thumbnails, rotation, print, swipe-to-page navigation, default text layers, animated page transitions, and complex toolbar modes. Normal vertical scrolling remains the primary interaction. Pinch zoom uses a CSS transform during the gesture and commits the final zoom after release.

### Verification

- PDF.js parsed and opened generated 30-page, 150-page, and 500-page test PDFs; each reported the expected page count and 595×842 first-page dimensions.
- TypeScript check passed.
- ESLint passed with pre-existing non-reader advisory warnings in image usage and `AudioProvider` hook dependencies.
- Production build passed and generated all 24 routes.
- Static reader audit confirmed no rotation, thumbnail, swipe, print, text-layer, wheel-page-navigation, or `window.location.reload()` path remains in the V3 reader.
- A local production HTTP smoke test reached Next.js but returned 500 because the sandbox has no Supabase URL/key environment variables. This prevented authenticated/live book-page browser testing in this environment; the server log identified the missing runtime credentials, not a reader exception.
