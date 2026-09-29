import Link from 'next/link';
import type { AudioLecture } from '@/lib/types';
import { LANGUAGE_LABELS } from '@/lib/types';
import SaveButton from '@/components/SaveButton';
import Icon from '@/components/Icon';

export default function AudioCard({ lecture }: { lecture: AudioLecture }) {
  return <article className="group relative flex flex-col gap-4 rounded-xl border border-line bg-white p-4 transition hover:border-blue-300 hover:shadow-soft"><div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Icon name="play" /></span><div className="flex items-center gap-2"><span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">{LANGUAGE_LABELS[lecture.language]}</span><SaveButton itemType="audio" itemId={lecture.id} /></div></div><div><Link href={`/audio/${lecture.id}`}><h3 className="line-clamp-2 text-base font-bold leading-snug text-ink group-hover:text-blue-700" dir="auto">{lecture.title}</h3></Link>{lecture.scholars?.name && <Link href={`/ulama/${lecture.scholars.id}`} className="mt-1 block text-xs text-ink/55 hover:text-blue-700" dir="auto">{lecture.scholars.name}</Link>}</div><Link href={`/audio/${lecture.id}`} className="btn-secondary mt-auto w-fit px-3 py-2 text-xs">Listen <Icon name="arrowRight" size={14} /></Link></article>;
}
