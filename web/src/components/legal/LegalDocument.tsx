import type { ReactNode } from 'react';

import type { LegalDocument as LegalDocumentData } from '@/lib/legal/document';

import { LEGAL_TOP_ID } from './ids';
import styles from './LegalDocument.module.css';
import { LegalFloat, LegalIndex, LegalNavigation } from './LegalNavigation';

/*
 * A long legal document page: Terms of Sale, the Privacy Policy.
 *
 * ONE continuous document — every section is always in the server-rendered
 * page, so browser Find, printing, indexing, deep links and a page without
 * JavaScript all work — with a grouped index that is navigation over it
 * (design/CLAUDE.md, "Long documents"). The navigation is the only client
 * code: `LegalNavigation` wraps the document and owns the index, the phone's
 * bottom sheet and floating Sections / Top pair, the scroll-spy and the URL.
 *
 * An information page: no hero, no purchase bar, and NOT opted into the
 * desktop header auto-hide (design/CLAUDE.md, "Desktop marketing header").
 */

/**
 * The print treatment for the site chrome. Everything in <body> except <main>
 * — header, drawer, footer, the cookie layer — comes off the
 * page. It is a <style> element rather than a CSS Module rule because it must
 * reach outside this page's own markup, and it exists only while a legal
 * document is mounted: print CSS is a named two-page list, never site-wide.
 */
const PRINT_CHROME =
  'body>:not(main){display:none!important}body{background:var(--white)!important}';

interface LegalDocumentProps<Slug extends string> {
  doc: LegalDocumentData;
  title: string;
  /** The 18px lede under the title. */
  lede: ReactNode;
  /** An emphasised line under the lede (Terms: the statutory-rights statement). */
  statement?: ReactNode;
  /** As printed: "6 September 2026". */
  lastUpdated: string;
  /** In-copy link ink: brass-ink on Terms of Sale, green-forest on the Privacy Policy. */
  linkTone: 'brass' | 'green';
  /** One body per section, keyed by slug — the type makes a missing one a build error. */
  bodies: Record<Slug, ReactNode>;
  /** An unnumbered closing group after the numbered ones (Privacy: "About this policy"). */
  closing?: { group: string; title: string; body: ReactNode };
}

export function LegalDocument<Slug extends string>({
  doc,
  title,
  lede,
  statement,
  lastUpdated,
  linkTone,
  bodies,
  closing,
}: LegalDocumentProps<Slug>) {
  return (
    <LegalNavigation doc={doc} linkTone={linkTone}>
      <style media="print">{PRINT_CHROME}</style>
      <section className={styles.section}>
        <div className={styles.inner}>
          <h1 id={LEGAL_TOP_ID} className={styles.title} tabIndex={-1}>
            {title}
          </h1>
          <p className={styles.lede}>{lede}</p>
          {statement ? <p className={styles.statement}>{statement}</p> : null}
          <p className={styles.updated}>Last updated: {lastUpdated}</p>

          <div className={styles.grid}>
            <LegalIndex />

            <div>
              {doc.groups.map((group) => (
                <div key={group.title} className={styles.docGroup}>
                  <h2 className={styles.groupTitle}>{group.title}</h2>
                  {group.sections.map((section) => (
                    <div key={section.slug} id={section.slug} className={styles.docSection}>
                      <h3 className={styles.heading}>
                        <span className={styles.number} aria-hidden="true">
                          {section.n}.
                        </span>
                        <span>{section.title}</span>
                      </h3>
                      {bodies[section.slug as Slug]}
                      <BackToTop />
                    </div>
                  ))}
                </div>
              ))}

              {closing ? (
                <div className={`${styles.docGroup} ${styles.closing}`}>
                  <h2 className={styles.groupTitle}>{closing.group}</h2>
                  <div className={styles.docSection}>
                    <h3 className={styles.heading}>
                      <span>{closing.title}</span>
                    </h3>
                    {closing.body}
                    <BackToTop />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
      <LegalFloat />
    </LegalNavigation>
  );
}

/** One per section, at the end of its copy: in a long document the top is a long way back. */
function BackToTop() {
  return (
    <div className={styles.backToTopRow}>
      <a href={`#${LEGAL_TOP_ID}`} className={styles.backToTop}>
        <span className={styles.backToTopLabel}>Back to top</span>
        <span className={styles.backToTopArrow} aria-hidden="true">
          &#8593;
        </span>
      </a>
    </div>
  );
}
