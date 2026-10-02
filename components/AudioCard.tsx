import Link from 'next/link';
import type { AudioLecture } from '@/lib/types';
import { LANGUAGE_LABELS } from '@/lib/types';
import SaveButton from '@/components/SaveButton';
import Icon from '@/components/Icon';

export default function AudioCard({ lecture }: { lecture: AudioLecture }) {
  return <article className="group interactive relative flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-[0_6px_20px_rgba(11,31,58,.04)] hover:border-blue-300 hover:shadow-[0_14px_30px_rgba(22,93,190,.12)]"><div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200"><Icon name="play" /></span><div className="flex items-center gap-2"><span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">{LANGUAGE_LABELS[lecture.language]}</span><SaveButton itemType="audio" itemId={lecture.id} /></div></div><div><Link href={`/audio/${lecture.id}`}><h3 className="line-clamp-2 text-base font-extrabold leading-snug text-ink transition-colors group-hover:text-blue-700" dir="auto">{lecture.title}</h3></Link>{lecture.scholars?.name && <Link href={`/ulama/${lecture.scholars.id}`} className="mt-1 block text-xs font-medium text-ink/55 hover:text-blue-700" dir="auto">{lecture.scholars.name}</Link>}</div><Link href={`/audio/${lecture.id}`} className="btn-secondary mt-auto w-fit px-3 py-2 text-xs">Listen <Icon name="arrowRight" size={14} /></Link></article>;
}
