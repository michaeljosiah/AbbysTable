import Link from 'next/link';

import type { ResolvedFaq, ResolvedFaqGroup } from '@/lib/content/deliveryFaqs';
import { CONTACT_HREF } from '@/lib/content/navigation';
import { questionCountLabel } from '@/lib/faq/search';

import { ExpandAllButton } from './ExpandAllButton';
import { FaqAnswer } from './FaqAnswer';
import styles from './Faq.module.css';
import { TOPICS_HEADING_ID, TOPICS_ID } from './ids';

/*
 * The FAQ browse view — the topic grid and the eight groups — plus "Still
 * need help?". Server Components: every question is in the page as real
 * markup, so Find-in-page, deep links (`#faq-delivery`) and no-JS reading all
 * work, and only "Expand all" hydrates. While a search runs, `FaqSearch`
 * hides them; it never unmounts them, so an answer someone opened is still
 * open when they come back.
 */

/**
 * "Choose a topic": a wrapping grid of jump links — it replaced a sideways
 * jump row that could not fit eight topics. Plain fragment anchors, so they
 * work before any JavaScript runs; counts are MEASURED from the groups,
 * never written in.
 */
export function FaqTopics({ groups }: { groups: ResolvedFaqGroup[] }) {
  return (
    <section id={TOPICS_ID} className={styles.topics} aria-labelledby={TOPICS_HEADING_ID}>
      <div className={styles.inner}>
        {/* tabIndex -1: "Browse all topics" may hand focus here (no ring). */}
        <h2 id={TOPICS_HEADING_ID} className={styles.h2} tabIndex={-1}>
          Choose a topic
        </h2>
        <p className={styles.topicsLede}>Jump to a section below to find the information you need.</p>
        <ul className={styles.topicGrid} role="list">
          {groups.map((group) => (
            <li key={group.id}>
              <a className={styles.topic} href={`#${group.anchor}`}>
                <span>
                  <span className={styles.topicName}>{group.title}</span>
                  <span className={styles.topicCount}>{questionCountLabel(group.questions.length)}</span>
                </span>
                <span className={styles.topicChevron} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** One question: a native disclosure, so it works with no script at all. */
export function FaqItem({ faq }: { faq: ResolvedFaq }) {
  return (
    <details className={styles.item}>
      <summary className={styles.summary}>
        <span>{faq.question}</span>
        <span className={styles.chevron} aria-hidden="true" />
      </summary>
      <div className={styles.answer}>
        <FaqAnswer blocks={faq.answer} />
      </div>
    </details>
  );
}

export function FaqGroups({ groups }: { groups: ResolvedFaqGroup[] }) {
  return (
    <section className={styles.groups} aria-label="Frequently asked questions">
      <div className={styles.inner}>
        {groups.map((group) => (
          <div key={group.id} id={group.anchor} className={styles.group} data-faq-group="">
            <div className={styles.groupHead}>
              <h2 className={styles.h2}>{group.title}</h2>
              <ExpandAllButton groupTitle={group.title} />
            </div>
            {group.questions.map((faq) => (
              <FaqItem key={faq.id} faq={faq} />
            ))}
            <a className={styles.backToTopics} href={`#${TOPICS_ID}`}>
              <span>Back to FAQ topics</span>
              <span className={styles.backArrow} aria-hidden="true">
                ↑
              </span>
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

/** "Still need help?" — the page's route to a person. */
export function FaqHelp() {
  return (
    <section className={styles.helpSection}>
      <div className={styles.inner}>
        <div className={styles.help}>
          <svg className={styles.helpIcon} width="30" height="30" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M6 4h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-6l-5 4v-4H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z" />
          </svg>
          <div className={styles.helpText}>
            <h2 className={styles.helpTitle}>Still need help?</h2>
            <p className={styles.helpBody}>
              If you can’t find what you’re looking for, we’re here to help.
            </p>
          </div>
          <Link href={CONTACT_HREF} className={`${styles.outlineCta} ${styles.helpCta}`}>
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}
