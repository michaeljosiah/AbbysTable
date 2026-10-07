import { SOCIAL_LINKS } from '@/lib/content/navigation';
import { SOCIAL_GLYPHS } from '@/lib/content/socialGlyphs';

import styles from './SocialIcons.module.css';

/**
 * The four social links, as the v2 drawer and footer set them (`.at-social`):
 * each a 44px target around a small glyph, blush on the dark grounds, shifting
 * to brass on hover — a colour shift, never a fade or a lift (design/CLAUDE.md
 * "Hover language"). Glyphs inherit `currentColor`, so the surface sets the
 * tone. `size` is the glyph: 18px in the footer, 20px in the drawer.
 */
export function SocialIcons({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <ul className={[styles.row, className].filter(Boolean).join(' ')}>
      {SOCIAL_LINKS.map(({ network, label, href }) => {
        const glyph = SOCIAL_GLYPHS[network];
        return (
          <li key={network} className={styles.item}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={styles.link}
            >
              <svg
                width={size}
                height={size}
                viewBox={glyph.viewBox}
                aria-hidden="true"
                focusable="false"
              >
                <path d={glyph.path} fill="currentColor" />
              </svg>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
