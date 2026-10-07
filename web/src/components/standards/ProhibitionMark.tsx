import type { ProhibitionGlyph } from '@/lib/content/standards';

/**
 * Inner glyphs of the hero's four prohibition marks, drawn on a 24px grid
 * (design: Standards v2 hero, `.st-nos-item`).
 */
const GLYPH_PATHS: Record<ProhibitionGlyph, readonly string[]> = {
  oil: [
    'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z',
    'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
  ],
  package: ['m21 8-9-5-9 5v8l9 5 9-5Z', 'm3 8 9 5 9-5', 'M12 13v8'],
  flask: ['M9 3h6', 'M10 3v5.5L5.5 17A2.5 2.5 0 0 0 7.8 21h8.4a2.5 2.5 0 0 0 2.3-4L14 8.5V3', 'M7.3 15h9.4'],
  sprout: [
    'M12 21V9',
    'M12 9C12 5.5 9.5 3 6 3c0 3.5 2.5 6 6 6Z',
    'M12 12c0-3 2.2-5.2 5.5-5.2 0 3-2.2 5.2-5.5 5.2Z',
  ],
};

/**
 * A prohibition mark: the glyph sits UNDER a ring and a diagonal bar, so the
 * "no" is carried by the symbol as well as the words beside it. Decorative —
 * every claim is stated in text — so it is hidden from assistive tech.
 *
 * The inner group is scaled to 0.56, so its stroke is 2.5 to land back at the
 * ring's visual 1.4. Stroke colour comes from the caller's `color`.
 */
export function ProhibitionMark({ glyph, className }: { glyph: ProhibitionGlyph; className?: string }) {
  return (
    <svg
      className={className}
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <g strokeWidth="2.5" transform="translate(12 12) scale(0.56) translate(-12 -12)">
        {GLYPH_PATHS[glyph].map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}
