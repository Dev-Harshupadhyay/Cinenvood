'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type Props = { current: 'en' | 'hi'; compact?: boolean };

/** One-tap switch between the original Hinglish and the English edition. */
export default function EditionSwitch({ current, compact = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(current);

  function choose(next: 'en' | 'hi') {
    if (next === value) return;
    setValue(next);
    document.cookie = `cm-edition=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="edition-switch" data-pending={pending ? 'true' : undefined} aria-label="Review language">
      {!compact ? <span className="es-label">Reviews</span> : null}
      <button type="button" data-on={value === 'hi' ? 'true' : undefined} onClick={() => choose('hi')}>
        Hinglish
      </button>
      <button type="button" data-on={value === 'en' ? 'true' : undefined} onClick={() => choose('en')}>
        English
      </button>
    </div>
  );
}
