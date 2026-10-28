'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type Props = {
  titleId: string;
  authed: boolean;
  initialLike: boolean;
  likes: number;
  initialWatch: boolean;
};

export default function TitleActions({ titleId, authed, initialLike, likes, initialWatch }: Props) {
  const [liked, setLiked] = useState(initialLike);
  const [likeCount, setLikeCount] = useState(likes);
  const [watched, setWatched] = useState(initialWatch);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  async function toggle(kind: 'LIKE' | 'WATCHLIST') {
    if (!authed) {
      router.push(`/login?next=${encodeURIComponent(pathname || '/')}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/titles/${titleId}/like`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind })
      });
      const data = await res.json();
      if (res.ok) {
        if (kind === 'LIKE') {
          setLiked(data.active);
          setLikeCount(data.count);
        } else {
          setWatched(data.active);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button
        type="button"
        className="btn"
        onClick={() => toggle('LIKE')}
        disabled={busy}
        aria-pressed={liked}
        style={liked ? { borderColor: 'color-mix(in srgb, var(--accent) 55%, transparent)', color: 'var(--accent)' } : undefined}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <path d="M12 20s-7-4.3-7-9.2A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.8C19 15.7 12 20 12 20z" />
        </svg>
        {liked ? 'Liked' : 'Like'} · {likeCount}
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => toggle('WATCHLIST')}
        disabled={busy}
        aria-pressed={watched}
        style={watched ? { borderColor: 'color-mix(in srgb, var(--accent) 55%, transparent)', color: 'var(--accent)' } : undefined}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill={watched ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <path d="M6 4h12v16l-6-4-6 4z" />
        </svg>
        {watched ? 'In watchlist' : 'Watchlist'}
      </button>
    </div>
  );
}
