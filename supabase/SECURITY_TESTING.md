# Security testing — run these yourself against your live project

I audited every RLS policy, trigger, and admin code path in this repo (see
the summary below), but I have no network access in this sandbox and no
credentials for your actual Supabase project — so I can't execute these
against your live database myself. Everything below is copy-pasteable and
designed to prove (or disprove) each claim by actually attempting the
operation as a non-admin, exactly like an attacker who ignores your UI
entirely and talks to the Supabase REST API directly.

Run migrations 005–011 first, then work through this file.

## A. Direct REST API tests (no admin session, just the public anon key)

These use `curl` and only your project URL + anon key (both are meant to
be public — that's the whole point of RLS). Replace the two variables:

```bash
export SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
export ANON_KEY="YOUR_ANON_KEY"
```

**1. Anonymous write to `books` should be REJECTED (expect an empty
array `[]` or a permission error, not a created row):**
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/books" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"title":"hacked","pdf_url":"x","language":"english"}'
```
Expected: HTTP 401/403, or a row-level-security error. If you see the
book actually created, RLS is not enforcing — stop and investigate.

**2. Anonymous UPDATE of an existing book's `view_count` should be
REJECTED:**
```bash
# Replace BOOK_ID with any real book id
curl -s -X PATCH "$SUPABASE_URL/rest/v1/books?id=eq.BOOK_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"view_count": 999999}'
```
Expected: no rows updated (empty response), because only the narrow
`increment_book_view()` RPC — which only ever adds 1 — is allowed to
touch that column for non-admins.

**3. Anonymous DELETE of a book should be REJECTED:**
```bash
curl -s -X DELETE "$SUPABASE_URL/rest/v1/books?id=eq.BOOK_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
```
Expected: no row deleted.

**4. Anonymous read of a public book (IDOR sanity check) — this SHOULD
succeed, because all books in this app are intentionally public once
created (there's no draft/private tier). Confirms reads work at all:**
```bash
curl -s "$SUPABASE_URL/rest/v1/books?select=id,title&limit=1" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
```

**5. Anonymous attempt to insert into `app_admins` (privilege escalation)
should be REJECTED:**
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/app_admins" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"00000000-0000-0000-0000-000000000000"}'
```
Expected: rejected — there is no INSERT policy on `app_admins` at all,
so this fails closed regardless of who's calling.

## B. Authenticated-but-not-admin tests

Sign up a throwaway account through `/account/signup` (NOT the admin
`/login`), then get its access token:

```bash
curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"test-nonadmin@example.com","password":"testpassword123"}'
# copy the "access_token" from the response
export USER_TOKEN="paste-it-here"
export USER_ID="paste-the-user-id-here"
```

**6. A signed-in non-admin still cannot write to `books`:**
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/books" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"hacked","pdf_url":"x","language":"english"}'
```
Expected: rejected. Being logged in is not the same as being an admin —
only rows in `app_admins` pass `is_admin()`.

**7. A signed-in non-admin CAN favorite something under their own
user_id:**
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/user_favorites" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"user_id\":\"$USER_ID\",\"item_type\":\"book\",\"item_id\":\"BOOK_ID\"}"
```
Expected: succeeds, row created.

**8. The SAME user cannot spoof someone else's `user_id` on a
favorite — try a random uuid instead of your own:**
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/user_favorites" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"user_id":"11111111-1111-1111-1111-111111111111","item_type":"book","item_id":"BOOK_ID"}'
```
Expected: the row is created, but check its `user_id` in the response —
it should come back as YOUR real user id, not the spoofed one. That's
migration 011's `force_own_user_id` trigger silently correcting it
rather than merely rejecting the request.

**9. A non-admin cannot read another user's favorites:**
```bash
curl -s "$SUPABASE_URL/rest/v1/user_favorites?select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $USER_TOKEN"
```
Expected: only rows where `user_id` = your own id come back, even
though the table has other users' rows in it.

**10. Filing a report and trying to pre-mark it resolved:**
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/reports" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"item_type":"book","item_id":"BOOK_ID","reason":"other","status":"resolved"}'
```
Expected: the row is created, but its `status` comes back as `open`
regardless — migration 011's `force_report_open_on_insert` trigger.

**11. A non-admin cannot read the reports list at all:**
```bash
curl -s "$SUPABASE_URL/rest/v1/reports?select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $USER_TOKEN"
```
Expected: empty array — only `is_admin()` can SELECT from `reports`.

**12. Garbage item references are rejected:**
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/user_favorites" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"'"$USER_ID"'","item_type":"book","item_id":"00000000-0000-0000-0000-000000000000"}'
```
Expected: rejected with "item_id does not reference an existing book" —
migration 011's `validate_item_reference` trigger.

## C. Storage tests

**13. Anonymous upload to a storage bucket should be REJECTED:**
```bash
curl -s -X POST "$SUPABASE_URL/storage/v1/object/book-pdfs/test.pdf" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/pdf" --data-binary "@/dev/null"
```
Expected: rejected — only `is_admin()` can insert into any bucket.

**14. Public read of a real file IS expected to succeed** (the buckets
are intentionally public-read, since these are library files meant to
be shared):
```bash
curl -s -I "SOME_REAL_PDF_URL_FROM_YOUR_LIBRARY"
```
Expected: HTTP 200.

## D. Admin route tests

**15. Visiting `/admin` while signed out redirects to `/login`** — try
it in an incognito browser window.

**16. Visiting `/admin` while signed in as the non-admin test account**
redirects to `/` (home), not an error page or the dashboard — confirms
`middleware.ts` checks `app_admins`, not just "is someone logged in."

## What I could not test from here

I don't have your Supabase URL, anon key, or a live database, so I
couldn't execute any of the above myself — everything above is written
so you (or a teammate) can run it directly and see the real HTTP
responses. If any test doesn't behave as described, that's a real bug —
open the corresponding policy/trigger in `supabase/schema.sql` and check
it against the matching migration file.
