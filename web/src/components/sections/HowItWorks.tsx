import Image from 'next/image';

import { Button, Eyebrow, SectionHeading } from '@/components/ui';
import { HOW_IT_WORKS_STEPS } from '@/lib/content/marketing';

import styles from './HowItWorks.module.css';

interface HowItWorksProps {
  /** Pre-formatted delivery date, e.g. "6 August". */
  earliestDeliveryLabel: string;
}

/**
 * The four-step explainer: build the box, cook from scratch, deliver chilled,
 * heat and eat. Steps are content-driven; the delivery date is passed in so it
 * stays in step with the live cut-off rather than being baked into the markup.
 */
export function HowItWorks({ earliestDeliveryLabel }: HowItWorksProps) {
  return (
    <section id="howitworks" className={styles.section}>
      <div className="band">
        <div className={styles.intro}>
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
                  alt={step.title}
                  fill
                  sizes="(max-width: 620px) 100vw, (max-width: 960px) 50vw, 25vw"
                  className={styles.image}
                />
              </div>
              <span className={styles.badge}>{step.step}</span>
              <h3 className={styles.cardTitle}>
                {step.titleCompact ? (
                  <>
                    <span className={styles.titleFull}>{step.title}</span>
                    <span className={styles.titleCompact}>{step.titleCompact}</span>
                  </>
                ) : (
                  step.title
                )}
              </h3>
              <p className={styles.cardBody}>{step.body}</p>
            </li>
          ))}
        </ol>

        <p className={styles.delivery}>
          <svg className={styles.calendar} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="4.5" width="18" height="16" rx="2" />
            <path d="M3 9h18" />
            <path d="M8 2.5v4" />
            <path d="M16 2.5v4" />
          </svg>
          <span>Earliest UK-wide delivery: {earliestDeliveryLabel}</span>
        </p>

        <div className={styles.cta}>
          <Button variant="outline" href="/menu">
            Build your box
          </Button>
        </div>
      </div>
    </section>
  );
}
