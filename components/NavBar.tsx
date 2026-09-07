import Link from 'next/link';
import { getIsAdmin } from '@/lib/supabase/server';

const links = [
  { href: '/books', label: 'Books' },
  { href: '/audio', label: 'Audio' },
  { href: '/ulama', label: 'Ulama' },
  { href: '/categories', label: 'Categories' },
  { href: '/search', label: 'Search' },
  { href: '/saved', label: 'Saved' },
];

export default async function NavBar() {
  const { isAdmin } = await getIsAdmin();

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-base font-bold text-white">
            م
          </span>
          <span className="text-lg font-bold tracking-tight text-emerald-700">Maktaba</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-ink/70 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-emerald-700">
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href={isAdmin ? '/admin' : '/login'}
          className="rounded-card border border-line px-3.5 py-2 text-sm font-medium hover:bg-emerald-50"
        >
          {isAdmin ? 'Admin dashboard' : 'Owner login'}
        </Link>
      </div>

      <nav className="flex items-center gap-5 overflow-x-auto border-t border-line px-5 py-2.5 text-sm font-medium text-ink/70 md:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="whitespace-nowrap hover:text-emerald-700">
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
