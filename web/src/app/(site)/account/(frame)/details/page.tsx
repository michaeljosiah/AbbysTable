import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';

import { DetailsForm } from '@/components/account/DetailsForm';
import { PasswordCard } from '@/components/account/PasswordCard';
import styles from '@/components/account/Account.module.css';
import { DETAILS_COPY } from '@/lib/account/detailsForm';
import { phoneForInput } from '@/lib/account/phone';
import { getMyProfile, type CustomerProfile } from '@/lib/account/profile';
import { redirectToLogin, requireSignedIn } from '@/lib/auth/guard';
import { SessionExpiredError } from '@/lib/auth/server';
import { CONTACT_HREF, COOKIE_PREFERENCES_ITEM } from '@/lib/content/navigation';

export const metadata: Metadata = {
  title: "Details & preferences — Abby's Table",
  description: 'Your details, password and email preferences.',
};

/** One customer's page, from the session cookie: never cached or prerendered. */
export const dynamic = 'force-dynamic';

const HREF = '/account/details';

/**
 * Details & preferences (design: My Account). Not built, on purpose: the
 * newsletter toggle (the monthly note is a sign-up list, not an account
 * setting — it is the footer's form) and the Private Table waitlist card (the
 * waitlist has no backing yet). The email is shown, not editable.
 */
export default async function DetailsPage() {
  await requireSignedIn(HREF);

  let profile: CustomerProfile | undefined;
  let ended = false;
  try {
    profile = await getMyProfile();
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof SessionExpiredError) ended = true;
    else console.error('[account] the profile could not be read');
  }
  if (ended) redirectToLogin(HREF);

  return (
    <section className={styles.section} aria-labelledby="details-h">
      <h2 className={styles.h2} id="details-h">
        Details &amp; preferences
      </h2>

      {profile ? (
        <>
          <div className={styles.card}>
            <h3 className={styles.cardTitle} style={{ marginBottom: 18 }}>
              Your details
            </h3>
            <DetailsForm
              initial={{
                firstName: profile.firstName ?? '',
                lastName: profile.lastName ?? '',
                phone: phoneForInput(profile.phone),
              }}
              email={profile.email}
            />
          </div>

          <PasswordCard />
        </>
      ) : (
        <div className={styles.notice}>
          <h3 className={styles.cardTitle}>Your details are unavailable right now</h3>
          <p className={styles.p}>We couldn’t load your details. Please try again in a few minutes.</p>
          <Link href={HREF} className={styles.pill}>
            Try again
          </Link>
        </div>
      )}

      <div className={`${styles.card} ${styles.stack}`}>
        <h3 className={styles.cardTitle}>Emails &amp; cookies</h3>
        <p className={styles.p}>{DETAILS_COPY.emailsLead}</p>
        <Link href={COOKIE_PREFERENCES_ITEM.href} className={styles.textLink} data-consent-open>
          <span>Cookie preferences</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      <p className={styles.p}>
        To close your account and delete your data, <Link href={CONTACT_HREF}>contact us</Link>.
      </p>
    </section>
  );
}
