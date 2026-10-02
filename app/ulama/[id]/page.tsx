import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import type { Scholar, Book, AudioLecture } from '@/lib/types';
import { LANGUAGE_LABELS } from '@/lib/types';
import BookCard from '@/components/BookCard';
import AudioCard from '@/components/AudioCard';
import EmptyState from '@/components/EmptyState';
import Icon from '@/components/Icon';

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase.from('scholars').select('name, bio').eq('id', params.id).maybeSingle();
  if (!data) return {};
  return {
    title: data.name,
    description: data.bio?.trim() ? data.bio.trim().slice(0, 160) : undefined,
  };
}

export default async function ScholarProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: scholarData }, { data: bookData }, { data: audioData }] = await Promise.all([
    supabase.from('scholars').select('*').eq('id', params.id).maybeSingle(),
    supabase
      .from('books')
      .select('*, categories(*)')
      .eq('scholar_id', params.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('audio_lectures')
      .select('*, scholars(*), categories(*)')
      .eq('scholar_id', params.id)
      .order('created_at', { ascending: false }),
  ]);

  const scholar = scholarData as Scholar | null;
  if (!scholar) notFound();

  const books = (bookData ?? []) as Book[];
  const audio = (audioData ?? []) as AudioLecture[];

  return (
    <div className="page-enter flex flex-col gap-8">
      <Link
        href="/ulama"
        className="flex w-fit items-center gap-1.5 text-sm font-bold text-ink/60 transition-colors hover:text-blue-700"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to Ulama
      </Link>

      {/* Header / profile area */}
      <div className="surface flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left sm:p-8">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-3xl bg-blue-50">
          {scholar.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={scholar.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-blue-300"><Icon name="scholar" size={44} /></div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink" dir="auto">
            {scholar.name}
          </h1>
          {scholar.arabic_name && (
            <p className="mt-0.5 text-lg text-ink/60" dir="rtl">
              {scholar.arabic_name}
            </p>
          )}
          {scholar.aliases && scholar.aliases.length > 0 && (
            <p className="mt-0.5 text-xs text-ink/40">Also known as: {scholar.aliases.join(', ')}</p>
          )}
          {scholar.languages && scholar.languages.length > 0 && (
            <div className="mt-1.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {scholar.languages.map((lang) => (
                <span
                  key={lang}
                    className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700"
                >
                  {LANGUAGE_LABELS[lang]}
                </span>
              ))}
            </div>
          )}
          <p className="mt-1.5 text-sm text-ink/50">
            {books.length} {books.length === 1 ? 'book' : 'books'}
            {audio.length > 0 ? ` · ${audio.length} ${audio.length === 1 ? 'lecture' : 'lectures'}` : ''}
          </p>
        </div>
      </div>

      {/* Biography — full text, readable, not squeezed into a tiny box */}
      {scholar.bio && (
        <section className="surface p-6">
          <h2 className="mb-3 text-lg font-extrabold text-navy">Biography</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80" dir="auto">
            {scholar.bio}
          </p>
        </section>
      )}

      {/* Books by this Shaykh */}
      <section>
          <h2 className="mb-4 text-xl font-extrabold text-navy">Books by this Shaykh</h2>
        {books.length === 0 ? (
          <EmptyState
            title="No books have been added yet."
            hint="Books linked to this Shaykh by the administrator will appear here."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {books.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>

      {/* Audio lectures by this Shaykh — omitted entirely when there's
          nothing to show yet, so the page doesn't lead with an empty
          section for content the admin hasn't added at all. */}
      {audio.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-extrabold text-navy">Audio lectures by this Shaykh</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {audio.map((a) => (
              <AudioCard key={a.id} lecture={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
