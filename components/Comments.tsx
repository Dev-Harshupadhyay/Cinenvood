'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { avatarGradient, initials, timeAgo } from '@/lib/format';

type Comment = {
  id: string;
  body: string;
  createdAt: string | Date;
  user: { id: string; name: string | null; email: string; image: string | null };
};

export default function Comments({
  reviewId,
  initial,
  authed,
  me
}: {
  reviewId: string;
  initial: Comment[];
  authed: boolean;
  me: { name: string | null; email: string } | null;
}) {
  const pathname = usePathname();
  const [items, setItems] = useState<Comment[]>(initial);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/reviews/${reviewId}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not post comment');
      setItems((prev) => [...prev, data.comment]);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="panel-title" style={{ marginBottom: 6 }}>
        <span>Comments · {items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="faint" style={{ fontSize: 13, padding: '10px 0 14px' }}>
          No comments yet — pehla thought tumhara ho sakta hai.
        </p>
      ) : (
        items.map((c) => (
          <div className="comment" key={c.id}>
            <span className="avatar" style={{ background: avatarGradient(c.user.email) }}>
              {c.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.user.image} alt="" />
              ) : (
                initials(c.user.name ?? c.user.email)
              )}
            </span>
            <div>
              <div className="c-meta">
                <b>{c.user.name ?? 'Member'}</b>
                {timeAgo(c.createdAt)}
              </div>
              <p className="c-body">{c.body}</p>
            </div>
          </div>
        ))
      )}

      {authed ? (
        <form onSubmit={submit} style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={text}
              maxLength={600}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Reply as ${me?.name ?? 'you'}…`}
              aria-label="Write a comment"
            />
            <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
              Post
            </button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      ) : (
        <a href={`/login?next=${encodeURIComponent(pathname || '/')}`} className="btn btn-sm btn-primary" style={{ marginTop: 12 }}>
          Sign in with Google to comment
        </a>
      )}
    </div>
  );
}
