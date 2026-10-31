'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

type PosterImageProps = {
  src?: string | null;
  secondarySrc?: string | null;
  title: string;
  year?: number | null;
  mediaType?: 'movie' | 'tv';
  imdbId?: string | null;
  fallbackSource?: 'imdbio' | 'tmdb';
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'eager' | 'lazy';
  style?: CSSProperties;
};

export default function PosterImage({
  src,
  secondarySrc,
  title,
  year,
  mediaType = 'movie',
  imdbId,
  fallbackSource = 'imdbio',
  alt = `${title} poster`,
  className,
  width = 500,
  height = 750,
  loading = 'lazy',
  style
}: PosterImageProps) {
  const [imageUrl, setImageUrl] = useState(src || '');
  const [failed, setFailed] = useState(false);
  const [resolving, setResolving] = useState(false);
  const fallbackAttempted = useRef(false);

  const findFallbackPoster = useCallback(async () => {
    if (fallbackAttempted.current) {
      setFailed(true);
      setResolving(false);
      return;
    }
    fallbackAttempted.current = true;

    if (secondarySrc && secondarySrc !== imageUrl) {
      setImageUrl(secondarySrc);
      return;
    }

    if (!title.trim() && !imdbId) {
      setFailed(true);
      return;
    }

    setResolving(true);
    try {
      const params = new URLSearchParams({ title, mediaType, source: fallbackSource });
      if (year) params.set('year', String(year));
      if (imdbId) params.set('imdbId', imdbId);
      const response = await fetch(`/api/imdb/poster?${params.toString()}`, {
        headers: { accept: 'application/json' }
      });
      const data: { coverUrl?: unknown } = response.ok ? await response.json() : {};
      const coverUrl = typeof data.coverUrl === 'string' ? data.coverUrl.trim() : '';
      if (coverUrl && coverUrl !== imageUrl) {
        setImageUrl(coverUrl);
        setResolving(false);
        return;
      }
    } catch {
      // Poster lookup is a best-effort fallback; the title page should remain usable.
    }
    setResolving(false);
    setFailed(true);
  }, [fallbackSource, imageUrl, imdbId, mediaType, secondarySrc, title, year]);

  useEffect(() => {
    if ((!imageUrl || imageUrl === '/posters/placeholder.svg' || imageUrl.endsWith('/posters/placeholder.svg')) && !failed) {
      void findFallbackPoster();
    }
  }, [failed, findFallbackPoster, imageUrl]);

  if (failed) {
    return (
      <div
        className={`poster-image-unavailable${className ? ` ${className}` : ''}`}
        role="img"
        aria-label={`${title}: thumbnail unavailable`}
        style={style}
      >
        <span className="poster-image-unavailable-icon" aria-hidden="true">▧</span>
        <span>{mediaType === 'tv' ? 'Series thumbnail unavailable' : 'Movie thumbnail unavailable'}</span>
      </div>
    );
  }

  if (resolving && !imageUrl) {
    return <div className="poster-image-unavailable poster-image-loading" role="status" aria-label={`Finding a thumbnail for ${title}`} style={style}>Finding thumbnail…</div>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl || '/posters/placeholder.svg'}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      width={width}
      height={height}
      style={style}
      onError={() => {
        if (fallbackAttempted.current) {
          setFailed(true);
          setResolving(false);
        } else {
          void findFallbackPoster();
        }
      }}
    />
  );
}
