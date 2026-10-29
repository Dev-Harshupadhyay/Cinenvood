'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await signIn('admin-password', { email: email.trim(), password, redirect: false });
      if (res?.error) {
        setErr('Email ya password galat hai — dobara check karke try karo.');
        setLoading(false);
        return;
      }
      if (res?.ok) {
        window.location.assign('/admin');
        return;
      }
      setErr('Login nahi ho paya. Dobara try karo.');
    } catch {
      setErr('Login nahi ho paya. Thodi der baad try karo.');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="admin-login-form">
      <div className="field">
        <label htmlFor="admin-email">Admin email</label>
        <input
          id="admin-email"
          className="input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Configured admin email"
          autoComplete="username"
          autoCapitalize="none"
        />
      </div>
      <div className="field">
        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          className="input"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter admin password"
          autoComplete="current-password"
        />
      </div>
      {err ? <div className="notice notice-warn" role="alert">{err}</div> : null}
      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? 'Checking credentials…' : 'Unlock admin panel'}
        {!loading ? <span aria-hidden="true">→</span> : null}
      </button>
      <p className="admin-login-hint">Member sign-in stays on Google. This password form is for the admin only.</p>
    </form>
  );
}
