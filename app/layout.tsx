import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Maktaba — Islamic Audio & PDF Library',
  description: 'A Pashto, Urdu and English library of Islamic audio lectures and books.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <NavBar />
        <main className="mx-auto max-w-6xl px-5 pb-24 pt-8">{children}</main>
      </body>
    </html>
  );
}
