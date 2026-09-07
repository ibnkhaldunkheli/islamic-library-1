import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BookCard from '@/components/BookCard';
import AudioCard from '@/components/AudioCard';
import EmptyState from '@/components/EmptyState';
import type { Book, AudioLecture, Category } from '@/lib/types';

export const revalidate = 0;

export default async function HomePage() {
  const supabase = createClient();

  const [{ data: books }, { data: audio }, { data: categories }] = await Promise.all([
    supabase
      .from('books')
      .select('*, categories(*)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('audio_lectures')
      .select('*, scholars(*), categories(*)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('categories').select('*').order('name'),
  ]);

  const recentBooks = (books ?? []) as Book[];
  const recentAudio = (audio ?? []) as AudioLecture[];
  const allCategories = (categories ?? []) as Category[];

  return (
    <div className="flex flex-col gap-14">
      <section className="geo-panel rounded-card px-6 py-14 text-center sm:px-12">
        <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-tight text-emerald-900 sm:text-4xl">
          د قرآن او سنت علم کول
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-ink/70">
          A quiet place to read and listen — Quran and Sunnah lectures and books in Pashto, Urdu and English.
        </p>
        <form action="/search" className="mx-auto mt-7 flex max-w-lg items-center gap-2">
          <input
            name="q"
            type="search"
            placeholder="Search books, lectures, scholars…"
            className="input bg-white"
          />
          <button type="submit" className="btn-primary shrink-0">
            Search
          </button>
        </form>
        <div className="mx-auto mt-4 flex max-w-lg flex-wrap items-center justify-center gap-3">
          <Link href="/books" className="btn-primary">
            Browse Books
          </Link>
          <Link href="/ulama" className="btn-secondary">
            Explore Ulama
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {(['pashto', 'urdu', 'english'] as const).map((lang) => (
            <Link
              key={lang}
              href={`/books?language=${lang}`}
              className="rounded-full border border-emerald-600/30 bg-white px-4 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              {lang === 'pashto' ? 'پښتو' : lang === 'urdu' ? 'اردو' : 'English'}
            </Link>
          ))}
        </div>
      </section>

      {allCategories.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-ink">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((c) => (
              <Link
                key={c.id}
                href={`/search?category=${c.id}`}
                className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-ink/80 hover:border-emerald-600 hover:text-emerald-700"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Recent books</h2>
          <Link href="/books" className="text-sm font-medium text-emerald-700 hover:underline">
            View all
          </Link>
        </div>
        {recentBooks.length === 0 ? (
          <EmptyState
            title="No books available yet."
            hint="Books added by the administrator will appear here."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {recentBooks.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Recent lectures</h2>
          <Link href="/audio" className="text-sm font-medium text-emerald-700 hover:underline">
            View all
          </Link>
        </div>
        {recentAudio.length === 0 ? (
          <EmptyState
            title="No audio lectures available yet."
            hint="Lectures added by the administrator will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {recentAudio.map((a) => (
              <AudioCard key={a.id} lecture={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
