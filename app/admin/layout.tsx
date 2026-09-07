import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getIsAdmin } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';

const sections = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/books', label: 'Books' },
  { href: '/admin/audio', label: 'Audio' },
  { href: '/admin/ulama', label: 'Ulama' },
  { href: '/admin/categories', label: 'Categories' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side check. Even if middleware were somehow skipped, this page
  // itself refuses to render admin content for a non-admin session — and
  // any data mutation still has to pass the database's RLS policies too.
  const { isAdmin } = await getIsAdmin();
  if (!isAdmin) redirect('/login');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <nav className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-card border border-line bg-white px-3.5 py-1.5 text-sm font-medium hover:bg-emerald-50"
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <SignOutButton />
      </div>
      {children}
    </div>
  );
}
