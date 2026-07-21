import { SOCIAL_LINKS, type SocialNetwork } from '@/lib/content/navigation';

import styles from './SocialIcons.module.css';

/**
 * Social row used in the announcement bar and the footer. Glyphs inherit
 * `currentColor` so the surrounding surface sets the tone.
 */
const GLYPHS: Record<SocialNetwork, { viewBox: string; path: string }> = {
  instagram: {
    viewBox: '0 0 24 24',
    path: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.12 1.38A5.86 5.86 0 0 0 .63 4.13c-.3.76-.5 1.64-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.12.66.66 1.33 1.07 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.86 5.86 0 0 0 2.12-1.38 5.86 5.86 0 0 0 1.38-2.12c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.86 5.86 0 0 0-1.38-2.12A5.86 5.86 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 12 8a4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z',
  },
  tiktok: {
    viewBox: '0 0 11.5 11.4',
    path: 'M6.95 0v6.9A2.66 2.66 0 1 1 4.3 4.85c.35 0 .7.07 1 .21V3.15a4.5 4.5 0 0 0-1-.1A4.2 4.2 0 1 0 8.75 6.9V3.3a4.55 4.55 0 0 0 2.75 1.1V2.55A2.73 2.73 0 0 1 8.75 0Z',
  },
  facebook: {
    viewBox: '0 0 6.15 11.15',
    path: 'M4.05 11.15V6h1.7l.3-1.95h-2V2.8c0-.55.25-.95 1-.95h1.1V.1A14.6 14.6 0 0 0 4.55 0C2.85 0 1.75 1.05 1.75 2.6v1.45H0V6h1.75v5.15Z',
  },
  x: {
    viewBox: '0 0 24 24',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
};

export function SocialIcons({ className }: { className?: string }) {
  return (
    <ul className={[styles.row, className].filter(Boolean).join(' ')}>
      {SOCIAL_LINKS.map(({ network, label, href }) => {
        const glyph = GLYPHS[network];
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
