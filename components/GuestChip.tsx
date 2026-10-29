'use client';

import { useEffect, useState } from 'react';
import { getGuestId } from '@/lib/guest';

/** Small read-only badge — proves guest mode is on and shows the local id. */
export default function GuestChip() {
  const [id, setId] = useState('');

  useEffect(() => {
    setId(getGuestId());
  }, []);

  return (
    <span className="guest-chip" title={id ? `Guest id: ${id} (localStorage)` : 'Guest mode'}>
      <span className="guest-dot" aria-hidden="true" />
      Guest <em>read-only</em>
    </span>
  );
}
