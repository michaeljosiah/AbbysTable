import type { ReactNode } from 'react';

import type { PurchaseBarData } from '@/lib/purchase-bar/data';

import { AccountBoxStrip } from './AccountBoxStrip';
import { AccountHelp } from './AccountHelp';
import { AccountNav } from './AccountNav';
import { AccountView } from './AccountView';
import styles from './Account.module.css';

/**
 * My Account's frame (design: My Account): the hero — "Hello, {first name}", the
 * box-in-progress strip and, on the overview, the Next delivery card — then the
 * account menu beside the section, and the help panel under it. A Server
 * Component; the nav, the strip and the view are the client islands (the
 * current section, the cart).
 */
export function AccountShell({
  firstName,
  purchaseBar,
  heroAside,
  children,
}: {
  firstName?: string;
  purchaseBar: PurchaseBarData;
  /** The overview's Next delivery card (a parallel route: empty in every section). */
  heroAside?: ReactNode;
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
            {heroAside}
          </div>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.inner}>
          <AccountView nav={<AccountNav />} help={<AccountHelp />}>
            {children}
          </AccountView>
        </div>
      </section>
    </>
  );
}
