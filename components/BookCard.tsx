import Link from 'next/link';
import type { Book } from '@/lib/types';
import { LANGUAGE_LABELS } from '@/lib/types';
import SaveButton from '@/components/SaveButton';

export default function BookCard({ book }: { book: Book }) {
  return <article className="group interactive relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_6px_20px_rgba(11,31,58,.04)] hover:border-blue-300 hover:shadow-[0_14px_30px_rgba(22,93,190,.12)]">
    <Link href={`/books/${book.id}`} className="flex flex-1 flex-col">
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100">
        {book.cover_url ? <>{/* eslint-disable-next-line @next/next/no-img-element -- covers can come from configured storage providers */}<img src={book.cover_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /></> : <div className="flex h-full items-center justify-center text-blue-300"><svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>}
        <span className="absolute bottom-2 left-2 rounded-md bg-navy/90 px-2 py-1 text-[10px] font-bold text-white shadow-sm">Read</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5"><div className="flex flex-wrap items-center gap-1.5"><span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">{LANGUAGE_LABELS[book.language]}</span>{book.categories?.name && <span className="rounded-md bg-paper px-2 py-0.5 text-[10px] font-semibold text-ink/55">{book.categories.name}</span>}</div><h3 className="line-clamp-2 text-sm font-extrabold leading-snug text-ink transition-colors group-hover:text-blue-700" dir="auto">{book.title}</h3>{book.author && <p className="line-clamp-1 text-xs text-ink/55" dir="auto">{book.author}</p>}</div>
    </Link><div className="absolute right-2 top-2"><SaveButton itemType="book" itemId={book.id} /></div>
  </article>;
}
