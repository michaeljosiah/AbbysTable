import type { Metadata } from 'next';
import { unstable_rethrow } from 'next/navigation';
import Link from 'next/link';

import { AddressBook } from '@/components/account/AddressBook';
import styles from '@/components/account/Account.module.css';
import { getMyAddressBook, type AddressBook as Book } from '@/lib/aonik/addresses';
import { redirectToLogin, requireSignedIn } from '@/lib/auth/guard';
import { SessionExpiredError } from '@/lib/auth/server';

export const metadata: Metadata = {
  title: "Addresses — Abby's Table",
  description: 'Your saved delivery addresses.',
};

/** One customer's page, from the session cookie: never cached or prerendered. */
export const dynamic = 'force-dynamic';

const HREF = '/account/addresses';

export default async function AddressesPage() {
  await requireSignedIn(HREF);

  let book: Book | undefined;
  let ended = false;
  try {
    book = await getMyAddressBook();
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof SessionExpiredError) ended = true;
    else console.error('[account] the address book could not be read');
  }
  if (ended) redirectToLogin(HREF);

  return (
    <section className={styles.section} aria-labelledby="addresses-h">
      <h2 className={styles.h2} id="addresses-h">
        Addresses
      </h2>
      <p className={styles.sub}>The addresses you have saved. Your default is the one marked Default.</p>
      {book ? (
        <AddressBook initial={book} />
      ) : (
        <div className={styles.notice}>
          <h3 className={styles.cardTitle}>Your addresses are unavailable right now</h3>
          <p className={styles.p}>We couldn’t load your saved addresses. Please try again in a few minutes.</p>
          <Link href={HREF} className={styles.pill}>
            Try again
          </Link>
        </div>
      )}
    </section>
  );
}
