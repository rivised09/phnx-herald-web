'use client';

import { useCallback, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

/**
 * A player's album gallery: up to 8 images, four across and two down.
 *
 * Missing images fall back to `placeholder.svg`, drawn white/greyish so they
 * read as empty slots rather than broken images. Every image shows its like
 * count. Clicking an image opens a preview modal with next/previous
 * navigation, a close button, and click-outside-to-close.
 */
export default function AlbumGallery({ albums = [] }) {
  const slots = Array.from({ length: 8 }, (_, i) => albums[i] || null);
  const [preview, setPreview] = useState(null);

  const openPreview = (index) => setPreview(index);
  const closePreview = () => setPreview(null);

  const goTo = useCallback(
    (delta) => {
      setPreview((current) => {
        if (current === null) return null;
        const next = current + delta;
        if (next < 0 || next >= slots.length) return current;
        return next;
      });
    },
    [slots.length],
  );

  return (
    <>
      <section className="border-t border-gray-800 px-4 py-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
            Album
          </h2>
          <p className="text-xs text-gray-400">
            {slots.filter(Boolean).length} of 8
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {slots.map((album, index) => {
            const hasImage = Boolean(album?.url);
            const likes = album?.likes ?? 0;
            return (
              <div
                key={index}
                className="aspect-square overflow-hidden rounded border border-gray-700/70 bg-gray-500/5 cursor-pointer group"
                onClick={() => openPreview(index)}
              >
                <div className="relative h-full w-full overflow-hidden rounded-md bg-gray-100 group">
                  <img
                    src={hasImage ? album.url : '/placeholder.svg'}
                    alt={album?.caption || ''}
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full ${
                      hasImage
                        ? 'object-cover'
                        : 'object-contain grayscale brightness-110 opacity-60'
                    }`}
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                      e.currentTarget.className =
                        'h-full w-full object-contain grayscale brightness-110 opacity-60';
                    }}
                  />
                  {/* Likes overlay on top of the image */}
                  <div className="absolute top-1 right-1 z-10">
                    <span className="inline-block bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-mono text-white">
                      {likes.toLocaleString()} likes
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {preview !== null && (
        <AlbumPreview
          slots={slots}
          index={preview}
          onClose={closePreview}
          onNext={() => goTo(1)}
          onPrev={() => goTo(-1)}
        />
      )}
    </>
  );
}

/**
 * Full-screen album preview: one image at a time with next/previous arrows,
 * a close (X) button, and click-outside-to-close. Shows the like count on
 * every image.
 */
function AlbumPreview({ slots, index, onClose, onNext, onPrev }) {
  const album = slots[index];
  const hasImage = Boolean(album?.url);
  const likes = album?.likes ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close on clicking the backdrop, but not on the content itself. */}
      <div
        className="absolute inset-0"
        onClick={(e) => {
          e.stopPropagation();
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-2 max-w-[90vw] max-h-[90vh]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-0 left-0 z-20 p-2 bg-black/60 rounded-full text-white hover:text-amber-400 hover:bg-black/80"
        >
          <X className="h-6 w-6" />
        </button>

        <div
          className="relative overflow-hidden rounded border border-gray-600 bg-gray-900"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative h-full w-full bg-gray-100">
            <img
              src={hasImage ? album.url : '/placeholder.svg'}
              alt={album?.caption || ''}
              loading="lazy"
              decoding="async"
              className={`max-w-[80vw] max-h-[70vh] ${
                hasImage ? 'object-contain' : 'object-contain grayscale brightness-110 opacity-60'
              }`}
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
                e.currentTarget.className =
                  'max-w-[80vw] max-h-[70vh] object-contain grayscale brightness-110 opacity-60';
              }}
            />
          </div>

          <p className="absolute bottom-2 left-0 right-0 mt-2 font-mono text-[10px] text-center">
            <span className="inline-block bg-black/60 px-1.5 py-0.5 rounded text-white">
              {likes.toLocaleString()} likes
            </span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          {index > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="p-2 text-white hover:text-amber-400"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          ) : null}
          <span className="font-mono text-[10px] text-gray-500">
            {index + 1} / {slots.length}
          </span>
          {index < slots.length - 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="p-2 text-white hover:text-amber-400"
            >
              <ArrowRight className="h-6 w-6" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
