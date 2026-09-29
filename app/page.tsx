import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BookCard from '@/components/BookCard';
import AudioCard from '@/components/AudioCard';
import EmptyState from '@/components/EmptyState';
import type { Book, AudioLecture, Category } from '@/lib/types';
import { LANGUAGES, LANGUAGE_LABELS } from '@/lib/types';
import ContinueSection from '@/components/ContinueSection';
import Icon from '@/components/Icon';

export const revalidate = 60;

export default async function HomePage() {
  const supabase = createClient();
  const [{ data: books }, { data: audio }, { data: categories }, { data: featuredBooks }, { data: featuredAudio }] = await Promise.all([
    supabase.from('books').select('*, categories(*)').order('created_at', { ascending: false }).limit(8),
    supabase.from('audio_lectures').select('*, scholars(*), categories(*)').order('created_at', { ascending: false }).limit(6),
    supabase.from('categories').select('*').order('name').limit(12),
    supabase.from('books').select('*, categories(*)').eq('featured', true).order('created_at', { ascending: false }).limit(6),
    supabase.from('audio_lectures').select('*, scholars(*), categories(*)').eq('featured', true).order('created_at', { ascending: false }).limit(4),
  ]);
  const recentBooks = (books ?? []) as Book[];
  const recentAudio = (audio ?? []) as AudioLecture[];
  const allCategories = (categories ?? []) as Category[];
  const featured = (featuredBooks ?? []) as Book[];
  const featuredLectures = (featuredAudio ?? []) as AudioLecture[];
  return <div className="space-y-14">
    <section className="hero-surface surface-grid relative overflow-hidden rounded-2xl px-5 py-12 text-white sm:px-10 sm:py-16"><div className="relative max-w-3xl"><p className="mb-4 text-xs font-bold uppercase tracking-[.22em] text-blue-200">Read · listen · continue learning</p><h1 className="max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">Discover knowledge, one page at a time.</h1><p className="mt-5 max-w-xl text-base leading-7 text-blue-100 sm:text-lg">A quiet, fast home for Islamic books and lectures in Arabic, Pashto, Urdu and English.</p><form action="/search" className="mt-8 flex max-w-2xl flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="home-search">Search the library</label><input id="home-search" name="q" type="search" placeholder="Search books, lectures, scholars…" className="min-h-12 flex-1 rounded-lg border border-white/20 bg-white px-4 text-sm text-ink outline-none placeholder:text-ink/45"/><button className="min-h-12 rounded-lg bg-blue-500 px-6 text-sm font-bold text-white transition hover:bg-blue-400">Search library</button></form><div className="mt-6 flex flex-wrap gap-2">{LANGUAGES.map((lang) => <Link key={lang} href={`/books?language=${lang}`} className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-blue-100 hover:bg-white/10">{LANGUAGE_LABELS[lang]}</Link>)}</div></div></section>
    <ContinueSection />
    {(featured.length > 0 || featuredLectures.length > 0) && <section><SectionHeader eyebrow="Curated for you" title="Featured in the library" href="/books" />{featured.length > 0 && <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">{featured.map((b) => <BookCard key={b.id} book={b} />)}</div>}{featuredLectures.length > 0 && <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{featuredLectures.map((a) => <AudioCard key={a.id} lecture={a} />)}</div>}</section>}
    {allCategories.length > 0 && <section><SectionHeader eyebrow="Browse by subject" title="Explore categories" href="/categories" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{allCategories.map((c) => <Link key={c.id} href={`/search?category=${c.id}`} className="rounded-xl border border-line bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50"><Icon name="categories" size={20} className="text-blue-600"/><span className="mt-3 block text-sm font-bold text-ink" dir="auto">{c.name}</span></Link>)}</div></section>}
    <section><SectionHeader eyebrow="Recently added" title="Books" href="/books" />{recentBooks.length === 0 ? <EmptyState title="No books available yet." hint="Books added by the administrator will appear here." /> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">{recentBooks.map((b) => <BookCard key={b.id} book={b} />)}</div>}</section>
    <section><SectionHeader eyebrow="Listen at your pace" title="Latest lectures" href="/audio" />{recentAudio.length === 0 ? <EmptyState title="No audio lectures available yet." hint="Lectures added by the administrator will appear here." /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{recentAudio.map((a) => <AudioCard key={a.id} lecture={a} />)}</div>}</section>
  </div>;
}
function SectionHeader({ eyebrow, title, href }: { eyebrow: string; title: string; href: string }) { return <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">{eyebrow}</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-navy">{title}</h2></div><Link href={href} className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:underline">View all <Icon name="arrowRight" size={14} /></Link></div>; }
