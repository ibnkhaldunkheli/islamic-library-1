'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Announcement } from '@/lib/types';

const DISMISSED_KEY = 'maktaba:dismissed-announcements';

function getDismissed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

// Renders the single most recent active announcement, dismissible per
// visitor (stored in localStorage, same on-device approach as
// lib/saved.ts — no account needed). Receives the already-fetched active
// announcement from the server layout so this stays a small client island
// instead of the whole layout needing to be a client component.
export default function AnnouncementBanner({ announcement }: { announcement: Announcement }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(getDismissed().includes(announcement.id));
  }, [announcement.id]);

  if (dismissed) return null;

  const dismiss = () => {
    const next = [...getDismissed(), announcement.id];
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    setDismissed(true);
  };

  const content = (
    <p className="text-sm font-medium text-emerald-800" dir="auto">
      {announcement.message}
    </p>
  );

  return (
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 bg-emerald-50 px-5 py-2.5">
      {announcement.link ? (
        <Link href={announcement.link} className="hover:underline">
          {content}
        </Link>
      ) : (
        content
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="shrink-0 text-emerald-700/60 hover:text-emerald-800"
      >
        ✕
      </button>
    </div>
  );
}
