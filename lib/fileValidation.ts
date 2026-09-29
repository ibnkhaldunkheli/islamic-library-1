// Client-side upload guardrails, used by every admin file input before it
// ever reaches supabase.storage.upload(). This is a UX/data-quality layer,
// not the security boundary — the real enforcement is the storage RLS
// policies in supabase/schema.sql (admin-only insert/update/delete per
// bucket). Even if someone bypassed this validation entirely (e.g. by
// calling the Storage API directly), they would still need an
// authenticated admin session to write anything, exactly as before.
//
// What this DOES protect against: an admin accidentally uploading the
// wrong file type, an oversized file eating into the project's storage
// quota, or a file name with characters that produce a confusing/unsafe
// object key.

export type FileRule = {
  label: string;
  // MIME type prefixes/exact matches to accept, e.g. ['application/pdf'].
  mimeTypes: string[];
  // Allowed extensions (lowercase, no dot) as a fallback, since some
  // browsers/OSes report generic or missing MIME types for certain files.
  extensions: string[];
  maxSizeMB: number;
};

export const FILE_RULES = {
  pdf: { label: 'PDF', mimeTypes: ['application/pdf'], extensions: ['pdf'], maxSizeMB: 100 },
  audio: {
    label: 'audio',
    mimeTypes: ['audio/'],
    extensions: ['mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac'],
    maxSizeMB: 300,
  },
  image: {
    label: 'image',
    mimeTypes: ['image/'],
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    maxSizeMB: 8,
  },
} satisfies Record<string, FileRule>;

export function validateFile(file: File, rule: FileRule): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mimeOk = rule.mimeTypes.some((m) => file.type === m || (m.endsWith('/') && file.type.startsWith(m)));
  const extOk = rule.extensions.includes(ext);
  if (!mimeOk && !extOk) {
    return `Please choose a ${rule.label} file (${rule.extensions.join(', ')}).`;
  }
  const maxBytes = rule.maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `That file is too large — the limit is ${rule.maxSizeMB}MB.`;
  }
  if (file.size === 0) {
    return 'That file appears to be empty.';
  }
  return null;
}

// Keeps only characters that are unambiguously safe in a storage object
// key, and caps the length, so an unusual filename can never produce a
// confusing or overly long path. The random prefix added at the call site
// already guarantees uniqueness, so collisions aren't a concern here.
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');
  return cleaned.slice(-120) || 'file';
}
