'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSavedIds } from '@/lib/saved';
import BookCard from '@/components/BookCard';
import AudioCard from '@/components/AudioCard';
import EmptyState from '@/components/EmptyState';
import type { Book, AudioLecture } from '@/lib/types';

export default function SavedPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [audio, setAudio] = useState<AudioLecture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const bookIds = getSavedIds('book');
      const audioIds = getSavedIds('audio');

      const [{ data: bookData }, { data: audioData }] = await Promise.all([
        bookIds.length
          ? supabase.from('books').select('*, categories(*)').in('id', bookIds)
          : Promise.resolve({ data: [] as Book[] }),
        audioIds.length
          ? supabase.from('audio_lectures').select('*, scholars(*), categories(*)').in('id', audioIds)
          : Promise.resolve({ data: [] as AudioLecture[] }),
      ]);

      setBooks((bookData ?? []) as Book[]);
      setAudio((audioData ?? []) as AudioLecture[]);
      setLoading(false);
    };
    load();
  }, []);

  const isEmpty = !loading && books.length === 0 && audio.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-ink">Saved</h1>
      <p className="-mt-4 text-sm text-ink/60">
        Saved items are kept on this device. They&apos;re not tied to an account.
      </p>

      {isEmpty && (
        <EmptyState
          title="Nothing saved yet."
          hint="Tap the bookmark icon on a book or lecture to save it here."
        />
      )}

      {books.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Books</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {books.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}

      {audio.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Audio lectures</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {audio.map((a) => (
              <AudioCard key={a.id} lecture={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
