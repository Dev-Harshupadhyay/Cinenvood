import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, isGoogleEnabled, signIn } from '@/auth';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = '/dashboard' } = await searchParams;
  const session = await auth();
  if (session?.user) redirect(next);

  async function googleAction() {
    'use server';
    await signIn('google', { redirectTo: next });
  }

  async function demoAction(formData: FormData) {
    'use server';
    const email = String(formData.get('email') ?? '').trim();
    const name = String(formData.get('name') ?? '').trim();
    await signIn('demo', { email, name, redirectTo: next });
  }

  return (
    <div className="container auth-wrap">
      <div className="auth-card">
        <div className="eyebrow">Members</div>
        <h1>Welcome to CINE·MOOD</h1>
        <p className="auth-sub">Rate films, publish reviews, comment and build your watchlist.</p>

        <form action={googleAction}>
          <button type="submit" className="google-btn" disabled={!isGoogleEnabled}>
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
              <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
              <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.7l4-3z" />
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
            </svg>
            Continue with Google
          </button>
        </form>
        {!isGoogleEnabled ? (
          <p className="form-note">
            Google OAuth abhi configured nahi hai — <code className="mono">AUTH_GOOGLE_ID</code> / <code className="mono">AUTH_GOOGLE_SECRET</code> add karte hi ye button live ho jayega.
          </p>
        ) : null}

        <div className="divider">or use demo access</div>

        <form action={demoAction}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" placeholder="you@example.com" defaultValue="" />
          </div>
          <div className="field">
            <label htmlFor="name">Display name</label>
            <input id="name" name="name" className="input" placeholder="Optional" />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            Enter CINE·MOOD
          </button>
        </form>

        <div className="notice" style={{ marginTop: 16 }}>
          <b>Demo admin:</b> <code>admin@cinemood.app</code> — ye email enter karo to admin panel unlock hoga. Koi aur email normal member ban jayega.
        </div>

        <p className="form-note">
          Demo auth password-less hai (preview ke liye). Production mein Google OAuth hi primary rahega —{' '}
          <Link href="/about" style={{ color: 'var(--accent)' }}>
            setup docs
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
