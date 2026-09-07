import Link from 'next/link';
import type { AudioLecture } from '@/lib/types';
import { LANGUAGE_LABELS } from '@/lib/types';
import SaveButton from '@/components/SaveButton';

export default function AudioCard({ lecture }: { lecture: AudioLecture }) {
  return (
    <div className="card relative flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          {LANGUAGE_LABELS[lecture.language]}
        </span>
        <SaveButton itemType="audio" itemId={lecture.id} />
      </div>
      <Link href={`/audio/${lecture.id}`}>
        <h3 className="line-clamp-2 text-sm font-semibold text-ink hover:text-emerald-700" dir="auto">
          {lecture.title}
        </h3>
      </Link>
      {lecture.scholars?.name && (
        <Link href={`/ulama/${lecture.scholars.id}`} className="w-fit text-xs text-ink/60 hover:text-emerald-700" dir="auto">
          {lecture.scholars.name}
        </Link>
      )}
      <Link
        href={`/audio/${lecture.id}`}
        className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-card border border-line px-3 py-1.5 text-xs font-medium hover:bg-emerald-50"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        Play
      </Link>
    </div>
  );
}
