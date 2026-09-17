import type { SupabaseClient } from '@supabase/supabase-js';

// Cloud counterpart to lib/saved.ts, used when a visitor is signed in.
// Same (itemType, id) shape, just backed by the `user_favorites` table
// (RLS-scoped to the signed-in user — see
// supabase/migrations/010_visitor_accounts.sql) instead of localStorage.

export async function getSavedIdsCloud(
  supabase: SupabaseClient,
  userId: string,
  itemType: 'book' | 'audio'
): Promise<string[]> {
  const { data } = await supabase
    .from('user_favorites')
    .select('item_id')
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .order('created_at', { ascending: false });
  return (data ?? []).map((row) => row.item_id as string);
}

export async function toggleSavedCloud(
  supabase: SupabaseClient,
  userId: string,
  itemType: 'book' | 'audio',
  itemId: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .maybeSingle();

  if (existing) {
    await supabase.from('user_favorites').delete().eq('id', existing.id);
    return false;
  }
  await supabase.from('user_favorites').insert({ user_id: userId, item_type: itemType, item_id: itemId });
  return true;
}
