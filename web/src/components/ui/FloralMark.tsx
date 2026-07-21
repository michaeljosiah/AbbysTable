import Image from 'next/image';

import styles from './FloralMark.module.css';

/**
 * The brand's floral device. Decorative wherever it repeats alongside a heading,
 * so it carries an empty alt by default.
 */
interface FloralMarkProps {
  height?: number;
  alt?: string;
  className?: string;
}

export function FloralMark({ height = 66, alt = '', className }: FloralMarkProps) {
  return (
    <Image
      src="/assets/floral-mark.png"
      alt={alt}
      height={height}
      width={height}
      aria-hidden={alt === '' || undefined}
      className={[styles.mark, className].filter(Boolean).join(' ')}
      style={{ height, width: 'auto' }}
    />
  );
}
