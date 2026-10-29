'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type TitleOption = { id: string; title: string; year: number };
type EditorialRow = {
  id: string;
  rating: number;
  headline: string | null;
  body: string;
  headlineEn: string | null;
  bodyEn: string | null;
  featured: boolean;
  titleId: string;
  titleName: string;
  year: number;
};

const empty = { headline: '', body: '', headlineEn: '', bodyEn: '', rating: 7, titleId: '', featured: false };

export default function EditorialEditor({ titles, rows }: { titles: TitleOption[]; rows: EditorialRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ ...empty });
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [drafting, setDrafting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? titles.filter((t) => t.title.toLowerCase().includes(q)) : titles;
    return list.slice(0, 60);
  }, [titles, query]);

  async function submit(action: 'create' | 'update') {
    setMessage(null);
    const payload: Record<string, unknown> = {
      action,
      rating: Number(form.rating),
      headline: form.headline,
      body: form.body,
      headlineEn: form.headlineEn,
      bodyEn: form.bodyEn,
      featured: form.featured
    };
    if (action === 'update') payload.id = editing;
    else payload.titleId = form.titleId;

    const res = await fetch('/api/admin/editorial', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(json.error ?? 'Save failed');
    setMessage(action === 'create' ? 'Editorial published ✅' : 'Updated ✅');
    if (action === 'create') setForm({ ...empty });
    setEditing(null);
    start(() => router.refresh());
  }

  async function remove(id: string) {
    if (!confirm('Delete this editorial review?')) return;
    const res = await fetch('/api/admin/editorial', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    });
    if (res.ok) start(() => router.refresh());
  }

  /** Gemini drafts the review in the house voice — Hinglish + English in one go. */
  async function aiDraft() {
    if (!form.titleId) return setMessage('Pehle title chuno');
    setDrafting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/ghostwrite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ titleId: form.titleId, notes, rating: Number(form.rating) || undefined })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Draft failed');
      const d = json.draft;
      setForm((f) => ({
        ...f,
        rating: d.rating,
        headline: d.headlineHi ?? '',
        body: d.bodyHi ?? '',
        headlineEn: d.headlineEn ?? '',
        bodyEn: d.bodyEn ?? ''
      }));
      setMessage('Draft ready — padho, edit karo, phir Publish dabao');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Draft failed');
    } finally {
      setDrafting(false);
    }
  }

  function edit(row: EditorialRow) {
    setEditing(row.id);
    setForm({
      titleId: row.titleId,
      rating: row.rating,
      headline: row.headline ?? '',
      body: row.body,
      headlineEn: row.headlineEn ?? '',
      bodyEn: row.bodyEn ?? '',
      featured: row.featured
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="panel">
        <div className="panel-title">
          <span>{editing ? 'Edit editorial verdict' : 'New editorial verdict'}</span>
          <span className="faint mono" style={{ fontSize: 10 }}>no user account · byline CiNEMAsFLiX</span>
        </div>

        {!editing ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <input className="input" placeholder="Search a title…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="input" value={form.titleId} onChange={(e) => setForm({ ...form, titleId: e.target.value })}>
              <option value="">Select title…</option>
              {filtered.map((t) => (
                <option key={t.id} value={t.id}>{t.title} ({t.year})</option>
              ))}
            </select>

            <div className="field" style={{ margin: 0 }}>
              <label>Notes for the AI draft (optional)</label>
              <input
                className="input"
                value={notes}
                maxLength={400}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. theatre mein dekhi, 3D show — villain weak tha"
              />
            </div>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={aiDraft}
              disabled={drafting || !form.titleId}
              style={{ justifySelf: 'start' }}
            >
              {drafting ? 'Drafting…' : '✍︎ AI draft — Hinglish + English'}
            </button>
          </div>
        ) : null}

        <div className="form-row" style={{ marginTop: 10 }}>
          <div className="field">
            <label>Rating (1–10)</label>
            <input className="input" type="number" min={1} max={10} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>Headline (Hinglish)</label>
            <input className="input" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="7/10 (Go For It)" />
          </div>
        </div>

        <div className="field">
          <label>Body (Hinglish)</label>
          <textarea className="input" rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>

        <div className="field">
          <label>Headline (English edition)</label>
          <input className="input" value={form.headlineEn} onChange={(e) => setForm({ ...form, headlineEn: e.target.value })} placeholder="A lean, mean zombie ride" />
        </div>

        <div className="field">
          <label>Body (English edition) — international visitors ko yahi dikhega</label>
          <textarea className="input" rows={6} value={form.bodyEn} onChange={(e) => setForm({ ...form, bodyEn: e.target.value })} />
        </div>

        <label className="check">
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
          Pin as verdict
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" disabled={pending} onClick={() => submit(editing ? 'update' : 'create')}>
            {editing ? 'Save changes' : 'Publish editorial'}
          </button>
          {editing ? (
            <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm({ ...empty }); }}>
              Cancel
            </button>
          ) : null}
          {message ? <span className="form-note" style={{ alignSelf: 'center' }}>{message}</span> : null}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title"><span>Editorial verdicts · {rows.length}</span></div>
        <div className="t-scroll">
          <table className="table">
            <thead><tr><th>Title</th><th>Rating</th><th>Hinglish</th><th>English</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><span className="t-title">{r.titleName}</span><div className="t-sub">{r.year}{r.featured ? ' · pinned' : ''}</div></td>
                  <td className="mono">{r.rating}/10</td>
                  <td className="t-sub">{r.body.slice(0, 46)}…</td>
                  <td className="t-sub">{r.bodyEn ? 'yes' : <span style={{ color: '#c9a24a' }}>missing</span>}</td>
                  <td>
                    <div className="t-actions">
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => edit(r)}>Edit</button>
                      <button type="button" className="btn btn-sm btn-ghost" style={{ color: '#e26d5a' }} onClick={() => remove(r.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
