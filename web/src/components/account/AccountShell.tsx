import type { ReactNode } from 'react';

import type { PurchaseBarData } from '@/lib/purchase-bar/data';

import { AccountBoxStrip } from './AccountBoxStrip';
import { AccountHelp } from './AccountHelp';
import { AccountNav } from './AccountNav';
import styles from './Account.module.css';

/**
 * My Account's frame (design: My Account): the hero — "Hello, {first name}" and
 * the box-in-progress strip — then the account menu beside the section, and the
 * help panel under it. A Server Component; the nav and the strip are the client
 * islands (the current section, the cart).
 */
export function AccountShell({
  firstName,
  purchaseBar,
  children,
}: {
  firstName?: string;
  purchaseBar: PurchaseBarData;
  children: ReactNode;
}) {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.inner}>
          <div className={styles.heroGrid}>
            <div>
              <h1 className={styles.title}>{firstName ? `Hello, ${firstName}` : 'Hello'}</h1>
              <p className={styles.lede}>Your orders, points and saved details, all in one place.</p>
              <AccountBoxStrip data={purchaseBar} />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.inner}>
          <div className={styles.layout}>
            <AccountNav />
            <div className={styles.main}>
              {children}
              <AccountHelp />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
