import { Button, Eyebrow, SectionHeading } from '@/components/ui';
import { PRIVATE_TABLE_CREDENTIALS } from '@/lib/content/marketing';

import styles from './PrivateTable.module.css';

/** The brass rule-diamond-rule divider used between credential tiers. */
function Divider({ className }: { className?: string }) {
  return (
    <span className={[styles.divider, className].filter(Boolean).join(' ')} aria-hidden="true">
      <span className={styles.dividerRule} />
      <span className={styles.dividerDiamond}>◆</span>
      <span className={styles.dividerRule} />
    </span>
  );
}

/**
 * Navy band for the private consultation service.
 *
 * The credentials are rendered twice: as a bordered card beside the copy on
 * wide screens, and as a plain centred stack beneath it below 860px. The
 * template swaps one for the other rather than reflowing the card, because the
 * border reads as a panel at 360px wide and as a box at full width. Only one is
 * ever visible, and the stacked variant is the one hidden from assistive tech
 * to avoid announcing the list twice.
 *
 * The CTA has no destination yet — the consultation flow does not exist — so it
 * renders as a `<button>`. Give it an `href` (or an `onClick` from a client
 * wrapper) once there is somewhere for it to go.
 */
export function PrivateTable() {
  return (
    <section id="private" className={styles.section}>
      <div className={`band ${styles.split}`}>
        <div className={styles.content}>
          <Eyebrow tone="brass" align="center">
            A private service
          </Eyebrow>

          <Divider className={styles.eyebrowDivider} />

          <SectionHeading level={1} tone="cream" align="center" className={styles.heading}>
            Abby&apos;s Private Table
          </SectionHeading>

          <p className={styles.standfirst}>
            Bespoke Nigerian fusion menus, created around you.
          </p>

          <p className={styles.body}>
            When the way you eat needs to change, the food you love can be rethought rather than
            given up. Abby&apos;s Private Table creates personalised Nigerian fusion food around
            your health, recovery or performance needs.
          </p>

          <p className={styles.reach}>
            <span className={styles.reachPlace}>Worldwide</span> — recipes created for you
            <span className={styles.dot} aria-hidden="true">
              •
            </span>
            <span className={styles.reachPlace}>UK-wide</span> — recipes created and prepared for
            you
          </p>

          {/* Stacked variant: shown below 860px, where the card is hidden. */}
          <div className={styles.credentialsStack}>
            {PRIVATE_TABLE_CREDENTIALS.map((credential, index) => (
              <div key={credential.role}>
                {index > 0 ? <Divider /> : null}
                <div className={styles.credentialRole}>{credential.role}</div>
                <div className={styles.credentialName}>{credential.lines.join(' ')}</div>
              </div>
            ))}
          </div>

          <div className={styles.cta}>
            <Button variant="cream" size="lg">
              Find out more
            </Button>
          </div>

          <p className={styles.price}>Private Table from £2,500</p>
        </div>

        <div className={styles.credentialsCard}>
          {PRIVATE_TABLE_CREDENTIALS.map((credential, index) => (
            <div key={credential.role}>
              {index > 0 ? <Divider /> : null}
              <div className={styles.credentialRole}>{credential.role}</div>
              <div className={styles.credentialName}>
                {credential.lines.map((line, lineIndex) => (
                  <span key={line}>
                    {lineIndex > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
