import type { ReactNode } from 'react';

import styles from './AuthForm.module.css';

/**
 * The one-card page Log in and Forgot password share: heading, lede, the card.
 * A Server Component; the forms inside it are the client islands.
 */
export function AuthPage({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.page} data-screen-label={title}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lede}>{lede}</p>
        </div>
        <div className={styles.card}>{children}</div>
      </div>
    </section>
  );
}
