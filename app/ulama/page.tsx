import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import EmptyState from '@/components/EmptyState';
import type { Scholar } from '@/lib/types';

export const revalidate = 0;

export default async function UlamaPage() {
  const supabase = createClient();

  // Real counts, not placeholders: pull every book/audio scholar_id and
  // tally them client-side rather than one query per scholar.
  const [{ data: scholarData }, { data: bookLinks }, { data: audioLinks }] = await Promise.all([
    supabase.from('scholars').select('*').order('name'),
    supabase.from('books').select('scholar_id').not('scholar_id', 'is', null),
    supabase.from('audio_lectures').select('scholar_id').not('scholar_id', 'is', null),
  ]);

  const scholars = (scholarData ?? []) as Scholar[];

  const bookCounts = new Map<string, number>();
  for (const row of bookLinks ?? []) {
    if (!row.scholar_id) continue;
    bookCounts.set(row.scholar_id, (bookCounts.get(row.scholar_id) ?? 0) + 1);
  }
  const audioCounts = new Map<string, number>();
  for (const row of audioLinks ?? []) {
    if (!row.scholar_id) continue;
    audioCounts.set(row.scholar_id, (audioCounts.get(row.scholar_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-ink">Ulama</h1>

      {scholars.length === 0 ? (
        <EmptyState
          title="No scholars added yet."
          hint="Scholar profiles added by the administrator will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {scholars.map((s) => {
            const bookCount = bookCounts.get(s.id) ?? 0;
            const audioCount = audioCounts.get(s.id) ?? 0;
            return (
              <div key={s.id} className="card flex flex-col items-center gap-3 p-5 text-center">
                <div className="h-20 w-20 overflow-hidden rounded-full bg-emerald-50">
                  {s.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-emerald-300">
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                        <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z" />
                        <path d="M4 21c1.6-4 5-6 8-6s6.4 2 8 6" />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-ink" dir="auto">
                  {s.name}
                </h3>
                {s.bio && (
                  <p className="line-clamp-3 text-sm text-ink/60" dir="auto">
                    {s.bio}
                  </p>
                )}
                <p className="text-xs text-ink/40">
                  {bookCount} {bookCount === 1 ? 'book' : 'books'}
                  {audioCount > 0 ? ` · ${audioCount} ${audioCount === 1 ? 'lecture' : 'lectures'}` : ''}
                </p>
                <Link href={`/ulama/${s.id}`} className="btn-secondary mt-1 w-full">
                  View Profile
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
