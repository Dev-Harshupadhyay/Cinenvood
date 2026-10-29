export default function GuestNote({ what = 'react' }: { what?: string }) {
  return (
    <div className="guest-note">
      <span className="gn-dot" aria-hidden="true" />
      <span>
        <b>Guest mode</b> — aap parh sakte ho, lekin {what} karne ke liye Google se sign in karna hoga.
      </span>
      <a href="/login" className="gn-link">Sign in</a>
    </div>
  );
}
