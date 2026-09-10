import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AudioCard from '@/components/AudioCard';
import EmptyState from '@/components/EmptyState';
import type { AudioLecture, Language } from '@/lib/types';
import { LANGUAGES, LANGUAGE_LABELS } from '@/lib/types';

export const revalidate = 0;

export default async function AudioPage({
  searchParams,
}: {
  searchParams: { language?: string };
}) {
  const supabase = createClient();
  const language = searchParams.language as Language | undefined;

  let query = supabase
    .from('audio_lectures')
    .select('*, scholars(*), categories(*)')
    .order('created_at', { ascending: false });
  if (language) query = query.eq('language', language);

  const { data } = await query;
  const lectures = (data ?? []) as AudioLecture[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink">Audio lectures</h1>
        <div className="flex gap-2">
          {LANGUAGES.map((lang) => (
            <Link
              key={lang}
              href={language === lang ? '/audio' : `/audio?language=${lang}`}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                language === lang
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-line bg-white text-ink/80 hover:border-emerald-600'
              }`}
            >
              {LANGUAGE_LABELS[lang]}
            </Link>
          ))}
        </div>
      </div>

      {lectures.length === 0 ? (
        <EmptyState
          title="No audio lectures available yet."
          hint="Lectures added by the administrator will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {lectures.map((a) => (
            <AudioCard key={a.id} lecture={a} />
          ))}
        </div>
      )}
    </div>
  );
}
