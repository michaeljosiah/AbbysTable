import type { CSSProperties } from 'react';

import styles from './Logo.module.css';

/**
 * The Abby's Table wordmark, painted with a CSS mask so a single SVG can be
 * tinted per surface (forest on the cream header, blush on dark grounds).
 * Colour follows `currentColor`, so set it on the link that wraps this.
 */
interface LogoProps {
  /** Rendered width in px; height scales with the artwork's ratio. */
  width?: number;
  height?: number;
  /** Shows the ® glyph alongside the mark. */
  withRegistered?: boolean;
  className?: string;
}

export function Logo({ width = 186, height = 32, withRegistered = true, className }: LogoProps) {
  return (
    <span
      className={[styles.lockup, className].filter(Boolean).join(' ')}
      // Exposed as custom properties rather than inline width/height so a
      // consuming layout can resize the mark from a media query.
      style={{ '--logo-width': `${width}px`, '--logo-height': `${height}px` } as CSSProperties}
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
