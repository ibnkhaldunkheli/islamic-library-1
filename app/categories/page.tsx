import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import EmptyState from '@/components/EmptyState';
import type { Category } from '@/lib/types';
import { LANGUAGE_LABELS } from '@/lib/types';

export const revalidate = 0;

export default async function CategoriesPage() {
  const supabase = createClient();

  const [{ data: categoryData }, { data: bookLinks }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('books').select('category_id').not('category_id', 'is', null),
  ]);

  const categories = (categoryData ?? []) as Category[];
  const bookCounts = new Map<string, number>();
  for (const row of bookLinks ?? []) {
    if (!row.category_id) continue;
    bookCounts.set(row.category_id, (bookCounts.get(row.category_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-ink">Categories</h1>

      {categories.length === 0 ? (
        <EmptyState
          title="No categories available yet."
          hint="Categories added by the administrator will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/search?category=${c.id}`}
              className="card flex items-center justify-between gap-3 p-4 hover:border-emerald-600"
            >
              <div>
                <p className="font-medium text-ink" dir="auto">
                  {c.name}
                </p>
                <p className="text-xs text-ink/50">{LANGUAGE_LABELS[c.language]}</p>
              </div>
              <span className="shrink-0 text-xs text-ink/40">
                {bookCounts.get(c.id) ?? 0} {bookCounts.get(c.id) === 1 ? 'book' : 'books'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
