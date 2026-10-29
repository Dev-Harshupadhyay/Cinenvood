import Link from 'next/link';

/** Shown when the data layer is degraded — never a blank page. */
export default function DataBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="container" style={{ paddingTop: 14 }}>
      <div className="notice notice-warn" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <b>Data connection issue:</b>
        <span>{message}</span>
        <Link href="/status" className="link-more" style={{ marginLeft: 'auto' }}>
          Run diagnostics →
        </Link>
      </div>
    </div>
  );
}
