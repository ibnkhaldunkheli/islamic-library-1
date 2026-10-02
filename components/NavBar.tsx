import Link from 'next/link';
import { getIsAdmin } from '@/lib/supabase/server';
import Icon from '@/components/Icon';

const links = [
  { href: '/', label: 'Discover', icon: 'home' as const },
  { href: '/books', label: 'Books', icon: 'books' as const },
  { href: '/audio', label: 'Audio lectures', icon: 'audio' as const },
  { href: '/ulama', label: 'Ulama', icon: 'scholar' as const },
  { href: '/categories', label: 'Categories', icon: 'categories' as const },
];

const utilityLinks = [
  { href: '/saved', label: 'Saved' },
  { href: '/downloads', label: 'Downloads' },
];

function Brand() {
  return <Link href="/" className="flex items-center gap-3" aria-label="Maktaba home"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-extrabold text-white shadow-sm shadow-blue-200">م</span><span><span className="block text-lg font-extrabold tracking-tight text-navy">Maktaba</span><span className="hidden text-[10px] font-bold uppercase tracking-[.18em] text-blue-600 sm:block">Islamic knowledge library</span></span></Link>;
}

export default async function NavBar() {
  const { user, isAdmin } = await getIsAdmin();
  return <>
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-white px-4 py-5 lg:flex">
      <div className="px-2"><Brand /></div>
      <div className="mt-10"><p className="px-3 text-[10px] font-extrabold uppercase tracking-[.2em] text-ink/35">Library</p><nav className="mt-3 space-y-1" aria-label="Primary navigation">{links.map((link) => <Link key={link.href} href={link.href} className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-ink/60 transition hover:bg-blue-50 hover:text-blue-700"><Icon name={link.icon} size={18} className="text-ink/40 transition group-hover:text-blue-600" />{link.label}</Link>)}</nav></div>
      <div className="mt-8 border-t border-line pt-6"><p className="px-3 text-[10px] font-extrabold uppercase tracking-[.2em] text-ink/35">Your library</p><nav className="mt-3 space-y-1">{utilityLinks.map((link) => <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-ink/60 transition hover:bg-blue-50 hover:text-blue-700"><span className="h-2 w-2 rounded-full bg-blue-200" />{link.label}</Link>)}</nav></div>
      <div className="mt-auto rounded-2xl bg-navy p-4 text-white"><p className="text-xs font-bold text-blue-200">Keep learning</p><p className="mt-1 text-sm font-extrabold leading-5">Read a page. Listen to a lecture. Continue your journey.</p><Link href="/books" className="mt-3 inline-flex text-xs font-bold text-blue-200 hover:text-white">Explore collection <Icon name="arrowRight" size={13} className="ml-1" /></Link></div>
    </aside>
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur lg:ml-64">
      <div className="flex min-h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8"><div className="lg:hidden"><Brand /></div><form action="/search" className="relative hidden max-w-xl flex-1 md:block"><Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" /><input name="q" type="search" placeholder="Search books, lectures, scholars…" className="h-11 w-full rounded-xl border border-line bg-paper pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" aria-label="Search the library" /></form><div className="ml-auto flex items-center gap-2"><Link href="/search" className="btn-quiet px-2 md:hidden" aria-label="Search"><Icon name="search" /></Link><Link href={user ? '/account' : '/account/login'} className="hidden items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold text-ink/65 transition hover:border-blue-300 hover:bg-blue-50 sm:flex"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-700">{user ? (user.email?.[0] ?? 'U').toUpperCase() : '?'}</span><span>{user ? 'Account' : 'Sign in'}</span></Link>{isAdmin && <Link href="/admin" className="btn-primary hidden px-3 py-2 text-xs sm:inline-flex">Admin</Link>}</div></div>
      <div className="border-t border-line px-4 py-2 md:hidden"><form action="/search" className="relative"><Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" /><input name="q" type="search" placeholder="Search the library…" className="h-10 w-full rounded-lg border border-line bg-paper pl-9 pr-3 text-sm outline-none" aria-label="Search the library" /></form></div>
    </header>
    <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(11,31,58,.08)] backdrop-blur lg:hidden" aria-label="Mobile navigation">{links.map((link) => <Link key={link.href} href={link.href} className="flex flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-bold text-ink/60 transition hover:bg-blue-50 hover:text-blue-700"><Icon name={link.icon} size={17} />{link.label === 'Audio lectures' ? 'Audio' : link.label}</Link>)}</nav>
  </>;
}
