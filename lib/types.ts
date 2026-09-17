export type Language = 'pashto' | 'urdu' | 'english' | 'arabic';

export type PermissionStatus =
  | 'authorized'
  | 'public_domain'
  | 'author_permission'
  | 'publisher_permission'
  | 'unknown';

export const PERMISSION_STATUS_LABELS: Record<PermissionStatus, string> = {
  authorized: 'Authorized for publication',
  public_domain: 'Public domain',
  author_permission: 'Published with author permission',
  publisher_permission: 'Published with publisher permission',
  unknown: 'Permission status not yet confirmed',
};

// Canonical ordered list of language values, used everywhere a language
// selector or filter list is rendered so every surface stays in sync.
export const LANGUAGES: Language[] = ['pashto', 'urdu', 'english', 'arabic'];

export type Category = {
  id: string;
  name: string;
  language: Language;
  created_at: string;
};

export type Scholar = {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  created_at: string;
  // Enriched profile fields (see supabase/migrations/012_scholar_profiles.sql
  // for the note on existing databases).
  arabic_name?: string | null;
  aliases?: string[];
  languages?: Language[];
  featured?: boolean;
};

export type Book = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  language: Language;
  category_id: string | null;
  cover_url: string | null;
  pdf_url: string;
  created_at: string;
  categories?: Category | null;
  // Optional link to a full Ulama profile. `author` (above) stays as a
  // free-text fallback/display label independent of this relationship.
  scholar_id?: string | null;
  scholars?: Scholar | null;
  // Admin-only SEO / search-discoverability fields. Never rendered as
  // visible keyword lists to visitors — only used for page metadata and
  // to widen what the internal search can match against.
  seo_title?: string | null;
  seo_description?: string | null;
  search_keywords?: string | null;
  // How many times this book's page has been viewed. Used for "Most read"
  // sorting and the admin "Most viewed" list. Defaults to 0 on new rows;
  // absent (undefined) on any query that doesn't select it.
  view_count?: number;
  // Trust/permission metadata. permission_status defaults to 'unknown' in
  // the database — never assume authorization for rows that predate this
  // field (see supabase/migrations/005_permission_trust_system.sql).
  permission_status?: PermissionStatus;
  permission_note?: string | null;
  copyright_note?: string | null;
  source_note?: string | null;
  // Admin-pinned homepage placement (see supabase/migrations/008_featured_content.sql).
  featured?: boolean;
  // Storage-provider bookkeeping (see supabase/migrations/013_storage_metadata.sql
  // and lib/storage/README.md). pdf_url above remains the field every
  // page actually renders/links to; these are supplementary.
  storage_provider?: string;
  storage_bucket?: string | null;
  storage_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
};

export type AudioLecture = {
  id: string;
  title: string;
  scholar_id: string | null;
  description: string | null;
  language: Language;
  category_id: string | null;
  audio_url: string;
  created_at: string;
  scholars?: Scholar | null;
  categories?: Category | null;
  view_count?: number;
  permission_status?: PermissionStatus;
  permission_note?: string | null;
  copyright_note?: string | null;
  source_note?: string | null;
  // Explicit admin-set download permission. Defaults to true in the
  // database for existing rows so behavior doesn't change silently.
  downloadable?: boolean;
  // Optional multi-part series grouping (see supabase/migrations/007_audio_series.sql).
  series_name?: string | null;
  part_number?: number | null;
  featured?: boolean;
  // Storage-provider bookkeeping — same purpose as the matching fields on Book.
  storage_provider?: string;
  storage_bucket?: string | null;
  storage_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  pashto: 'پښتو',
  urdu: 'اردو',
  english: 'English',
  arabic: 'العربية',
};

export type ReportReason =
  | 'broken_pdf'
  | 'broken_audio'
  | 'incorrect_information'
  | 'wrong_cover'
  | 'missing_pages'
  | 'incorrect_scholar'
  | 'incorrect_category'
  | 'other';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  broken_pdf: 'Broken PDF',
  broken_audio: 'Broken audio',
  incorrect_information: 'Incorrect information',
  wrong_cover: 'Wrong cover image',
  missing_pages: 'Missing pages',
  incorrect_scholar: 'Incorrect scholar',
  incorrect_category: 'Incorrect category',
  other: 'Other problem',
};

export type Report = {
  id: string;
  item_type: 'book' | 'audio';
  item_id: string;
  reason: ReportReason;
  message: string | null;
  status: 'open' | 'resolved';
  created_at: string;
};

export type Announcement = {
  id: string;
  message: string;
  link: string | null;
  active: boolean;
  created_at: string;
};
