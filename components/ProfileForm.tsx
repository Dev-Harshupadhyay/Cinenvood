'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileForm({ name, bio }: { name: string; bio: string }) {
  const [n, setN] = useState(name);
  const [b, setB] = useState(bio);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: n, bio: b })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save');
      setMsg('Saved ✓');
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={save}>
      <div className="panel-title">
        <span>Profile</span>
        {msg ? <span style={{ color: 'var(--accent)', letterSpacing: 0 }}>{msg}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="pname">Display name</label>
        <input id="pname" className="input" value={n} maxLength={40} onChange={(e) => setN(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pbio">Bio</label>
        <textarea id="pbio" className="textarea" style={{ minHeight: 84 }} value={b} maxLength={200} onChange={(e) => setB(e.target.value)} placeholder="What kind of films do you live for?" />
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
