'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type Props = { reviewId: string; initialCount: number; initialLiked: boolean; authed: boolean; label?: string };

export default function LikeButton({ reviewId, initialCount, initialLiked, authed, label }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  async function toggle() {
    if (!authed) {
      router.push(`/login?next=${encodeURIComponent(pathname || '/')}`);
      return;
    }
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      const res = await fetch(`/api/reviews/${reviewId}/like`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
    } catch {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-sm btn-ghost rv-agree"
      onClick={toggle}
      disabled={busy}
      data-on={liked}
      aria-pressed={liked}
      aria-label={label ? `${label} — ${count}` : undefined}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.9"
        style={{ color: liked ? 'var(--accent)' : undefined }}
        aria-hidden="true"
      >
        <path d="M12 20s-7-4.3-7-9.2A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.8C19 15.7 12 20 12 20z" />
      </svg>
      {label ? <span className="rv-agree-label" style={{ color: liked ? 'var(--accent)' : undefined }}>{label}</span> : null}
      <span style={{ color: liked ? 'var(--accent)' : undefined }}>{count}</span>
    </button>
  );
}
