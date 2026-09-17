import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { AudioLecture, Book } from '@/lib/types';

export const revalidate = 0;

export default async function AdminDashboard() {
  const supabase = createClient();

  const [
    { count: bookCount },
    { count: audioCount },
    { count: scholarCount },
    { count: categoryCount },
    { count: openReportCount },
    { data: topBooksData },
    { data: topAudioData },
  ] = await Promise.all([
    supabase.from('books').select('*', { count: 'exact', head: true }),
    supabase.from('audio_lectures').select('*', { count: 'exact', head: true }),
    supabase.from('scholars').select('*', { count: 'exact', head: true }),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('books').select('id, title, view_count').gt('view_count', 0).order('view_count', { ascending: false }).limit(5),
    supabase
      .from('audio_lectures')
      .select('id, title, view_count')
      .gt('view_count', 0)
      .order('view_count', { ascending: false })
      .limit(5),
  ]);

  const topBooks = (topBooksData ?? []) as Pick<Book, 'id' | 'title' | 'view_count'>[];
  const topAudio = (topAudioData ?? []) as Pick<AudioLecture, 'id' | 'title' | 'view_count'>[];

  const tiles = [
    { label: 'Books', count: bookCount ?? 0, href: '/admin/books', cta: 'Add book' },
    { label: 'Audio lectures', count: audioCount ?? 0, href: '/admin/audio', cta: 'Add lecture' },
    { label: 'Scholars', count: scholarCount ?? 0, href: '/admin/ulama', cta: 'Add scholar' },
    { label: 'Categories', count: categoryCount ?? 0, href: '/admin/categories', cta: 'Manage' },
    { label: 'Open reports', count: openReportCount ?? 0, href: '/admin/reports', cta: 'Review' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink/60">
          Only your account can see this page and make changes here.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card flex flex-col gap-2 p-5 hover:shadow-sm">
            <span className="text-3xl font-bold text-emerald-700">{t.count}</span>
            <span className="text-sm font-medium text-ink">{t.label}</span>
            <span className="text-xs text-emerald-700">{t.cta} →</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {topBooks.length > 0 && (
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-ink">Most viewed books</h2>
            <div className="divide-y divide-line">
              {topBooks.map((b) => (
                <Link
                  key={b.id}
                  href={`/books/${b.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-emerald-700"
                >
                  <span className="truncate text-ink" dir="auto">
                    {b.title}
                  </span>
                  <span className="shrink-0 text-xs text-ink/50">{b.view_count} views</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {topAudio.length > 0 && (
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-ink">Most played lectures</h2>
            <div className="divide-y divide-line">
              {topAudio.map((a) => (
                <Link
                  key={a.id}
                  href={`/audio/${a.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-emerald-700"
                >
                  <span className="truncate text-ink" dir="auto">
                    {a.title}
                  </span>
                  <span className="shrink-0 text-xs text-ink/50">{a.view_count} views</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
