import type { SupabaseClient } from '@supabase/supabase-js';
import { FILE_RULES, validateFile, sanitizeFileName, type FileRule } from '@/lib/fileValidation';
import type { StorageProvider, UploadKind, UploadResult, StoredFileRef } from './types';

// Reuses the exact bucket names already created by supabase/schema.sql —
// no bucket changes, no data migration, nothing about the existing
// storage RLS policies (admin-only write, public read) changes.
const BUCKETS: Record<UploadKind, string> = {
  'book-pdf': 'book-pdfs',
  'book-cover': 'book-covers',
  'audio-file': 'audio-files',
  'scholar-photo': 'scholar-photos',
};

const RULES: Record<UploadKind, FileRule> = {
  'book-pdf': FILE_RULES.pdf,
  'book-cover': FILE_RULES.image,
  'audio-file': FILE_RULES.audio,
  'scholar-photo': FILE_RULES.image,
};

// This runs client-side (in the admin's own browser) exactly like the
// upload code it replaces did. That remains safe here specifically
// because Supabase Storage's security is enforced by RLS on the bucket
// (see supabase/schema.sql's storage.objects policies) rather than by a
// secret the client holds — the anon key is meant to be public. A future
// provider that instead requires a private API key/secret must NOT
// follow this same client-side pattern; see lib/storage/README.md.
export function createSupabaseStorageProvider(supabase: SupabaseClient): StorageProvider {
  return {
    name: 'supabase',

    async upload(kind: UploadKind, file: File): Promise<UploadResult> {
      const validationError = validateFile(file, RULES[kind]);
      if (validationError) throw new Error(validationError);

      const bucket = BUCKETS[kind];
      const path = `${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file);
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);

      return {
        url: pub.publicUrl,
        provider: 'supabase',
        bucket,
        path,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
      };
    },

    async remove(ref: StoredFileRef): Promise<void> {
      if (ref.provider !== 'supabase') {
        throw new Error(`This provider can't remove a file stored by "${ref.provider}".`);
      }
      const { error } = await supabase.storage.from(ref.bucket).remove([ref.path]);
      if (error) throw error;
    },
  };
}
