import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getIsAdmin } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';
import Icon from '@/components/Icon';

const sections = [
  { href: '/admin', label: 'Dashboard', icon: 'home' as const },
  { href: '/admin/books', label: 'Books', icon: 'books' as const },
  { href: '/admin/audio', label: 'Audio', icon: 'audio' as const },
  { href: '/admin/ulama', label: 'Ulama', icon: 'scholar' as const },
  { href: '/admin/categories', label: 'Categories', icon: 'categories' as const },
  { href: '/admin/reports', label: 'Reports', icon: 'search' as const },
  { href: '/admin/comments', label: 'Comments', icon: 'search' as const },
  { href: '/admin/announcements', label: 'Announcements', icon: 'audio' as const },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = await getIsAdmin();
  if (!isAdmin) redirect('/login');

  return <div className="page-enter grid gap-6 lg:grid-cols-[210px_1fr]">
    <aside className="surface h-fit p-3 lg:sticky lg:top-24"><div className="px-3 py-2"><p className="eyebrow">Control centre</p><h1 className="mt-1 text-lg font-extrabold text-navy">Admin</h1></div><nav className="mt-3 grid grid-cols-2 gap-1 lg:block" aria-label="Admin navigation">{sections.map((s) => <Link key={s.href} href={s.href} className="group flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-ink/60 transition hover:bg-blue-50 hover:text-blue-700"><Icon name={s.icon} size={15} className="text-ink/35 group-hover:text-blue-600" />{s.label}</Link>)}</nav><div className="mt-4 border-t border-line pt-3"><SignOutButton /></div></aside>
    <section className="min-w-0">{children}</section>
  </div>;
}
