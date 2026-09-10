export type Language = 'pashto' | 'urdu' | 'english' | 'arabic';

export const LANGUAGES: Language[] = [
  'pashto',
  'urdu',
  'english',
  'arabic',
];

export const LANGUAGE_LABELS: Record<Language, string> = {
  pashto: 'پښتو',
  urdu: 'اردو',
  english: 'English',
  arabic: 'العربية',
};

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

  scholar_id?: string | null;
  scholars?: Scholar | null;

  seo_title?: string | null;
  seo_description?: string | null;
  search_keywords?: string | null;

  view_count?: number;
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
};
