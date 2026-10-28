'use client';

import { useState } from 'react';

export default function SpoilerText({ text, className = 'rv-body' }: { text: string; className?: string }) {
  const [revealed, setRevealed] = useState(false);
  if (revealed) return <p className={className}>{text}</p>;
  return (
    <div className="spoiler-mask">
      <p className={`${className} sm-inner`} style={{ filter: 'blur(5px)' }}>
        {text}
      </p>
      <button type="button" className="sm-btn" onClick={() => setRevealed(true)}>
        <span className="rv-spoiler">Contains spoilers — tap to reveal</span>
      </button>
    </div>
  );
}
