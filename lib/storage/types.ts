// The contract admin upload code talks to, independent of which storage
// backend is actually doing the work. Today there's exactly one
// implementation (../supabaseProvider.ts) — see lib/storage/README.md for
// how to add another one later without touching any admin page or the
// books/audio schema.

export type UploadKind = 'book-pdf' | 'book-cover' | 'audio-file' | 'scholar-photo';

export type UploadResult = {
  // The public URL — this is what already gets stored in
  // books.pdf_url / books.cover_url / audio_lectures.audio_url /
  // scholars.photo_url, exactly as before. Every other field here is
  // supplementary bookkeeping (supabase/migrations/013_storage_metadata.sql)
  // that lets a future migration or mirror job find the underlying object
  // without re-deriving it from the URL.
  url: string;
  provider: string;
  bucket: string;
  path: string;
  size: number;
  mimeType: string;
};

// Metadata form of UploadResult, used when removing a file — deliberately
// doesn't require the caller to have the original File/Blob around.
export type StoredFileRef = {
  provider: string;
  bucket: string;
  path: string;
};

export interface StorageProvider {
  readonly name: string;
  upload(kind: UploadKind, file: File): Promise<UploadResult>;
  remove(ref: StoredFileRef): Promise<void>;
}
