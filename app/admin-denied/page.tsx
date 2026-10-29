import Link from 'next/link';

export const metadata = { title: 'Admin access', robots: { index: false, follow: false } };

export default async function AdminDenied({
  searchParams
}: {
  searchParams: Promise<{ email?: string; admin?: string }>;
}) {
  const { email = '', admin = '' } = await searchParams;
  const matches = email && admin && email.toLowerCase() === admin.toLowerCase();

  return (
    <div className="container auth-wrap">
      <div className="auth-card">
        <div className="eyebrow">403 · admin only</div>
        <h1>{matches ? 'Admin role assign karo' : 'Ye area admin ke liye hai'}</h1>
        <p className="auth-sub">
          Tum <b>{email || 'signed-in account'}</b> se login ho. Admin panel sirf us account ko milta hai jiski email{' '}
          <code className="mono">ADMIN_EMAIL</code> env var se match karti hai.
          {admin ? (
            <>
              {' '}Abhi configured admin: <code className="mono">{admin}</code>.
            </>
          ) : null}
        </p>

        {matches ? (
          <div className="notice notice-warn">
            Email match kar rahi hai lekin DB role <b>ADMIN</b> nahi hai. Ek baar logout → login karo; sign-in par role sync hota hai.
            Phir bhi na chale to Supabase mein <code className="mono">cinemood.&quot;User&quot;.role</code> ko{' '}
            <code className="mono">ADMIN</code> kar do.
          </div>
        ) : (
          <div className="notice">
            Fix: Vercel → Settings → Environment Variables → <code className="mono">ADMIN_EMAIL</code> mein apna Gmail daalo →
            Redeploy (build cache unchecked) → us Gmail se Google login.
          </div>
        )}

        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          <Link href="/dashboard" className="btn btn-primary btn-block">
            My dashboard
          </Link>
          <Link href="/" className="btn btn-ghost btn-block">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
