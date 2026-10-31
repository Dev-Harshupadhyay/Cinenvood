'use client';

import { useEffect, useRef, useState } from 'react';

type PlayerErrorEvent = { data: number };
type Player = { destroy: () => void };
type PlayerEvents = {
  onReady?: () => void;
  onError?: (event: PlayerErrorEvent) => void;
};
type PlayerOptions = {
  videoId: string;
  host: string;
  playerVars: { autoplay: 0 | 1; playsinline: 0 | 1; rel: 0 | 1; origin: string };
  events: PlayerEvents;
};
type YouTubeApi = { Player: new (element: HTMLElement, options: PlayerOptions) => Player };

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeApi> | null = null;

function loadPlayerApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('YouTube player API timed out')), 15_000);
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try { previousCallback?.(); } catch { /* preserve the API callback even if another listener fails */ }
      if (!window.YT?.Player) {
        window.clearTimeout(timeout);
        reject(new Error('YouTube player API did not initialize'));
        return;
      }
      window.clearTimeout(timeout);
      resolve(window.YT);
    };

    const script = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (!script) {
      const element = document.createElement('script');
      element.src = 'https://www.youtube.com/iframe_api';
      element.async = true;
      element.addEventListener('error', () => {
        window.clearTimeout(timeout);
        reject(new Error('Could not load YouTube player API'));
      }, { once: true });
      document.head.appendChild(element);
    }
  }).catch((error: unknown) => {
    apiPromise = null;
    throw error;
  });

  return apiPromise;
}

export default function YouTubePlayer({ videoId, title, fallbackUrl }: {
  videoId: string;
  title: string;
  fallbackUrl: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let disposed = false;
    let player: Player | null = null;
    setError(false);

    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      setError(true);
      return;
    }

    void loadPlayerApi().then((api) => {
      if (disposed || !mountRef.current) return;
      player = new api.Player(mountRef.current, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin
        },
        events: {
          onError: () => { if (!disposed) setError(true); }
        }
      });
    }).catch(() => {
      if (!disposed) setError(true);
    });

    return () => {
      disposed = true;
      player?.destroy();
    };
  }, [videoId]);

  return (
    <>
      <div ref={mountRef} aria-label={`${title} YouTube player`} />
      {error ? (
        <div className="empty" role="status">
          <b>Trailer playback unavailable</b>
          This video may be restricted or the YouTube player could not load.
          <a href={fallbackUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">Open YouTube search ↗</a>
        </div>
      ) : null}
    </>
  );
}
