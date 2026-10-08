import Link from 'next/link';
import { Fragment } from 'react';

import {
  PRIVATE_TABLE_CREDENTIALS,
  PRIVATE_TABLE_FROM_PENCE,
  PRIVATE_TABLE_HREF,
  PRIVATE_TABLE_REACH,
  type PrivateTableReachIcon,
} from '@/lib/content/marketing';
import { formatPrice } from '@/lib/format';

import { KeepCompounds } from './KeepTogether';
import styles from './PrivateTable.module.css';

/** Order Confirmation v2's Private Table route glyphs: a globe and a pin. */
function ReachGlyph({ icon }: { icon: PrivateTableReachIcon }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icon === 'globe' ? (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17" />
          <path d="M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5z" />
        </>
      ) : (
        <>
          <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </>
      )}
    </svg>
  );
}

/**
 * Abby's Private Table — design/Abby's Table - Homepage v2.dc.html (approved)
 * and build-handoff "Private Table — what was settled".
 *
 * On `--navy`, accents plain `--brass` by decision: 4.08:1 on navy, under the
 * 4.5:1 small-text minimum, accepted so the band and Private Table v2 share
 * one brass — the two are revisited together or not at all (design/CLAUDE.md,
 * "Brass on --navy"). Do not "fix" this band alone.
 *
 * One credentials card at every width (full width on a phone), never a second
 * borderless copy. The credentials are regulated claims to substantiate
 * before launch (#38).
 *
 * "Find out more" goes to the Private Table page (#25, `PRIVATE_TABLE_HREF`)
 * — its top, not the waitlist form (design/CLAUDE.md, Order Confirmation's
 * banner: "top of page, not #enquire"). The band keeps `id="private"`: it was
 * the chrome's Private Table destination until that page landed, so a link
 * saved then still arrives here.
 *
 * The mobile purchase bar is suppressed from this band's top through the
 * footer: "Build a Box" beside a bespoke service reads as an upsell. The
 * suppression is positional, so this must stay the last band on the page —
 * anything placed below it is suppressed too (build-handoff §3j).
 */
export function PrivateTable() {
  return (
    <section id="private" className={styles.section} data-purchase-bar-stop="">
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.copy}>
            <h2 className={styles.heading}>Abby’s Private Table</h2>
            <p className={styles.subline}>Bespoke Nigerian fusion menus, created around you.</p>
            <p className={styles.body}>
              When the way you eat needs to change, the food you love can be rethought rather than
              given up. Abby’s Private Table creates personalised Nigerian fusion food around your
              health, recovery or performance needs.
            </p>

            <ul className={styles.reach} role="list">
              {PRIVATE_TABLE_REACH.map((row) => (
                <li key={row.label} className={styles.reachRow}>
                  <span className={styles.reachRing} aria-hidden="true">
                    <ReachGlyph icon={row.icon} />
                  </span>
                  <span>
                    <span className={styles.reachLabel}>{row.label}</span>
                    <span className={styles.reachValue}>{row.value}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className={styles.ctaWrap}>
              <Link href={PRIVATE_TABLE_HREF} className={styles.cta}>
                Find out more
              </Link>
            </div>
            <p className={styles.price}>Private Table from {formatPrice(PRIVATE_TABLE_FROM_PENCE)}</p>
          </div>

          <div className={styles.card}>
            {PRIVATE_TABLE_CREDENTIALS.map((credential, index) => (
              <Fragment key={credential.role}>
                {index > 0 ? (
                  <span className={styles.divider} aria-hidden="true">
                    <span className={styles.dividerRule} />
                    <span className={styles.dividerMark}>◆</span>
                    <span className={styles.dividerRule} />
                  </span>
                ) : null}
                <p className={styles.role}>{credential.role}</p>
                <p className={styles.credential}>
                  <KeepCompounds text={credential.name} />
                </p>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
