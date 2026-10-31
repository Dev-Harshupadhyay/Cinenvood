'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Candidate = { key: string; title: string; channel: string; thumbnail: string | null; likelyOfficial?: boolean };
type Props = { titleId: string; titleName?: string; year?: number; trailerEn?: string | null; trailerHi?: string | null };

export default function TrailerForm({ titleId, titleName = '', year, trailerEn, trailerHi }: Props) {
  const router = useRouter();
  const [en, setEn] = useState(trailerEn ?? '');
  const [hi, setHi] = useState(trailerHi ?? '');
  const [candidates, setCandidates] = useState<{ en: Candidate[]; hi: Candidate[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/title-trailer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ titleId, trailerEn: en || null, trailerHi: hi || null })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not save trailers');
      setMsg('Saved ✓');
      setCandidates(null);
      router.refresh();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Could not save trailers');
    } finally {
      setSaving(false);
    }
  }

  async function searchYouTube() {
    setSaving(true);
    setMsg(null);
    setCandidates(null);
    try {
      const res = await fetch('/api/admin/trailer-fetch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ titleId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'YouTube search failed');
      setCandidates({ en: json.en ?? [], hi: json.hi ?? [] });
      const warnings = Array.isArray(json.warnings) ? json.warnings.filter((warning: unknown): warning is string => typeof warning === 'string') : [];
      if (!(json.en?.length || json.hi?.length)) setMsg('No embeddable results found. Use the YouTube search link below or paste a video URL/key.');
      else setMsg(warnings.length ? `${warnings.join(' ')} Choose from the results that loaded, then press Save.` : 'Choose the official trailer you want, then press Save.');
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'YouTube search failed');
    } finally {
      setSaving(false);
    }
  }

  const manualSearchUrl = titleName
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${titleName} ${year ?? ''} official trailer`)}`
    : null;

  function CandidateList({ label, items, onPick, selected }: { label: string; items: Candidate[]; onPick: (key: string) => void; selected: string }) {
    if (!items.length) return <div className="trailer-no-results">No {label} candidates</div>;
    return (
      <div className="trailer-candidates-group">
        <div className="trailer-candidates-label">{label} · choose one</div>
        <div className="trailer-candidates">
          {items.map((item) => (
            <button key={item.key} type="button" className="trailer-candidate" data-selected={selected === item.key} onClick={() => onPick(item.key)}>
              {item.thumbnail ? <img src={item.thumbnail} alt="" loading="lazy" /> : <span className="trailer-thumb-fallback">▶</span>}
              <span><b>{item.title}</b><small>{item.channel}{item.likelyOfficial ? ' · likely official' : ''}</small></span>
              <span className="trailer-select" aria-hidden="true">{selected === item.key ? '✓' : '+'}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="trailer-form">
      <div className="trailer-inputs">
        <label><span>English video ID / URL</span><input className="input" placeholder="Paste YouTube URL or video ID" value={en} onChange={(e) => setEn(e.target.value)} /></label>
        <label><span>Hindi video ID / URL</span><input className="input" placeholder="Optional · Hindi trailer" value={hi} onChange={(e) => setHi(e.target.value)} /></label>
      </div>
      <div className="trailer-form-actions">
        <button type="button" className="btn btn-sm btn-primary" onClick={save} disabled={saving}>{saving ? 'Working…' : 'Save trailers'}</button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={searchYouTube} disabled={saving}>Search YouTube API</button>
        {manualSearchUrl ? <a className="link-more" href={manualSearchUrl} target="_blank" rel="noreferrer">Open YouTube search ↗</a> : null}
        {en || hi ? <a className="link-more" href={`https://www.youtube.com/watch?v=${en || hi}`} target="_blank" rel="noreferrer">Preview ↗</a> : null}
        {msg ? <span className="trailer-message" role="status">{msg}</span> : null}
      </div>
      {candidates ? (
        <div className="trailer-results">
          <CandidateList label="English" items={candidates.en} selected={en} onPick={setEn} />
          <CandidateList label="Hindi" items={candidates.hi} selected={hi} onPick={setHi} />
        </div>
      ) : null}
    </div>
  );
}
