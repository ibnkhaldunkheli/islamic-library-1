import type { SupabaseClient } from '@supabase/supabase-js';

// Cloud counterpart to lib/progress.ts, used when a visitor is signed in.
// Backed by the `user_progress` table (RLS-scoped to the signed-in user —
// see supabase/migrations/010_visitor_accounts.sql) instead of
// localStorage, so reading/listening position follows the visitor across
// devices.

type ProgressType = 'book' | 'audio';

export async function getProgressCloud(
  supabase: SupabaseClient,
  userId: string,
  itemType: ProgressType,
  itemId: string
): Promise<number | undefined> {
  const { data } = await supabase
    .from('user_progress')
    .select('position')
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .maybeSingle();
  return data?.position != null ? Number(data.position) : undefined;
}

export async function setProgressCloud(
  supabase: SupabaseClient,
  userId: string,
  itemType: ProgressType,
  itemId: string,
  value: number
): Promise<void> {
  if (!itemId || !Number.isFinite(value)) return;
  await supabase
    .from('user_progress')
    .upsert(
      { user_id: userId, item_type: itemType, item_id: itemId, position: value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,item_type,item_id' }
    );
}

export async function getRecentProgressIdsCloud(
  supabase: SupabaseClient,
  userId: string,
  itemType: ProgressType,
  limit = 6
): Promise<string[]> {
  const { data } = await supabase
    .from('user_progress')
    .select('item_id')
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => row.item_id as string);
}
