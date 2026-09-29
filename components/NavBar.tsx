import Link from 'next/link';
import { getIsAdmin } from '@/lib/supabase/server';
import Icon from '@/components/Icon';

const links = [
  { href: '/', label: 'Home', icon: 'home' as const },
  { href: '/books', label: 'Books', icon: 'books' as const },
  { href: '/audio', label: 'Audio', icon: 'audio' as const },
  { href: '/ulama', label: 'Ulama', icon: 'scholar' as const },
  { href: '/categories', label: 'Categories', icon: 'categories' as const },
];

export default async function NavBar() {
  const { user, isAdmin } = await getIsAdmin();
  return <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur"><div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"><Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Maktaba home"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-lg font-extrabold text-white shadow-sm">م</span><span><span className="block text-lg font-extrabold tracking-tight text-navy">Maktaba</span><span className="hidden text-[10px] font-semibold uppercase tracking-[.18em] text-blue-600 sm:block">Knowledge library</span></span></Link><nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">{links.map((link) => <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-ink/65 transition hover:bg-blue-50 hover:text-blue-700">{link.label}</Link>)}</nav><div className="flex items-center gap-1.5 sm:gap-2"><Link href="/search" className="btn-quiet px-2 sm:px-3" aria-label="Search"><Icon name="search" /><span className="hidden sm:inline">Search</span></Link><Link href="/saved" className="btn-quiet hidden sm:inline-flex">Saved</Link><Link href={user ? '/account' : '/account/login'} className="btn-quiet hidden sm:inline-flex">{user ? 'Account' : 'Sign in'}</Link><Link href={isAdmin ? '/admin' : '/login'} className="btn-primary hidden sm:inline-flex">{isAdmin ? 'Admin' : 'Owner login'}</Link></div></div><nav className="mx-auto hidden max-w-7xl items-center gap-2 overflow-x-auto px-4 pb-2 lg:hidden sm:px-6" aria-label="Mobile navigation">{links.map((link) => <Link key={link.href} href={link.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-ink/65 hover:bg-blue-50 hover:text-blue-700">{link.label}</Link>)}</nav><nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(11,31,58,.08)] backdrop-blur lg:hidden" aria-label="Bottom navigation">{links.map((link) => <Link key={link.href} href={link.href} className="flex flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-bold text-ink/60 hover:bg-blue-50 hover:text-blue-700"><Icon name={link.icon} size={17} />{link.label}</Link>)}</nav></header>;
}
