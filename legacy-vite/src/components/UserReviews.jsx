import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function UserReviews({movie,isLoggedIn,onLogin}){
 const [rows,setRows]=useState([]),[text,setText]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const load=()=>api(`/api/user-reviews/${movie.id}`).then(d=>setRows(d.reviews||[])).catch(()=>setRows([]));
 useEffect(()=>{load()},[movie.id,isLoggedIn]);
 const post=async e=>{e.preventDefault();if(!isLoggedIn)return onLogin();setBusy(true);try{await api('/api/user-reviews',{method:'POST',body:JSON.stringify({movieId:movie.id,movieTitle:movie.title,text})},true);setText('');setNotice('Review published');await load()}catch(e){setNotice(e.message)}finally{setBusy(false)}};
 const like=async id=>{if(!isLoggedIn)return onLogin();try{await api(`/api/user-reviews/${id}/like`,{method:'POST'},true);await load()}catch(e){setNotice(e.message)}};
 return <section className="user-reviews"><header><div><small>VIEWER REVIEWS</small><h3>What the community says</h3></div><b>{rows.length}</b></header>
  {isLoggedIn?<form onSubmit={post}><textarea maxLength="500" value={text} onChange={e=>setText(e.target.value)} placeholder="Write a spoiler-free review…"/><div><small>{text.length}/500</small><button disabled={busy||!text.trim()}>Publish review</button></div></form>:<div className="login-wall"><div><b>Want to write a review?</b><small>Guest users can read. Google login is required to review or like.</small></div><button onClick={onLogin}>Continue with Google</button></div>}
  {notice&&<p className="notice">{notice}</p>}
  <div className="review-list">{rows.length?rows.map(r=><article key={r.id}><span className="mini-avatar">{(r.user_name||'U')[0]}</span><div><header><b>{r.user_name}</b><small>{new Date(r.created_at).toLocaleDateString()}</small></header><p>{r.review_text}</p><button className={r.viewer_liked?'liked':''} onClick={()=>like(r.id)}>♥ {r.like_count||0} Helpful</button></div></article>):<p className="empty-copy">No viewer review yet. Login karke first review likho.</p>}</div>
 </section>
}
