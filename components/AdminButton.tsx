'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  action: string;
  id: string;
  value?: string;
  label: string;
  variant?: 'default' | 'danger';
  confirmText?: string;
};

export default function AdminButton({ action, id, value, label, variant = 'default', confirmText }: Props) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, id, value })
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={`btn btn-sm ${variant === 'danger' ? 'btn-danger' : 'btn-ghost'}`} onClick={run} disabled={busy}>
      {busy ? '…' : label}
    </button>
  );
}
