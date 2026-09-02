import Image from 'next/image';

import styles from './FloralMark.module.css';

/**
 * The brand's floral device. Decorative wherever it repeats alongside a heading,
 * so it carries an empty alt by default.
 */
interface FloralMarkProps {
  height?: number;
  /**
   * Hands sizing to the caller's stylesheet instead of setting it inline. Use
   * this where the mark resizes across breakpoints — an inline height would
   * outrank the media queries that need to shrink it.
   */
  cssSized?: boolean;
  alt?: string;
  className?: string;
}

export function FloralMark({ height = 66, cssSized = false, alt = '', className }: FloralMarkProps) {
  return (
    <Image
      src="/assets/floral-mark.png"
      alt={alt}
      height={height}
      width={height}
      aria-hidden={alt === '' || undefined}
      className={[styles.mark, className].filter(Boolean).join(' ')}
      style={cssSized ? undefined : { height, width: 'auto' }}
    />
  );
}
