import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BookCard from '@/components/BookCard';
import EmptyState from '@/components/EmptyState';
import type { Book, Category, Language } from '@/lib/types';
import { LANGUAGES, LANGUAGE_LABELS } from '@/lib/types';

export const revalidate = 0;

type Sort = 'recent' | 'title' | 'popular';

export default async function BooksPage({
  searchParams,
}: {
  searchParams: { language?: string; category?: string; sort?: string };
}) {
  const supabase = createClient();
  const language = searchParams.language as Language | undefined;
  const category = searchParams.category;

  const sort: Sort =
    searchParams.sort === 'title'
      ? 'title'
      : searchParams.sort === 'popular'
        ? 'popular'
        : 'recent';

  const { data: categoryData } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  const categories = (categoryData ?? []) as Category[];

  let query = supabase.from('books').select('*, categories(*)');

  if (language) query = query.eq('language', language);
  if (category) query = query.eq('category_id', category);

  query =
    sort === 'title'
      ? query.order('title', { ascending: true })
      : sort === 'popular'
        ? query.order('view_count', { ascending: false })
        : query.order('created_at', { ascending: false });

  const { data } = await query;
  const books = (data ?? []) as Book[];

  const buildHref = (overrides: {
    language?: string | null;
    category?: string | null;
    sort?: string | null;
  }) => {
    const params = new URLSearchParams();

    const nextLanguage =
      overrides.language !== undefined ? overrides.language : language;
    const nextCategory =
      overrides.category !== undefined ? overrides.category : category;
    const nextSort =
      overrides.sort !== undefined ? overrides.sort : sort;

    if (nextLanguage) params.set('language', nextLanguage);
    if (nextCategory) params.set('category', nextCategory);
    if (nextSort && nextSort !== 'recent') {
      params.set('sort', nextSort);
    }

    const qs = params.toString();
    return qs ? `/books?${qs}` : '/books';
  };

  const pill = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium ${
      active
        ? 'border-emerald-600 bg-emerald-600 text-white'
        : 'border-line bg-white text-ink/80 hover:border-emerald-600'
    }`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink">Books</h1>

        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <Link
              key={lang}
              href={buildHref({
                language: language === lang ? null : lang,
              })}
              className={pill(language === lang)}
            >
              {LANGUAGE_LABELS[lang]}
            </Link>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Link
            href={buildHref({ category: null })}
            className={pill(!category)}
          >
            All categories
          </Link>

          {categories.map((c) => (
            <Link
              key={c.id}
              href={buildHref({
                category: category === c.id ? null : c.id,
              })}
              className={pill(category === c.id)}
              dir="auto"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <span className="text-ink/50">Sort:</span>

        <Link
          href={buildHref({ sort: 'recent' })}
          className={
            sort === 'recent'
              ? 'font-semibold text-emerald-700'
              : 'text-ink/60 hover:text-emerald-700'
          }
        >
          Recently added
        </Link>

        <span className="text-ink/30">·</span>

        <Link
          href={buildHref({ sort: 'title' })}
          className={
            sort === 'title'
              ? 'font-semibold text-emerald-700'
              : 'text-ink/60 hover:text-emerald-700'
          }
        >
          Title A–Z
        </Link>

        <span className="text-ink/30">·</span>

        <Link
          href={buildHref({ sort: 'popular' })}
          className={
            sort === 'popular'
              ? 'font-semibold text-emerald-700'
              : 'text-ink/60 hover:text-emerald-700'
          }
        >
          Most read
        </Link>
      </div>

      {books.length === 0 ? (
        <EmptyState
          title="No books available yet."
          hint="Books added by the administrator will appear here."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {books.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </div>
  );
}
