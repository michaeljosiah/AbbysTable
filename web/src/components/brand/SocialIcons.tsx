import { SOCIAL_LINKS } from '@/lib/content/navigation';
import { SOCIAL_GLYPHS } from '@/lib/content/socialGlyphs';

import styles from './SocialIcons.module.css';

/**
 * Social row used in the announcement bar and the footer. Glyphs inherit
 * `currentColor` so the surrounding surface sets the tone.
 */
export function SocialIcons({ className }: { className?: string }) {
  return (
    <ul className={[styles.row, className].filter(Boolean).join(' ')}>
      {SOCIAL_LINKS.map(({ network, label, href }) => {
        const glyph = SOCIAL_GLYPHS[network];
        return (
          <li key={network}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={styles.link}
            >
              <svg width="15" height="15" viewBox={glyph.viewBox} aria-hidden="true">
                <path d={glyph.path} fill="currentColor" />
              </svg>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
