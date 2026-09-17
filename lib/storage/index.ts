import { createClient } from '@/lib/supabase/client';
import { createSupabaseStorageProvider } from './supabaseProvider';
import type { StorageProvider } from './types';

// The ONE place that decides which storage backend is active. Every admin
// upload/remove call goes through getStorageProvider() rather than
// talking to a specific backend directly — see lib/storage/README.md for
// how a future provider plugs in here without any admin page or schema
// change. Today this always returns Supabase Storage.
export function getStorageProvider(): StorageProvider {
  return createSupabaseStorageProvider(createClient());
}

export type { UploadKind, UploadResult, StoredFileRef, StorageProvider } from './types';
