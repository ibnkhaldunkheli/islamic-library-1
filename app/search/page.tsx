import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BookCard from '@/components/BookCard';
import AudioCard from '@/components/AudioCard';
import EmptyState from '@/components/EmptyState';
import type { Book, AudioLecture, Scholar } from '@/lib/types';

export const revalidate = 0;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const supabase = createClient();
  const q = (searchParams.q ?? '').trim();
  const category = searchParams.category;

  let bookQuery = supabase.from('books').select('*, categories(*)');
  let audioQuery = supabase.from('audio_lectures').select('*, scholars(*), categories(*)');
  let scholarQuery = supabase.from('scholars').select('*');

  if (q) {
    // Escape PostgREST's or() filter separators so a search containing a
    // comma or parenthesis (common when pasting a list of keywords) can't
    // break the filter string.
    const escaped = q.replace(/[,()]/g, ' ').trim();

    // Category names live on a joined table, which PostgREST's or() can't
    // filter directly — so find matching category ids first, then fold
    // them into the same book/audio query as an extra "category_id in (...)"
    // clause. This lets "namaz" find books filed under a matching category
    // even when the word isn't in the book's own title/keywords.
    const [{ data: matchingCategories }, { data: matchingScholars }] = await Promise.all([
      supabase.from('categories').select('id').ilike('name', `%${escaped}%`),
      supabase.from('scholars').select('id').ilike('name', `%${escaped}%`),
    ]);
    const categoryIds = (matchingCategories ?? []).map((c) => c.id);
    const categoryClause = categoryIds.length ? `,category_id.in.(${categoryIds.join(',')})` : '';
    const scholarIds = (matchingScholars ?? []).map((s) => s.id);
    const scholarClause = scholarIds.length ? `,scholar_id.in.(${scholarIds.join(',')})` : '';

    // Books: title, free-text author, description, the linked Shaykh's
    // name (via scholar_id), matching categories, and the admin-only
    // SEO/search fields (seo_title, seo_description, search_keywords) all
    // count as a match — so a Shaykh's name or an alternative spelling
    // entered by the admin surfaces a book even when those exact words
    // aren't in the visible title.
    bookQuery = bookQuery.or(
      `title.ilike.%${escaped}%,author.ilike.%${escaped}%,description.ilike.%${escaped}%,` +
        `seo_title.ilike.%${escaped}%,seo_description.ilike.%${escaped}%,search_keywords.ilike.%${escaped}%` +
        categoryClause +
        scholarClause
    );
    audioQuery = audioQuery.or(
      `title.ilike.%${escaped}%,description.ilike.%${escaped}%${categoryClause}${scholarClause}`
    );
    scholarQuery = scholarQuery.ilike('name', `%${escaped}%`);
  }
  if (category) {
    bookQuery = bookQuery.eq('category_id', category);
    audioQuery = audioQuery.eq('category_id', category);
  }

  const hasQuery = Boolean(q || category);

  const [{ data: books }, { data: audio }, { data: scholars }] = hasQuery
    ? await Promise.all([bookQuery, audioQuery, scholarQuery])
    : [{ data: [] as Book[] }, { data: [] as AudioLecture[] }, { data: [] as Scholar[] }];

  const bookResults = (books ?? []) as Book[];
  const audioResults = (audio ?? []) as AudioLecture[];
  const scholarResults = (scholars ?? []) as Scholar[];
  const noResults = hasQuery && bookResults.length + audioResults.length + scholarResults.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <form className="flex max-w-lg items-center gap-2">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search books, lectures, scholars…"
          className="input"
        />
        <button type="submit" className="btn-primary shrink-0">
          Search
        </button>
      </form>

      {!hasQuery && (
        <p className="text-sm text-ink/60">Type something above to search the library.</p>
      )}

      {noResults && (
        <EmptyState title="No results found." hint="Try a different word or check your spelling." />
      )}

      {bookResults.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Books</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {bookResults.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}

      {audioResults.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Audio lectures</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {audioResults.map((a) => (
              <AudioCard key={a.id} lecture={a} />
            ))}
          </div>
        </section>
      )}

      {scholarResults.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Ulama</h2>
          <div className="flex flex-wrap gap-3">
            {scholarResults.map((s) => (
              <Link
                key={s.id}
                href={`/ulama/${s.id}`}
                className="card px-4 py-2 text-sm font-medium text-ink hover:border-emerald-600 hover:text-emerald-700"
                dir="auto"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
