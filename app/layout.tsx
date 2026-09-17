import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import { createClient } from '@/lib/supabase/server';
import type { Announcement } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Maktaba — Islamic Audio & PDF Library',
  description: 'A Pashto, Urdu and English library of Islamic audio lectures and books.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Maktaba',
  },
};

export const viewport = {
  themeColor: '#0F5132',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  // Only the single most recent active announcement is shown, to avoid
  // stacking banners. Errors (e.g. migration not yet run on an older
  // deployment) are swallowed so a missing table never breaks the layout.
  const { data } = await supabase
    .from('announcements')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const announcement = (data ?? null) as Announcement | null;

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-paper text-ink min-h-screen font-sans antialiased">
        <ServiceWorkerRegistration />
        {announcement && <AnnouncementBanner announcement={announcement} />}
        <NavBar />
        <main className="mx-auto max-w-6xl px-5 pb-24 pt-8">{children}</main>
      </body>
    </html>
  );
}
