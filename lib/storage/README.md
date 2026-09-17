# Storage provider abstraction

Every admin upload (book PDFs, book covers, audio files, scholar photos)
goes through `getStorageProvider()` in `index.ts`, not through
`supabase.storage` directly. Today it always returns the Supabase
implementation (`supabaseProvider.ts`) — nothing else is wired up, on
purpose (see the note in the phase-8 handoff: don't add a provider you
don't need yet).

## Why this exists

So that if you ever need a second storage backend — most likely because
you're approaching Supabase Storage's free-tier limit, not because you
need it today — you can add it **without touching**:
- any admin page's UI (`app/admin/books`, `app/admin/audio`, `app/admin/ulama`),
- the `books`/`audio_lectures`/`scholars` table schemas, or
- the public book/audio/scholar pages, which only ever read the stored
  `pdf_url`/`audio_url`/`cover_url`/`photo_url` — they don't know or care
  which provider produced that URL.

## What's already in place

- `types.ts` — the `StorageProvider` interface (`upload`, `remove`) every
  backend implements, and the `UploadResult`/`StoredFileRef` shapes.
- `supabaseProvider.ts` — the only implementation right now.
- `supabase/migrations/013_storage_metadata.sql` — added
  `storage_provider`, `storage_bucket`, `storage_path`, `file_size`,
  `mime_type` columns to `books` and `audio_lectures`, alongside the
  existing `pdf_url`/`audio_url`. This is what lets a future migration or
  mirroring job find "which provider, which bucket, which object key" for
  every existing row without guessing from the URL.

## Adding a new provider

1. Implement `StorageProvider` in a new file, e.g. `r2Provider.ts`.
2. **If the provider needs a secret API key/credential** (this is the
   normal case — S3-compatible services, Backblaze B2, Cloudflare R2,
   etc. all require one): that upload/remove call **must not run in the
   browser**. Add a Next.js Route Handler (e.g.
   `app/api/storage/upload/route.ts`) that reads the credential from a
   server-only environment variable (never `NEXT_PUBLIC_*`), performs the
   upload there, and returns the `UploadResult` JSON to the client. Your
   `r2Provider.ts`'s `upload()` method then just does
   `fetch('/api/storage/upload', { method: 'POST', body: formData })`
   instead of calling the provider's SDK directly — the secret never
   reaches client-side code. This mirrors exactly how the app already
   treats Supabase's service_role key: never in the browser, ever.
3. Switch `getStorageProvider()` in `index.ts` to return the new
   provider (e.g. based on an env var like `STORAGE_PROVIDER`).
4. Existing rows keep working — their `storage_provider` column already
   says `'supabase'`, so a mixed-provider library (some files on
   Supabase, new ones on the new provider) works fine; nothing requires
   migrating old files on switchover.

## What this deliberately does NOT do

- It does not add a second provider now. Supabase Storage's free tier is
  generous for a project this size; add one only when you're actually
  approaching a real limit.
- It does not attempt automatic mirroring/replication across providers.
  The metadata columns make that possible to build later (a background
  job could read `storage_provider`/`storage_bucket`/`storage_path` and
  copy files to a second provider, writing a `mirror_provider` column if
  you add one) but no such job exists yet.
- It does not change how uploads reach Supabase today — they still go
  straight from the admin's browser to Supabase Storage, protected by the
  existing bucket RLS policies (admin-only write, public read). That's
  simpler and more efficient than proxying every large PDF/audio upload
  through the Next.js server, and it's exactly as secure as before: no
  secret is or was ever needed for this path.
