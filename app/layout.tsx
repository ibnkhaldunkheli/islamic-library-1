import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import { AudioProvider } from '@/components/AudioProvider';
import { createClient } from '@/lib/supabase/server';
import type { Announcement } from '@/lib/types';

export const metadata: Metadata = {
  title: { default: 'Maktaba — Islamic Knowledge Library', template: '%s | Maktaba' },
  description: 'A calm, modern library of Islamic books and audio lectures in Arabic, Pashto, Urdu and English.',
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }], apple: '/apple-touch-icon.png' },
  openGraph: { title: 'Maktaba — Islamic Knowledge Library', description: 'Read, listen and continue learning.', type: 'website' },
};

export const viewport = { themeColor: '#0B1F3A', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data } = await supabase.from('announcements').select('*').eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const announcement = (data ?? null) as Announcement | null;
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <ServiceWorkerRegistration />
        {announcement && <AnnouncementBanner announcement={announcement} />}
        <NavBar />
        <AudioProvider><main className="mx-auto min-h-[calc(100vh-72px)] max-w-7xl px-4 pb-28 pt-7 sm:px-6 lg:px-8">{children}</main></AudioProvider>
      </body>
    </html>
  );
}
