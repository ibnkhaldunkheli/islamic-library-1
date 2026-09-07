'use client';

import { useEffect, useRef, useState } from 'react';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ src, title }: { src: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onLoaded = () => setDuration(el.duration);
    const onEnded = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('ended', onEnded);
    };
  }, []);

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
    <div className="card flex flex-col gap-3 p-5">
      <audio ref={audioRef} src={src} preload="metadata" />
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
    </div>
  );
}
