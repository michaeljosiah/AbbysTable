import type { CSSProperties } from 'react';

import styles from './Logo.module.css';

/**
 * The Abby's Table wordmark, painted with a CSS mask so a single SVG can be
 * tinted per surface (forest on the cream header, blush on dark grounds).
 * Colour follows `currentColor`, so set it on the link that wraps this.
 */
interface LogoProps {
  /**
   * Rendered width in px. Omit BOTH dimensions to size the mark purely from
   * CSS (`--logo-width`/`--logo-height` on a wrapping class) — an inline
   * value would defeat media-query overrides.
   */
  width?: number;
  height?: number;
  /** Shows the ® glyph alongside the mark. */
  withRegistered?: boolean;
  className?: string;
}

export function Logo({ width, height, withRegistered = true, className }: LogoProps) {
  const size: Record<string, string> = {};
  if (width !== undefined) size['--logo-width'] = `${width}px`;
  if (height !== undefined) size['--logo-height'] = `${height}px`;

  return (
    <span
      className={[styles.lockup, className].filter(Boolean).join(' ')}
      // Exposed as custom properties rather than inline width/height so a
      // consuming layout can resize the mark from a media query.
      style={size as CSSProperties}
    >
      <span className={styles.mark} role="img" aria-label="Abby's Table" />
      {withRegistered ? (
        <span className={styles.registered} aria-hidden="true">
          ®
        </span>
      ) : null}
    </span>
  );
}
