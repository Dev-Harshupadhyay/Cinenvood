import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AdminLoginForm from '@/components/AdminLoginForm';

export const metadata = { title: 'Admin login', robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const session = await auth();
  if (session?.user?.adminPasswordLogin && session.user.role === 'ADMIN') redirect('/admin');

  return (
    <div className="container auth-wrap">
      <div className="auth-card admin-login-card">
        <div className="admin-login-mark" aria-hidden="true">✦</div>
        <div className="eyebrow">Private control room</div>
        <h1>CINE·MOOD Admin</h1>
        <p className="auth-sub">
          Admin access uses a separate password sign-in. Member Google sessions do not unlock this panel.
        </p>
        {denied ? (
          <div className="notice notice-warn" style={{ marginBottom: 16 }}>
            Google/member account admin nahi hai. Neeche configured admin email aur password use karo.
          </div>
        ) : null}
        <AdminLoginForm />
        <div className="admin-login-foot">
          <span>Protected · Admin-only</span>
          <Link href="/">Back to CINE·MOOD</Link>
        </div>
      </div>
    </div>
  );
}
