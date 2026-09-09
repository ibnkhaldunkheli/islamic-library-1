export type Language = 'pashto' | 'urdu' | 'english' | 'arabic';

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
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  pashto: 'پښتو',
  urdu: 'اردو',
  english: 'English',
  arabic: 'العربية',
};
