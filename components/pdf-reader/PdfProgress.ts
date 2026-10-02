import { getProgress, setProgress } from '@/lib/progress';
import { getProgressCloud, setProgressCloud } from '@/lib/cloudProgress';
import { createClient } from '@/lib/supabase/client';

export async function restorePdfProgress(bookId: string | undefined, userId: string | undefined, totalPages: number) {
  if (!bookId) return 1;
  const value = userId ? await getProgressCloud(createClient(), userId, 'book', bookId) : getProgress('book', bookId);
  return value && Number.isInteger(value) && value >= 1 && value <= totalPages ? value : 1;
}

export function savePdfProgress(bookId: string | undefined, userId: string | undefined, page: number) {
  if (!bookId) return;
  setProgress('book', bookId, page);
  if (userId) void setProgressCloud(createClient(), userId, 'book', bookId, page);
}
