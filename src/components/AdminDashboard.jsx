import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function AdminDashboard({onClose,onAuthChange}){
 const [loading,setLoading]=useState(true),[authed,setAuthed]=useState(false),[password,setPassword]=useState(''),[error,setError]=useState('');
 useEffect(()=>{api('/api/admin/session').then(d=>{setAuthed(d.authenticated);onAuthChange?.(d.authenticated)}).finally(()=>setLoading(false))},[]);
 const login=async e=>{e.preventDefault();setError('');try{await api('/api/admin/login',{method:'POST',body:JSON.stringify({password})});setAuthed(true);onAuthChange?.(true);onClose()}catch(e){setError(e.message)}};
 const logout=async()=>{await api('/api/admin/logout',{method:'POST'});setAuthed(false);onAuthChange?.(false)};
 return <div className="admin-access" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section><button className="access-close" onClick={onClose}>×</button><div className="access-mark">S</div><small>SCAPEGOAT REVIEW STUDIO</small>{loading?<p>Checking secure session…</p>:authed?<><h2>Admin mode active</h2><p>Koi bhi movie card open karo. Movie details ke andar <b>Write / Edit Review</b> editor automatically dikhega.</p><button className="access-primary" onClick={onClose}>Start reviewing movies →</button><button className="access-logout" onClick={logout}>Sign out admin</button></>:<><h2>Unlock review mode</h2><p>Login ke baad har movie ke andar premium review editor milega.</p><form onSubmit={login}><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Admin password" autoFocus/><button>Unlock review mode →</button></form>{error&&<b className="access-error">{error}</b>}</>}</section></div>
}
