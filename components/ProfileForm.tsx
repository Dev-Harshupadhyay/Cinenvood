'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { avatarGradient, displayName, initials } from '@/lib/format';

type Props = {
  name: string;
  bio: string;
  image: string | null;
  googleImage: string | null;
  email: string;
};

/** Resize + compress in the browser so a 5 MB phone photo becomes a ~40 KB avatar. */
async function toAvatarDataUrl(file: File, size = 256): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read that image'));
      el.src = url;
    });
    const side = Math.min(img.width, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available');
    ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ProfileForm({ name, bio, image, googleImage, email }: Props) {
  const [n, setN] = useState(name);
  const [b, setB] = useState(bio);
  const [pic, setPic] = useState<string | null>(image);
  const [src, setSrc] = useState<'custom' | 'google' | 'none'>(
    image ? 'custom' : googleImage ? 'google' : 'none'
  );
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const shown = src === 'custom' ? pic : src === 'google' ? googleImage : null;
  const label = displayName(n, email);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    if (!file.type.startsWith('image/')) {
      setErr('Sirf image file chuno (jpg / png / webp)');
      return;
    }
    try {
      const data = await toAvatarDataUrl(file);
      if (data.length > 200_000) {
        setErr('Photo bahut badi hai — chhoti image try karo');
        return;
      }
      setPic(data);
      setSrc('custom');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Photo read nahi hui');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // 'google' → server falls back to the Google picture, 'none' → initials only
        body: JSON.stringify({ name: n, bio: b, image: src === 'custom' ? pic : src === 'google' ? null : '' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save');
      setPic(data.image ?? null);
      setSrc(data.image ? 'custom' : 'none');
      setMsg('Saved ✓');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }


  return (
    <form className="panel profile-panel" onSubmit={save}>
      <div className="panel-title">
        <span>Profile</span>
        {msg ? <span style={{ color: 'var(--accent)', letterSpacing: 0 }}>{msg}</span> : null}
      </div>

      {/* ── photo ─────────────────────────────────────────────── */}
      <div className="pf-photo">
        <span className="pf-avatar" style={{ background: avatarGradient(email) }}>
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" />
          ) : (
            initials(label)
          )}
        </span>

        <div className="pf-photo-side">
          <div className="pf-photo-title">{label}</div>
          <div className="pf-photo-src">
            {src === 'custom' ? 'Custom photo' : src === 'google' ? 'Google photo' : 'Initials'} · {email}
          </div>

          <div className="pf-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
              Upload photo
            </button>
            {googleImage ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                data-on={src === 'google'}
                disabled={src === 'google'}
                onClick={() => {
                  setSrc('google');
                  setMsg('');
                  setErr('');
                }}
              >
                Use Google photo
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              data-on={src === 'none'}
              disabled={src === 'none'}
              onClick={() => {
                setSrc('none');
                setMsg('');
                setErr('');
              }}
            >
              Remove photo
            </button>
          </div>

          <p className="pf-hint">
            Photo browser mein 256×256 par resize hoke save hoti hai — koi storage bill nahi. Login karne par bhi aapki
            chuni hui photo rehti hai.
          </p>
        </div>

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>

      <div className="field">
        <label htmlFor="pname">Display name</label>
        <input id="pname" className="input" value={n} maxLength={40} onChange={(e) => setN(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pbio">Bio</label>
        <textarea
          id="pbio"
          className="textarea"
          style={{ minHeight: 84 }}
          value={b}
          maxLength={200}
          onChange={(e) => setB(e.target.value)}
          placeholder="What kind of films do you live for?"
        />
      </div>

      {err ? <p className="form-error">{err}</p> : null}

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
