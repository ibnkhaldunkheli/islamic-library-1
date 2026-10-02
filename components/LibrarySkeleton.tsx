export function CardSkeleton({ kind = 'book' }: { kind?: 'book' | 'audio' | 'scholar' }) {
  return <div className="surface overflow-hidden p-3"><div className={kind === 'book' ? 'skeleton aspect-[3/4] w-full' : 'skeleton h-12 w-12 rounded-xl'} /><div className="mt-3 space-y-2"><div className="skeleton h-2.5 w-2/5" /><div className="skeleton h-4 w-4/5" /><div className="skeleton h-3 w-3/5" /></div></div>;
}

export default function LibrarySkeleton({ cards = 8, kind = 'book' }: { cards?: number; kind?: 'book' | 'audio' | 'scholar' }) {
  return <div className="page-enter space-y-8"><div className="space-y-3"><div className="skeleton h-3 w-24" /><div className="skeleton h-9 w-56" /><div className="skeleton h-4 w-80 max-w-full" /></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{Array.from({ length: cards }, (_, index) => <CardSkeleton key={index} kind={kind} />)}</div></div>;
}
