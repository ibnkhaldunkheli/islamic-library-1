'use client';

import { useEffect, useRef, useState } from 'react';
import { getProgress, setProgress, clearProgress } from '@/lib/progress';
import { getProgressCloud, setProgressCloud } from '@/lib/cloudProgress';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { createClient } from '@/lib/supabase/client';
import { getOfflineBlob } from '@/lib/offlineStore';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({
  src,
  title,
  lectureId,
}: {
  src: string;
  title: string;
  // Optional: when provided, the player remembers playback position on
  // this device (same on-device approach as "Saved") and resumes there
  // next time, powering the "Continue listening" section on the home page.
  lectureId?: string;
}) {
  const { user } = useCurrentUser();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const lastSavedRef = useRef(0);
  // Holds the resolved cloud position once fetched (see the effect below),
  // so the synchronous 'loadedmetadata' handler can read it without
  // itself needing to be async.
  const cloudProgressRef = useRef<number | undefined>(undefined);
  // The URL actually handed to the <audio> element: the normal network
  // src by default, swapped for an on-device blob: URL when this lecture
  // has been downloaded for offline use (see lib/offlineStore.ts).
  const [effectiveSrc, setEffectiveSrc] = useState(src);

  const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

  // Check for an offline copy whenever the lecture changes, and use it
  // instead of the network URL when present. Revokes the previous blob:
  // URL on cleanup so it doesn't leak — this is a pure addition; anyone
  // without a downloaded copy sees no change in behavior at all.
  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    setEffectiveSrc(src);
    if (lectureId) {
      getOfflineBlob('audio', lectureId).then((blob) => {
        if (cancelled || !blob) return;
        createdUrl = URL.createObjectURL(blob);
        setEffectiveSrc(createdUrl);
      });
    }
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [lectureId, src]);

  // Pre-fetch the signed-in visitor's cloud position as soon as we know
  // who they are, ahead of the audio element's own 'loadedmetadata' event.
  // If metadata already loaded before this resolves (rare, cloud fetch is
  // usually faster than an audio download), it seeks immediately instead
  // of waiting for a future load.
  useEffect(() => {
    if (!user || !lectureId) return;
    let cancelled = false;
    getProgressCloud(createClient(), user.id, 'audio', lectureId).then((value) => {
      if (cancelled) return;
      cloudProgressRef.current = value;
      const el = audioRef.current;
      if (el && value && Number.isFinite(value) && value > 0 && el.duration && value < el.duration - 2 && el.currentTime === 0) {
        el.currentTime = value;
        setCurrent(value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, lectureId]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      setCurrent(el.currentTime);
      // Save at most every 5s while playing, so we're not hitting
      // localStorage/the database on every timeupdate tick (which fires
      // very often). Local storage is always written as an offline-first
      // cache; the account sync additionally happens when signed in.
      if (lectureId && el.currentTime - lastSavedRef.current >= 5) {
        lastSavedRef.current = el.currentTime;
        setProgress('audio', lectureId, el.currentTime);
        if (user) setProgressCloud(createClient(), user.id, 'audio', lectureId, el.currentTime);
      }
    };
    const onLoaded = () => {
      setDuration(el.duration);
      const saved = lectureId ? (user ? cloudProgressRef.current : getProgress('audio', lectureId)) : undefined;
      if (saved && Number.isFinite(saved) && saved > 0 && saved < el.duration - 2) {
        el.currentTime = saved;
        setCurrent(saved);
      }
    };
    const onEnded = () => {
      setPlaying(false);
      if (lectureId) clearProgress('audio', lectureId);
    };
    const onPause = () => {
      if (lectureId && el.currentTime > 0) {
        setProgress('audio', lectureId, el.currentTime);
        if (user) setProgressCloud(createClient(), user.id, 'audio', lectureId, el.currentTime);
      }
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('ended', onEnded);
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('pause', onPause);
    };
  }, [lectureId, user]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play();
    }
    setPlaying(!playing);
  };

  const skip = (delta: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(el.currentTime + delta, 0), duration || 0);
  };

  const seekTo = (value: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = value;
    setCurrent(value);
  };

  return (
    <div
      className="card flex flex-col gap-3 p-5"
      tabIndex={0}
      role="group"
      aria-label={`Audio player: ${title}`}
      onKeyDown={(e) => {
        // Basic keyboard controls for desktop users, scoped to this
        // player (not a global window listener, so it never hijacks
        // typing in unrelated inputs elsewhere on the page).
        if (e.key === ' ') {
          e.preventDefault();
          togglePlay();
        } else if (e.key === 'ArrowRight') {
          skip(5);
        } else if (e.key === 'ArrowLeft') {
          skip(-5);
        }
      }}
    >
      <audio ref={audioRef} src={effectiveSrc} preload="metadata" />
      <p className="text-sm font-medium text-ink">{title}</p>

      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={current}
        onChange={(e) => seekTo(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-emerald-100 accent-emerald-600"
      />
      <div className="flex justify-between text-xs text-ink/50">
        <span>{formatTime(current)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label="Back 15 seconds"
          onClick={() => skip(-15)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line hover:bg-emerald-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 4 4 9l5 5" />
            <path d="M4 9h9a7 7 0 1 1-6.5 9.5" />
          </svg>
        </button>

        <button
          type="button"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={togglePlay}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {playing ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          aria-label="Forward 15 seconds"
          onClick={() => skip(15)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line hover:bg-emerald-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m15 4 5 5-5 5" />
            <path d="M20 9h-9a7 7 0 1 0 6.5 9.5" />
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              speed === s ? 'bg-emerald-600 text-white' : 'text-ink/50 hover:bg-emerald-50'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
