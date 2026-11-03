"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryItem } from "@/lib/content-db";

export default function Lightbox({ items }: { items: GalleryItem[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const open = (i: number) => setIndex(i);
  const close = useCallback(() => setIndex(null), []);

  const showPrev = useCallback(
    () => setIndex((i) => (i === null ? null : (i - 1 + items.length) % items.length)),
    [items.length]
  );
  const showNext = useCallback(
    () => setIndex((i) => (i === null ? null : (i + 1) % items.length)),
    [items.length]
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, showPrev, showNext]);

  // simple focus trap
  useEffect(() => {
    if (index === null) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = dialog.querySelectorAll<HTMLElement>(
        "button, [href], input, [tabindex]:not([tabindex='-1'])"
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", handler);
    return () => dialog.removeEventListener("keydown", handler);
  }, [index]);

  const current = index === null ? null : items[index];

  return (
    <>
      {/* eslint-disable @next/next/no-img-element -- lightbox images: plain img by design */}
      <ul className="gallery-grid">
        {items.map((item, i) => (
          <li key={item.src}>
            <button
              type="button"
              className="gallery-item"
              onClick={() => open(i)}
              aria-label={`View ${item.mediaType === "video" ? "video" : "image"}: ${item.alt}`}
            >
              {item.mediaType === "video" ? (
                <>
                  <video src={item.src + "#t=0.5"} muted playsInline preload="metadata" />
                  <span className="gallery-item__video-badge" aria-hidden="true">
                    ▶
                  </span>
                </>
              ) : (
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  decoding="async"
                />
              )}
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
          ref={dialogRef}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <button
            ref={closeBtnRef}
            type="button"
            className="lightbox__close"
            onClick={close}
            aria-label="Close image viewer"
          >
            ✕
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--prev"
            onClick={showPrev}
            aria-label="Previous image"
          >
            ‹
          </button>
          <figure className="lightbox__figure">
            {current.mediaType === "video" ? (
              <video src={current.src} controls autoPlay playsInline />
            ) : (
              <img src={current.src} alt={current.alt} width={1600} height={1000} />
            )}
            <figcaption>{current.alt}</figcaption>
          </figure>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            onClick={showNext}
            aria-label="Next image"
          >
            ›
          </button>
        </div>
      )}
      {/* eslint-enable @next/next/no-img-element */}
    </>
  );
}
