'use client';

import { useEffect, useState } from 'react';
import { getSavedIds, toggleSaved } from '@/lib/saved';
import { getSavedIdsCloud, toggleSavedCloud } from '@/lib/cloudSaved';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { createClient } from '@/lib/supabase/client';

export default function SaveButton({
  itemType,
  itemId,
}: {
  itemType: 'book' | 'audio';
  itemId: string;
}) {
  const { user } = useCurrentUser();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Signed-in visitors get the cloud-synced favorite state; everyone
    // else keeps the existing on-device behavior unchanged (see
    // lib/saved.ts — no account has ever been required for this).
    if (user) {
      getSavedIdsCloud(createClient(), user.id, itemType).then((ids) => setSaved(ids.includes(itemId)));
    } else {
      setSaved(getSavedIds(itemType).includes(itemId));
    }
  }, [itemType, itemId, user]);

  return (
    <button
      type="button"
      aria-label={saved ? 'Remove from saved' : 'Save for later'}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (user) {
          const next = await toggleSavedCloud(createClient(), user.id, itemType, itemId);
          setSaved(next);
        } else {
          const next = toggleSaved(itemType, itemId);
          setSaved(next);
        }
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
