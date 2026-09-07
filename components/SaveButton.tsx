'use client';

import { useEffect, useState } from 'react';
import { getSavedIds, toggleSaved } from '@/lib/saved';

export default function SaveButton({
  itemType,
  itemId,
}: {
  itemType: 'book' | 'audio';
  itemId: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(getSavedIds(itemType).includes(itemId));
  }, [itemType, itemId]);

  return (
    <button
      type="button"
      aria-label={saved ? 'Remove from saved' : 'Save for later'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = toggleSaved(itemType, itemId);
        setSaved(next);
      }}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-emerald-700 shadow-sm ring-1 ring-line hover:bg-emerald-50"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" />
      </svg>
    </button>
  );
}
