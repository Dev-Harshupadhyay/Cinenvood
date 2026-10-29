import Link from 'next/link';

export const metadata = { title: 'Admin sign-in required', robots: { index: false, follow: false } };

export default function AdminDenied() {
  return (
    <div className="container auth-wrap">
      <div className="auth-card">
        <div className="eyebrow">403 · private control room</div>
        <h1>Admin sign-in required</h1>
        <p className="auth-sub">
          A regular Google/member session does not grant admin access. Use the separate password sign-in to open the control room.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          <Link href="/admin/login" className="btn btn-primary btn-block">Go to admin login →</Link>
          <Link href="/dashboard" className="btn btn-ghost btn-block">My member dashboard</Link>
        </div>
      </div>
    </div>
  );
}
