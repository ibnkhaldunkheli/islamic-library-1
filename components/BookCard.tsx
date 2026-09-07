import Link from 'next/link';
import type { Book } from '@/lib/types';
import { LANGUAGE_LABELS } from '@/lib/types';
import SaveButton from '@/components/SaveButton';

export default function BookCard({ book }: { book: Book }) {
  return (
    <div className="card group relative flex flex-col overflow-hidden transition-shadow hover:shadow-sm">
      <Link href={`/books/${book.id}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[3/4] w-full bg-emerald-50">
          {book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-emerald-300">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
          )}
          {/* Always-visible (not hover-only) affordance so touch/mobile users
              can tell at a glance that the book opens in an in-app reader. */}
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-emerald-700 shadow-sm ring-1 ring-line">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Read
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              {LANGUAGE_LABELS[book.language]}
            </span>
            {book.categories?.name && (
              <span className="w-fit rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-ink/60 ring-1 ring-line">
                {book.categories.name}
              </span>
            )}
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold text-ink" dir="auto">
            {book.title}
          </h3>
          {book.author && (
            <p className="line-clamp-1 text-xs text-ink/60" dir="auto">
              {book.author}
            </p>
          )}
        </div>
      </Link>
      <div className="absolute right-2 top-2">
        <SaveButton itemType="book" itemId={book.id} />
      </div>
    </div>
  );
}
