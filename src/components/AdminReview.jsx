import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const ago = iso => {
  const s = Math.max(1, (Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s/60)}m`; if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
};

function parseReview(raw='', review={}) {
  const lines=String(raw).split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const take=(rx)=>{const i=lines.findIndex(x=>rx.test(x));if(i<0)return null;const line=lines.splice(i,1)[0];return line.match(rx)};
  const titleMatch=take(/^🎬\s*(.+?)(?:\s*-\s*Review)?$/i);
  const ratingMatch=take(/^My Rating\s*✨?\s*:\s*([\d.]+)\s*\/\s*10\s*⭐?\s*(?:\((.*?)\))?/i);
  const platformMatch=take(/^📺\s*Platform\s*:\s*(.+)/i);
  const guidanceMatch=take(/^⚠️\s*Parental Guidance\s*:\s*(.+)/i);
  const overallMatch=take(/^🔥\s*Overall\s+(.+?)\s+Rating\s*:\s*([\d.]+)\s*\/\s*10\s*⭐?\s*(?:\((.*?)\))?/i);
  return {title:titleMatch?.[1], paragraphs:lines, rating:review.rating||ratingMatch?.[1], ratingNote:ratingMatch?.[2], platform:review.platform||platformMatch?.[1], guidance:review.parental_guidance||guidanceMatch?.[1], overall:overallMatch&&{label:`Overall ${overallMatch[1]} Rating`,score:overallMatch[2],note:overallMatch[3]}};
}

export default function AdminReview({ movieId, fallback, isLoggedIn, onLogin }) {
  const [data, setData] = useState(null); const [busy, setBusy] = useState(false);
  const [text, setText] = useState(''); const [sort, setSort] = useState('top'); const [notice, setNotice] = useState('');
  const load = () => api(`/api/admin-reviews/${movieId}/community?sort=${sort}`).then(setData).catch(() => setData({ review:null, comments:[] }));
  useEffect(() => { load(); }, [movieId, sort]);
  const act = async (path, body={}) => { if(!isLoggedIn){setNotice('Like ya comment karne ke liye Google login karo.');return} setBusy(true); setNotice(''); try { await api(path,{method:'POST',body:JSON.stringify(body)},true); await load(); } catch(e){setNotice(e.message)} finally{setBusy(false)} };
  const review = data?.review;
  const formatted = review ? parseReview(review.review_text, review) : null;
  if (!data) return <section className="expert-card skeleton-block" aria-label="Loading expert review"/>;
  if (!review) return fallback ? <section className="ai-review"><span>✦ CINE·MOOD AI</span><p>{fallback.review}</p></section> : null;
  return <section className="expert-card">
    <div className="expert-kicker"><span className="crown">S</span><div><small>OFFICIAL CINE·MOOD EDITORIAL</small><h3>{(review.admin_name || 'Scapegoat').toUpperCase()}’S VERDICT</h3></div><b className="verified">✓ VERIFIED</b></div>
    <div className="expert-article">{formatted.title&&<h4>🎬 {formatted.title}</h4>}{formatted.paragraphs.map((p,i)=><p key={i}>{p}</p>)}</div>
    <div className="review-facts">
      <div className="rating-fact"><small>MY RATING</small><strong>{formatted.rating ? `${formatted.rating}/10` : 'EDITOR’S PICK'}</strong>{formatted.ratingNote&&<span>{formatted.ratingNote}</span>}</div>
      {formatted.platform&&<div><small>WHERE TO WATCH</small><b>📺 {formatted.platform}</b></div>}
      {formatted.guidance&&<div className="guidance-fact"><small>PARENTAL GUIDANCE</small><b>⚠️ {formatted.guidance}</b></div>}
      {formatted.overall&&<div className="overall-fact"><small>{formatted.overall.label}</small><strong>{formatted.overall.score}/10 ⭐</strong>{formatted.overall.note&&<span>{formatted.overall.note}</span>}</div>}
    </div>
    <div className="verdict-row">{review.verdict&&<span>{review.verdict}</span>}</div>
    <div className="engagement">
      <button className={data.viewerLiked ? 'liked':''} disabled={busy} onClick={()=>act(`/api/admin-reviews/${review.id}/like`)}>♥ <b>{data.likeCount}</b> Helpful</button>
      <span>◌ <b>{data.comments.length}</b> Comments</span>
      <small>Updated {ago(review.updated_at)}</small>
    </div>
    <div className="comment-head"><h4>Community discussion</h4><div><button className={sort==='top'?'on':''} onClick={()=>setSort('top')}>Top</button><button className={sort==='new'?'on':''} onClick={()=>setSort('new')}>Newest</button></div></div>
    {isLoggedIn ? <form className="comment-form" onSubmit={e=>{e.preventDefault();if(text.trim()){act(`/api/admin-reviews/${review.id}/comments`,{text});setText('')}}}>
      <span className="mini-avatar">U</span><input value={text} maxLength="500" onChange={e=>setText(e.target.value)} placeholder="Add your take…"/><button disabled={busy||!text.trim()}>Post</button>
    </form> : <div className="login-wall"><div><b>Join the discussion</b><small>Reviews padh sakte ho. Like aur comment ke liye login required hai.</small></div><button onClick={onLogin}>Continue with Google</button></div>}
    {notice && <p className="notice">{notice} {!isLoggedIn&&<button className="inline-login" onClick={onLogin}>Login</button>}</p>}
    <div className="comments">{data.comments.map(c=><article className={c.is_pinned?'pinned':''} key={c.id}>
      <span className="mini-avatar">{(c.display_name||'G')[0].toUpperCase()}</span><div><header><b>{c.display_name||'Guest'}</b>{!c.is_guest&&<i>✓</i>}<small>{ago(c.created_at)}</small>{c.is_pinned&&<em>PINNED</em>}</header><p>{c.comment_text}</p><button className={c.viewer_liked?'liked':''} onClick={()=>act(`/api/comments/${c.id}/like`)}>♥ {c.like_count||0}</button></div>
    </article>)}</div>
  </section>;
}
