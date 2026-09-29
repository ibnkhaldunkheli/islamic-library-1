'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getRecentProgressIds } from '@/lib/progress';
import { getRecentProgressIdsCloud } from '@/lib/cloudProgress';
import { useCurrentUser } from '@/lib/useCurrentUser';
import BookCard from '@/components/BookCard';
import AudioCard from '@/components/AudioCard';
import type { Book, AudioLecture } from '@/lib/types';

// Renders "Continue reading" / "Continue listening" rows on the home page.
// Signed-in visitors get their synced cloud progress; everyone else gets
// this device's local progress (see lib/progress.ts — same on-device
// approach as Saved, no account needed). Renders nothing at all when there
// is no in-progress item, so the home page looks exactly as before for new
// visitors.
export default function ContinueSection() {
  const { user, loading: userLoading } = useCurrentUser();
  const [books, setBooks] = useState<Book[]>([]);
  const [audio, setAudio] = useState<AudioLecture[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (userLoading) return;
    const load = async () => {
      const supabase = createClient();
      const [bookIds, audioIds] = user
        ? await Promise.all([
            getRecentProgressIdsCloud(supabase, user.id, 'book'),
            getRecentProgressIdsCloud(supabase, user.id, 'audio'),
          ])
        : [getRecentProgressIds('book'), getRecentProgressIds('audio')];

      if (bookIds.length === 0 && audioIds.length === 0) {
        setLoaded(true);
        return;
      }

      const [{ data: bookData }, { data: audioData }] = await Promise.all([
        bookIds.length
          ? supabase.from('books').select('*, categories(*)').in('id', bookIds)
          : Promise.resolve({ data: [] as Book[] }),
        audioIds.length
          ? supabase.from('audio_lectures').select('*, scholars(*), categories(*)').in('id', audioIds)
          : Promise.resolve({ data: [] as AudioLecture[] }),
      ]);

      // Preserve most-recent-first order from progress, not the DB's order.
      const bookMap = new Map(((bookData ?? []) as Book[]).map((b) => [b.id, b]));
      const audioMap = new Map(((audioData ?? []) as AudioLecture[]).map((a) => [a.id, a]));
      setBooks(bookIds.map((id) => bookMap.get(id)).filter(Boolean) as Book[]);
      setAudio(audioIds.map((id) => audioMap.get(id)).filter(Boolean) as AudioLecture[]);
      setLoaded(true);
    };
    load();
  }, [user, userLoading]);

  if (!loaded || (books.length === 0 && audio.length === 0)) return null;

  return (
    <>
      {books.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-ink">Continue reading</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {books.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}

      {audio.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-ink">Continue listening</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {audio.map((a) => (
              <AudioCard key={a.id} lecture={a} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
