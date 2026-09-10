import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import type { Book } from '@/lib/types';
import { LANGUAGE_LABELS } from '@/lib/types';
import SaveButton from '@/components/SaveButton';
import PdfReader from '@/components/PdfReader';
import BookCard from '@/components/BookCard';

export const revalidate = 0;

// Uses the admin's SEO title/description when set, falling back to the
// book's normal title/description so pages without SEO fields filled in
// still get sensible metadata.
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from('books')
    .select('title, description, seo_title, seo_description, cover_url')
    .eq('id', params.id)
    .maybeSingle();

  const book = data as Pick<Book, 'title' | 'description' | 'seo_title' | 'seo_description' | 'cover_url'> | null;
  if (!book) return {};

  const title = book.seo_title?.trim() || book.title;
  const description = book.seo_description?.trim() || book.description?.trim() || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: book.cover_url ? [book.cover_url] : undefined,
    },
  };
}

export default async function BookDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data } = await supabase
    .from('books')
    .select('*, categories(*), scholars(*)')
    .eq('id', params.id)
    .maybeSingle();

  const book = data as Book | null;
  if (!book) notFound();

  // Increment the book's view count.
  await supabase.rpc('increment_book_view', { p_book_id: book.id });

  // Find related books from the same category first.
  // If there are none, fall back to books by the same scholar.
  let related: Book[] = [];

  if (book.category_id) {
    const { data: relatedData } = await supabase
      .from('books')
      .select('*, categories(*)')
      .eq('category_id', book.category_id)
      .neq('id', book.id)
      .order('created_at', { ascending: false })
      .limit(5);

    related = (relatedData ?? []) as Book[];
  }

  if (related.length === 0 && book.scholar_id) {
    const { data: relatedData } = await supabase
      .from('books')
      .select('*, categories(*)')
      .eq('scholar_id', book.scholar_id)
      .neq('id', book.id)
      .order('created_at', { ascending: false })
      .limit(5);

    related = (relatedData ?? []) as Book[];
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/books"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-ink/60 transition-colors hover:text-emerald-700"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to Books
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              {LANGUAGE_LABELS[book.language]}
            </span>

            {book.categories?.name && (
              <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-ink/60 ring-1 ring-line">
                {book.categories.name}
              </span>
            )}
          </div>

          <h1 className="mt-2 text-2xl font-bold text-ink" dir="auto">
            {book.title}
          </h1>

          {book.scholars ? (
            <Link
              href={`/ulama/${book.scholars.id}`}
              className="mt-1 inline-block text-sm text-emerald-700 hover:underline"
              dir="auto"
            >
              {book.author || book.scholars.name}
            </Link>
          ) : (
            book.author && (
              <p className="mt-1 text-sm text-ink/60" dir="auto">
                {book.author}
              </p>
            )
          )}
        </div>

        <SaveButton itemType="book" itemId={book.id} />
      </div>

      {book.description && (
        <p className="max-w-2xl text-sm text-ink/70" dir="auto">
          {book.description}
        </p>
      )}

      <PdfReader
        url={book.pdf_url}
        title={book.title}
        bookId={book.id}
      />

      <a
        href={book.pdf_url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-fit text-xs text-ink/40 transition-colors hover:text-emerald-700 hover:underline"
      >
        Trouble viewing? Open the PDF in a new tab
      </a>

      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">
            More like this
          </h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {related.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
