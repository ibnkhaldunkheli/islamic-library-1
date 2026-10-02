'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSavedIds } from '@/lib/saved';
import { getSavedIdsCloud } from '@/lib/cloudSaved';
import { useCurrentUser } from '@/lib/useCurrentUser';
import BookCard from '@/components/BookCard';
import AudioCard from '@/components/AudioCard';
import EmptyState from '@/components/EmptyState';
import LibrarySkeleton from '@/components/LibrarySkeleton';
import type { Book, AudioLecture } from '@/lib/types';

export default function SavedPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [books, setBooks] = useState<Book[]>([]);
  const [audio, setAudio] = useState<AudioLecture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    const load = async () => {
      const supabase = createClient();
      const [bookIds, audioIds] = user ? await Promise.all([getSavedIdsCloud(supabase, user.id, 'book'), getSavedIdsCloud(supabase, user.id, 'audio')]) : [getSavedIds('book'), getSavedIds('audio')];
      const [{ data: bookData }, { data: audioData }] = await Promise.all([
        bookIds.length ? supabase.from('books').select('*, categories(*)').in('id', bookIds) : Promise.resolve({ data: [] as Book[] }),
        audioIds.length ? supabase.from('audio_lectures').select('*, scholars(*), categories(*)').in('id', audioIds) : Promise.resolve({ data: [] as AudioLecture[] }),
      ]);
      setBooks((bookData ?? []) as Book[]); setAudio((audioData ?? []) as AudioLecture[]); setLoading(false);
    };
    void load();
  }, [user, userLoading]);

  if (loading) return <LibrarySkeleton cards={6} />;
  const isEmpty = books.length === 0 && audio.length === 0;
  return <div className="page-enter space-y-8"><header className="surface flex flex-col gap-3 p-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Your collection</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy">Saved items</h1><p className="mt-2 text-sm text-ink/55">{user ? 'Synced to your account and available on any device.' : 'Saved on this device. Sign in to sync across devices.'}</p></div><div className="flex rounded-xl bg-paper p-1 text-xs font-bold text-ink/55"><span className="rounded-lg bg-white px-3 py-2 text-blue-700 shadow-sm">All saved</span><span className="px-3 py-2">{books.length + audio.length} items</span></div></header>{isEmpty && <EmptyState title="Nothing saved yet." hint="Tap the bookmark icon on a book or lecture to save it here." />}{books.length > 0 && <section><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold text-navy">Saved books</h2><span className="text-xs font-bold text-ink/40">{books.length} items</span></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{books.map((b) => <BookCard key={b.id} book={b} />)}</div></section>}{audio.length > 0 && <section><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold text-navy">Saved audio</h2><span className="text-xs font-bold text-ink/40">{audio.length} items</span></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{audio.map((a) => <AudioCard key={a.id} lecture={a} />)}</div></section>}</div>;
}
