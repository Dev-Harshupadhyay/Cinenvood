import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, isGoogleEnabled, signIn } from '@/auth';
import { googleState } from '@/lib/auth-config';

export const metadata = { title: 'Sign in', robots: { index: false, follow: false } };

const isDev = process.env.NODE_ENV !== 'production';

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = '/dashboard', error } = await searchParams;
  const session = await auth();
  if (session?.user) redirect(next);

  async function googleAction() {
    'use server';
    await signIn('google', { redirectTo: next });
  }

  async function devAction(formData: FormData) {
    'use server';
    const email = String(formData.get('email') ?? '').trim();
    const name = String(formData.get('name') ?? '').trim();
    await signIn('dev-email', { email, name, redirectTo: next });
  }

  return (
    <div className="container auth-wrap">
      <div className="auth-card">
        <div className="eyebrow">Members</div>
        <h1>Sign in to CINE·MOOD</h1>
        <p className="auth-sub">
          Google se sign in karo — rating, review, like aur comment sab unlock. Guest ke roop mein reviews padhna free hai.
        </p>

        {isGoogleEnabled ? (
          <form action={googleAction}>
            <button type="submit" className="google-btn">
              <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
                <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.7l4-3z" />
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
              </svg>
              Continue with Google
            </button>
          </form>
        ) : (
          <div className="notice notice-warn">
            {googleState === 'half' ? (
              <>
                <b>Client ID mil gaya, secret baaki hai.</b> Google Cloud Console → Credentials → OAuth client se{' '}
                <code className="mono">Client secret</code> copy karke Vercel mein <code className="mono">AUTH_GOOGLE_SECRET</code> daal do —
                uske baad ye button live ho jayega. Tab tak site guest mode mein hai.
              </>
            ) : (
              <>
                <b>Google sign-in setup pending.</b> Owner ko <code className="mono">AUTH_GOOGLE_ID</code> aur{' '}
                <code className="mono">AUTH_GOOGLE_SECRET</code> Vercel par add karne hain — uske baad ye button live ho jayega.
                Tab tak site guest mode mein chal rahi hai.
              </>
            )}
          </div>
        )}

        {error ? (
          <p className="form-note" style={{ color: 'var(--danger, #e26d5a)' }}>
            Sign-in fail hua ({error}). Dobara try karo ya doosra Google account use karo.
          </p>
        ) : null}

        {isGoogleEnabled && process.env.ADMIN_EMAIL ? (
          <p className="form-note">
            Admin access sirf <code className="mono">{process.env.ADMIN_EMAIL}</code> se milta hai — koi email daal ke admin banne ka
            rasta nahi hai.
          </p>
        ) : null}

        {!isGoogleEnabled && isDev ? (
          <>
            <div className="divider">local development sign-in</div>
            <form action={devAction}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" required className="input" placeholder="you@example.com" />
              </div>
              <div className="field">
                <label htmlFor="name">Display name</label>
                <input id="name" name="name" className="input" placeholder="Optional" />
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                Continue (dev only)
              </button>
            </form>
            <p className="form-note">
              Ye form production build se hata hua hai. Deployment par sirf Google OAuth dikhega.
            </p>
          </>
        ) : null}

        <div className="divider">or</div>
        <Link href="/movies" className="btn btn-ghost btn-block">
          Browse as guest — read only
        </Link>
        <p className="form-note">
          Guest mode mein sirf reviews padh sakte ho. Like / review / comment ke liye Google sign-in zaroori hai.
        </p>
      </div>
    </div>
  );
}
