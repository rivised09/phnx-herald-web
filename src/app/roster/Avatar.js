'use client';

import { useState } from 'react';

/**
 * The roster CDN only allows `oss-resource.farlightgames.com`, so any other
 * host has to travel through the local image proxy instead.
 *
 * The source also hands out a shared "no picture yet" asset; showing it as if
 * it were this player would be worse than showing nothing, so it resolves to
 * no image and the initials stay.
 */
export function imageSrc(value) {
  if (!value) return null;
  if (/codweb_all_three_avatar|\/static\/images\//.test(value)) return null;
  if (value.startsWith('/image-proxy/')) return value;
  try {
    const url = new URL(value);
    if (url.hostname === 'oss-resource.farlightgames.com') {
      const encoded = btoa(url.toString())
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      return `/image-proxy/${encoded}`;
    }
  } catch {
    return null;
  }
  return value;
}

/**
 * A player picture that degrades to initials. Server components cannot hold an
 * `onError` handler, so the hero avatar lives here.
 */
export default function Avatar({ name = '', src = null, className = 'h-16 w-16', textClass = 'text-base' }) {
  const [failed, setFailed] = useState(false);
  const resolved = imageSrc(src);

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-700 bg-gray-500/10 font-mono text-gray-400 ${textClass} ${className}`}
    >
      {name ? name.slice(0, 2).toUpperCase() : '—'}
      {resolved && !failed ? (
        <img
          src={resolved}
          alt=""
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </span>
  );
}
