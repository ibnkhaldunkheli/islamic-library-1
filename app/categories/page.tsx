import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import EmptyState from '@/components/EmptyState';
import Icon from '@/components/Icon';
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
  for (const row of bookLinks ?? []) if (row.category_id) bookCounts.set(row.category_id, (bookCounts.get(row.category_id) ?? 0) + 1);

  return <div className="page-enter space-y-8"><header><p className="eyebrow">Browse the collection</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy">Categories</h1><p className="mt-2 max-w-xl text-sm leading-6 text-ink/55">Explore books and lectures by subject, language, and area of study.</p></header>{categories.length === 0 ? <EmptyState title="No categories available yet." hint="Categories added by the administrator will appear here." /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.map((c) => <Link key={c.id} href={`/search?category=${c.id}`} className="surface interactive group flex items-center justify-between gap-4 p-5 hover:border-blue-300"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon name="categories" size={21} /></span><div className="min-w-0 flex-1"><p className="truncate text-base font-extrabold text-ink transition-colors group-hover:text-blue-700" dir="auto">{c.name}</p><p className="mt-1 text-xs font-semibold text-ink/45">{LANGUAGE_LABELS[c.language]} · {bookCounts.get(c.id) ?? 0} {(bookCounts.get(c.id) ?? 0) === 1 ? 'book' : 'books'}</p></div><Icon name="arrowRight" size={16} className="text-ink/25 transition group-hover:text-blue-600" /></Link>)}</div>}</div>;
}
