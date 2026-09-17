import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import type { AudioLecture } from '@/lib/types';
import { LANGUAGE_LABELS } from '@/lib/types';
import AudioPlayer from '@/components/AudioPlayer';
import SaveButton from '@/components/SaveButton';
import PermissionBadge from '@/components/PermissionBadge';
import ReportButton from '@/components/ReportButton';
import DownloadButton from '@/components/DownloadButton';

export const revalidate = 0;

// Same approach as the book detail page's generateMetadata: gives each
// lecture a real title/description/OG-image for search engines and link
// previews instead of the site-wide default.
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from('audio_lectures')
    .select('title, description, cover_url, scholars(name)')
    .eq('id', params.id)
    .maybeSingle();

  if (!data) return {};
  const scholarName = (data as unknown as { scholars: { name: string } | null }).scholars?.name;
  const title = scholarName ? `${data.title} — ${scholarName}` : data.title;
  const description = (data.description as string | null)?.trim() || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: data.cover_url ? [data.cover_url as string] : undefined,
    },
  };
}

export default async function AudioDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from('audio_lectures')
    .select('*, scholars(*), categories(*)')
    .eq('id', params.id)
    .maybeSingle();

  const lecture = data as AudioLecture | null;
  if (!lecture) notFound();

  // Fire-and-forget-style counter bump (see the matching note on the book
  // detail page) — used for "Most played" sorting later and the admin's
  // view-count visibility. Cannot touch anything besides this counter.
  await supabase.rpc('increment_audio_view', { p_audio_id: lecture.id });

  // Series navigation: only queried when this lecture actually belongs to
  // a named series, so lectures without one don't pay for an extra query.
  let seriesParts: Pick<AudioLecture, 'id' | 'part_number'>[] = [];
  if (lecture.series_name) {
    const { data: seriesData } = await supabase
      .from('audio_lectures')
      .select('id, part_number')
      .eq('series_name', lecture.series_name)
      .order('part_number', { ascending: true });
    seriesParts = (seriesData ?? []) as Pick<AudioLecture, 'id' | 'part_number'>[];
  }
  const seriesIndex = seriesParts.findIndex((p) => p.id === lecture.id);
  const prevPart = seriesIndex > 0 ? seriesParts[seriesIndex - 1] : null;
  const nextPart = seriesIndex >= 0 && seriesIndex < seriesParts.length - 1 ? seriesParts[seriesIndex + 1] : null;

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
          {lecture.series_name && (
            <p className="mt-1 text-sm text-emerald-700" dir="auto">
              {lecture.series_name}
              {lecture.part_number ? ` · Part ${lecture.part_number} of ${seriesParts.length}` : ''}
            </p>
          )}
        </div>
        <SaveButton itemType="audio" itemId={lecture.id} />
      </div>

      {lecture.description && <p className="text-sm text-ink/70">{lecture.description}</p>}

      <PermissionBadge
        status={lecture.permission_status}
        note={lecture.permission_note}
        copyrightNote={lecture.copyright_note}
        sourceNote={lecture.source_note}
      />

      <AudioPlayer src={lecture.audio_url} title={lecture.title} lectureId={lecture.id} />

      {(prevPart || nextPart) && (
        <div className="flex items-center justify-between gap-3">
          {prevPart ? (
            <Link href={`/audio/${prevPart.id}`} className="btn-secondary">
              ← Previous part
            </Link>
          ) : (
            <span />
          )}
          {nextPart ? (
            <Link href={`/audio/${nextPart.id}`} className="btn-primary">
              Next part →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}

      {lecture.downloadable === false ? (
        <p className="text-xs text-ink/50">Download is not available for this item.</p>
      ) : (
        <DownloadButton itemType="audio" itemId={lecture.id} title={lecture.title} url={lecture.audio_url} />
      )}

      <ReportButton itemType="audio" itemId={lecture.id} />
    </div>
  );
}
