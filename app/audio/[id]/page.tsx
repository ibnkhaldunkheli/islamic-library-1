import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AudioLecture } from '@/lib/types';
import { LANGUAGE_LABELS } from '@/lib/types';
import AudioPlayer from '@/components/AudioPlayer';
import SaveButton from '@/components/SaveButton';

export const revalidate = 0;

export default async function AudioDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from('audio_lectures')
    .select('*, scholars(*), categories(*)')
    .eq('id', params.id)
    .maybeSingle();

  const lecture = data as AudioLecture | null;
  if (!lecture) notFound();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            {LANGUAGE_LABELS[lecture.language]}
          </span>
          <h1 className="mt-2 text-2xl font-bold text-ink">{lecture.title}</h1>
          {lecture.scholars?.name && (
            <p className="mt-1 text-sm text-ink/60">{lecture.scholars.name}</p>
          )}
        </div>
        <SaveButton itemType="audio" itemId={lecture.id} />
      </div>

      {lecture.description && <p className="text-sm text-ink/70">{lecture.description}</p>}

      <AudioPlayer src={lecture.audio_url} title={lecture.title} />
    </div>
  );
}
