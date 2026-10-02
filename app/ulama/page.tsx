import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import EmptyState from '@/components/EmptyState';
import Icon from '@/components/Icon';
import type { Scholar } from '@/lib/types';

export const revalidate = 0;

export default async function UlamaPage() {
  const supabase = createClient();
  const [{ data: scholarData }, { data: bookLinks }, { data: audioLinks }] = await Promise.all([
    supabase.from('scholars').select('*').order('name'),
    supabase.from('books').select('scholar_id').not('scholar_id', 'is', null),
    supabase.from('audio_lectures').select('scholar_id').not('scholar_id', 'is', null),
  ]);
  const scholars = ((scholarData ?? []) as Scholar[]).sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
  const bookCounts = new Map<string, number>(); for (const row of bookLinks ?? []) if (row.scholar_id) bookCounts.set(row.scholar_id, (bookCounts.get(row.scholar_id) ?? 0) + 1);
  const audioCounts = new Map<string, number>(); for (const row of audioLinks ?? []) if (row.scholar_id) audioCounts.set(row.scholar_id, (audioCounts.get(row.scholar_id) ?? 0) + 1);

  return <div className="page-enter space-y-8"><header><p className="eyebrow">People of knowledge</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy">Ulama</h1><p className="mt-2 max-w-xl text-sm leading-6 text-ink/55">Discover scholars and explore the books and lectures connected to their work.</p></header>{scholars.length === 0 ? <EmptyState title="No scholars added yet." hint="Scholar profiles added by the administrator will appear here." /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{scholars.map((s) => { const bookCount = bookCounts.get(s.id) ?? 0; const audioCount = audioCounts.get(s.id) ?? 0; return <article key={s.id} className="surface interactive group flex flex-col gap-4 p-5"><div className="flex items-center gap-4"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-blue-50">{s.photo_url ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={s.photo_url} alt="" className="h-full w-full object-cover" /></> : <div className="flex h-full w-full items-center justify-center text-blue-300"><Icon name="scholar" size={28} /></div>}</div><div className="min-w-0"><h2 className="truncate text-base font-extrabold text-ink group-hover:text-blue-700" dir="auto">{s.name}</h2>{s.featured && <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Featured</span>}</div></div>{s.bio && <p className="line-clamp-3 text-sm leading-6 text-ink/60" dir="auto">{s.bio}</p>}<div className="flex items-center gap-3 text-xs font-semibold text-ink/45"><span>{bookCount} {bookCount === 1 ? 'book' : 'books'}</span><span className="h-1 w-1 rounded-full bg-line" /><span>{audioCount} {audioCount === 1 ? 'lecture' : 'lectures'}</span></div><Link href={`/ulama/${s.id}`} className="btn-secondary mt-auto w-full">View profile <Icon name="arrowRight" size={14} /></Link></article>; })}</div>}</div>;
}
