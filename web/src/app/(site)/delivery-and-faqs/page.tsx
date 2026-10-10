import type { Metadata } from 'next';

import { FaqGroups, FaqHelp, FaqTopics } from '@/components/delivery-faqs/FaqBrowse';
import { FaqSearch, type SearchableFaq } from '@/components/delivery-faqs/FaqSearch';
import { PostcodeChecker } from '@/components/delivery-faqs/PostcodeChecker';
import { getAonikClient } from '@/lib/aonik/client';
import {
  answerText,
  DELIVERY_HIGHLIGHTS,
  faqValues,
  resolveFaqGroups,
  type DeliveryHighlightIcon,
} from '@/lib/content/deliveryFaqs';
import { joinNotifyList } from '@/lib/delivery/actions';
import { resolveDeliveryFaqsData, type DeliveryFaqsPageData } from '@/lib/delivery/pageData';

import styles from './page.module.css';

/*
 * Delivery & FAQs (#23) — ported from design/Abby's Table - Delivery and
 * FAQs.dc.html; behaviour from the page behaviour guide §9, data from
 * frontend-backend-contract §3b–§3d. Spec: docs/specifications/delivery-and-faqs.md.
 *
 * An information page, not a sales page: no hero and NO mobile purchase bar —
 * its own conversion path is check postcode → confirm delivery → Build a Box,
 * and a persistent bar would compete with it. Its desktop header DOES
 * auto-hide: the design opts it in (`DESKTOP_AUTO_HIDE_PATHS`).
 *
 * Order: page head → postcode checker and its result → the four delivery
 * facts (from 1024 only) → FAQ search and results → topic grid → the eight
 * groups → "Still need help?".
 *
 * Server Component: the Aonik reads happen here, once, and every FAQ figure
 * is filled in before anything renders. Client Components only where state
 * lives — the checker, the search, and each group's "Expand all".
 */

const DESCRIPTION =
  'Answers to common questions about delivery, your food and your order, all in one place.';

export const metadata: Metadata = {
  title: "Delivery & FAQs — Abby's Table",
  description: DESCRIPTION,
  openGraph: { title: "Delivery & FAQs — Abby's Table", description: DESCRIPTION, locale: 'en_GB' },
};

async function loadPageData(): Promise<DeliveryFaqsPageData> {
  try {
    return await resolveDeliveryFaqsData(await getAonikClient());
  } catch (error) {
    // No client at all: the FAQs still render, without the checker.
    console.error('[delivery-and-faqs] Aonik unavailable; rendering without the checker', error);
    return { values: faqValues({}), checker: null, notify: null };
  }
}

export default async function DeliveryAndFaqsPage() {
  const data = await loadPageData();
  const groups = resolveFaqGroups(data.values);
  const faqs: SearchableFaq[] = groups.flatMap((group) =>
    group.questions.map((faq) => ({
      id: faq.id,
      question: faq.question,
      answerText: answerText(faq.answer),
      answer: faq.answer,
    })),
  );

  return (
    <>
      <section className={styles.head}>
        <div className={styles.inner}>
          <h1 className={styles.title}>Delivery &amp; FAQs</h1>
          <p className={styles.lede}>{DESCRIPTION}</p>
        </div>
      </section>

      {/* Only where a coverage lookup can answer (demo's placeholder areas;
          live, Aonik's — michaeljosiah/aonik#352). Never a checker that
          cannot check. */}
      {data.checker ? (
        <PostcodeChecker
          canLocate={data.checker.canLocate}
          notify={data.notify ? { action: joinNotifyList, consent: data.notify } : undefined}
        />
      ) : null}

      <DeliveryHighlights />

      <FaqSearch faqs={faqs} help={<FaqHelp />}>
        <FaqTopics groups={groups} />
        <FaqGroups groups={groups} />
      </FaqSearch>
    </>
  );
}

/**
 * The four delivery facts — from 1024 only. Content prioritisation, not
 * duplicate-and-hide: every fact is also in the Delivery and Storage answers
 * (build-handoff §3l), and `display: none` takes them out of the
 * accessibility tree too. Icons are decorative; each fact is in words.
 */
function DeliveryHighlights() {
  return (
    <section className={styles.highlights} aria-label="Delivery at a glance">
      <div className={styles.inner}>
        <ul className={styles.highlightList} role="list">
          {DELIVERY_HIGHLIGHTS.map((highlight) => (
            <li key={highlight.title} className={styles.highlight}>
              <HighlightIcon icon={highlight.icon} />
              <div>
                <p className={styles.highlightTitle}>{highlight.title}</p>
                <p className={styles.highlightBody}>{highlight.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The design's thin-stroke glyphs, in the Our standards language. */
function HighlightIcon({ icon }: { icon: DeliveryHighlightIcon }) {
  return (
    <svg
      className={styles.highlightIcon}
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icon === 'van' ? (
        <>
          <path d="M3 7h11v9H3z" />
          <path d="M14 10.5h3.6l2.9 3v2.5H14z" />
          <circle cx="7" cy="18" r="1.7" />
          <circle cx="17.2" cy="18" r="1.7" />
        </>
      ) : icon === 'calendar' ? (
        <>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
        </>
      ) : icon === 'box' ? (
        <>
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
          <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
        </>
      ) : (
        <>
          <path d="M20 4c0 8.5-5.2 13-12 13H5.5C5.5 8.5 10.7 4 17.5 4H20z" />
          <path d="M5 20.5c1.8-6 5.6-9.4 10.5-11.5" />
        </>
      )}
    </svg>
  );
}
