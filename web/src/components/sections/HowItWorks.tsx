import Image from 'next/image';
import { Fragment } from 'react';

import { Button, Eyebrow, SectionHeading } from '@/components/ui';
import { HOW_IT_WORKS_STEPS } from '@/lib/content/marketing';

import { Standards } from './Standards';
import styles from './HowItWorks.module.css';

interface HowItWorksProps {
  /**
   * Pre-formatted delivery date, e.g. "6 August", or null when the tenant
   * publishes no promise — in which case the line is not rendered at all. A
   * wrong date is worse than no date, so nothing is invented here.
   */
  earliestDeliveryLabel: string | null;
}

/** Renders lines hard-broken by the content, rather than left to wrap. */
function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, index) => (
        <Fragment key={line}>
          {index > 0 ? <br /> : null}
          {line}
        </Fragment>
      ))}
    </>
  );
}

/**
 * The four-step explainer: build the box, cook from scratch, deliver chilled,
 * heat and eat. Steps are content-driven; the delivery date is passed in so it
 * stays in step with the live cut-off rather than being baked into the markup.
 *
 * The section carries `id="standards"` and opens with the standards card,
 * because the template folds the two together: one ground, one column, one
 * vertical rhythm, with `#howitworks` as an anchor on the intro inside it. Both
 * anchors still resolve, so the nav is unaffected.
 *
 * Each step is a horizontal card — photograph left, text right. The proportion
 * between the two is re-cut four times on the way down, which is why this
 * stylesheet carries banded queries rather than a single mobile breakpoint.
 */
export function HowItWorks({ earliestDeliveryLabel }: HowItWorksProps) {
  return (
    <section id="standards" className={styles.section}>
      <div className="band">
        <Standards />

        <div id="howitworks" className={styles.intro}>
          <Eyebrow tone="brass" align="center">
            Prepared with care
          </Eyebrow>
          <SectionHeading level={1} align="center" className={styles.heading}>
            How Abby&apos;s Table works
          </SectionHeading>
          <p className={styles.lede}>
            Choose your box, choose your date, and let Abby take care of the rest.
          </p>
        </div>

        <ol className={styles.grid}>
          {HOW_IT_WORKS_STEPS.map((step) => (
            <li key={step.step} className={styles.card}>
              <div className={styles.media}>
                <Image
                  src={step.imageUrl}
                  alt={step.imageAlt}
                  fill
                  sizes="(max-width: 760px) 100vw, (max-width: 1080px) 50vw, 25vw"
                  className={styles.image}
                />
              </div>

              <div className={styles.copy}>
                <span className={styles.badge}>{step.step}</span>
                <div className={styles.titleRow}>
                  <span className={styles.titleRule} aria-hidden="true" />
                  <h3 className={styles.cardTitle}>
                    <Lines lines={step.title} />
                  </h3>
                </div>
                <p className={styles.cardBody}>
                  <Lines lines={step.body} />
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className={styles.footer}>
          {earliestDeliveryLabel ? (
            <span className={styles.delivery}>
              <svg
                className={styles.calendar}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect x="3" y="4.5" width="18" height="16" rx="2" />
                <path d="M3 9h18" />
                <path d="M8 2.5v4" />
                <path d="M16 2.5v4" />
              </svg>
              <span>
                Earliest mainland UK delivery:{' '}
                <strong className={styles.deliveryDate}>{earliestDeliveryLabel}</strong>
              </span>
            </span>
          ) : null}

          <Button variant="dark" href="/menu">
            Build your box
          </Button>
        </div>
      </div>
    </section>
  );
}
