'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import styles from './HowItWorks.module.css';

/**
 * The How it works clip: a silent 4-second loop with a pause control —
 * build-handoff §3b, "Media and motion". Client-side because every part of it
 * is runtime state:
 *
 * - It moves for more than five seconds, so the pause button is a WCAG 2.2.2
 *   requirement, not decoration. Do not remove it while the clip loops.
 * - Nothing downloads until the band is within 400px of the viewport
 *   (`preload="none"` and no `src` until then), and it pauses once scrolled
 *   away. An explicit pause is remembered: coming back never restarts it.
 * - Under `prefers-reduced-motion` nothing is fetched or played; the poster
 *   shows and the button is an opt-in Play.
 * - Autoplay refused (data saver, low power) leaves the poster and a Play
 *   button — never an error state.
 * - `<video>` ignores `media` on `<source>`, so the crop (2.4:1 from 1024, 3:2
 *   below) is chosen once, here, with the same 1024 query the CSS
 *   aspect-ratio and the poster's `<source media>` use.
 *
 * The poster is server-rendered underneath the video (`poster`), so it shows
 * with no JavaScript and before the clip's first frame; the video has no
 * poster of its own and is transparent until it has a frame to paint.
 *
 * ⚠ PLACEHOLDER FOOTAGE — must not ship (#38, photography-shot-list §2b).
 */
const SOURCES = {
  desktop: '/assets/home/hiw-desktop.mp4',
  mobile: '/assets/home/hiw-mobile.mp4',
} as const;

const DESKTOP_QUERY = '(min-width: 1024px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

interface HowItWorksClipProps {
  /** What the clip shows, announced as one image. */
  label: string;
  /** The opening frame, rendered beneath the video. */
  poster: ReactNode;
}

export function HowItWorksClip({ label, poster }: HowItWorksClipProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceRef = useRef<string | null>(null);
  const userPausedRef = useRef(false);
  const [playing, setPlaying] = useState(false);

  const start = useCallback(() => {
    const video = videoRef.current;
    const source = sourceRef.current;
    if (!video || !source) return;
    if (!video.getAttribute('src')) video.src = source;
    // Refused autoplay is not an error: the poster stays and the button reads Play.
    video.play()?.catch(() => {});
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Properties, not just attributes: React does not reflect `muted`, and a
    // muted, inline video is what autoplay policies allow.
    video.muted = true;
    video.playsInline = true;
    video.loop = true;

    const mq = (query: string) => (window.matchMedia ? window.matchMedia(query).matches : false);
    sourceRef.current = mq(DESKTOP_QUERY) ? SOURCES.desktop : SOURCES.mobile;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    let observer: IntersectionObserver | null = null;
    if (!mq(REDUCED_MOTION_QUERY) && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            if (!userPausedRef.current) start();
          } else if (!video.paused) {
            // Nothing decorative keeps playing off-screen.
            video.pause();
          }
        },
        // Load ahead of a fast scroll, not at the last moment.
        { rootMargin: '400px 0px' },
      );
      observer.observe(video);
    }

    return () => {
      observer?.disconnect();
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [start]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPausedRef.current = false;
      start();
    } else {
      userPausedRef.current = true;
      video.pause();
    }
  };

  return (
    <div className={styles.media}>
      {poster}
      <video
        ref={videoRef}
        className={styles.video}
        preload="none"
        muted
        loop
        playsInline
        role="img"
        aria-label={label}
      />
      {/* The 44px target is the button; the visible 34px disc is the span
          inside it, so the target does not push the disc off-centre. */}
      <button
        type="button"
        className={styles.clipButton}
        onClick={toggle}
        aria-label={playing ? 'Pause the video' : 'Play the video'}
      >
        <span className={styles.clipDisc} aria-hidden="true">
          {playing ? (
            <svg width="10" height="12" viewBox="0 0 10 12">
              <rect x="0" y="0" width="3.4" height="12" rx="1" />
              <rect x="6.6" y="0" width="3.4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="11" height="12" viewBox="0 0 11 12" className={styles.playGlyph}>
              <path d="M1 1.2a1 1 0 0 1 1.52-.86l7 4.8a1 1 0 0 1 0 1.72l-7 4.8A1 1 0 0 1 1 10.8Z" />
            </svg>
          )}
        </span>
      </button>
    </div>
  );
}
