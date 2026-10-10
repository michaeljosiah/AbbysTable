import Image from 'next/image';

import { purchaseBarClasses } from '@/components/purchase-bar/classes';
import { PurchaseBarShell } from '@/components/purchase-bar/PurchaseBarShell';
import { KeepCompounds } from '@/components/sections/KeepTogether';
import {
  PRIVATE_TABLE_CREDENTIALS,
  PRIVATE_TABLE_FROM_PENCE,
  WAITLIST_SECTION_ID,
} from '@/lib/content/marketing';
import {
  JOIN_WAITLIST_LABEL,
  PRIVATE_TABLE_ASSURANCES,
  PRIVATE_TABLE_AUDIENCES,
  PRIVATE_TABLE_CONFIDENTIALITY,
  PRIVATE_TABLE_SERVICES,
  PRIVATE_TABLE_STEPS,
} from '@/lib/content/privateTable';
import { formatPrice } from '@/lib/format';
import type { WaitlistAction } from '@/lib/private-table/waitlist';
import { STOP_ON_ENTRY } from '@/lib/purchase-bar/visibility';
import type { SignupConsent } from '@/lib/signup/consent';

import { SectionJump, WaitlistChoiceProvider } from './WaitlistChoice';
import { WaitlistForm } from './WaitlistForm';
import styles from './PrivateTableView.module.css';

/** "What we offer" — Find out more's destination. */
export const SERVICES_SECTION_ID = 'services';

/*
 * Photography is placeholder (#38): the design's own AI-generated hero
 * (design/assets/private-table-hero-1120.jpg — a 1120×1084 JPEG, 2× the
 * ~560px desktop column), with the design's alt text.
 */
const HERO_IMAGE = '/assets/private-table/private-table-hero-1120.jpg';
const HERO_ALT = 'Nigerian ingredients laid out around a tablet showing a bespoke menu';
/* A square under the headline on a phone and up to 1023 (the column, less
   the gutters); the second column from 1024. */
const HERO_SIZES = '(min-width: 1024px) 560px, (min-width: 640px) calc(100vw - 68px), calc(100vw - 44px)';

/** Splits "£1,500" into the sans "£" and the display numerals (design: `.pt-cur`). */
function splitPrice(pence: number): { symbol: string; amount: string } {
  const formatted = formatPrice(pence);
  const symbol = formatted.match(/^\D+/)?.[0] ?? '';
  return { symbol, amount: formatted.slice(symbol.length) };
}

function LockGlyph({ className }: { className: string }) {
  return (
    <svg className={className} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </svg>
  );
}

function Tick({ className, size = 17, weight = 2.2 }: { className: string; size?: number; weight?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

function ArrowDown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v13M6.5 12.5 12 18l5.5-5.5" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 12h14M13 6.5 18.5 12 13 17.5" />
    </svg>
  );
}

export interface PrivateTableViewProps {
  /**
   * The join action and the published list's consent — given ONLY when the
   * waitlist can really store an entry (`waitlistList`; aonik#357). Without it
   * the page offers no form and no "Join the waitlist" anywhere, and says the
   * waitlist is not open yet.
   */
  waitlist?: { action: WaitlistAction; consent: SignupConsent };
}

/**
 * Abby's Private Table (#25) — design/Abby's Table - Private Table v2.dc.html
 * (approved); behaviour guide §8. A WAITLIST, not a booking: consultations are
 * not open, so every call to action reads "Join the waitlist", the
 * confirmation promises no date and no reply time, and nothing here routes
 * into the food-box journey.
 *
 * Navy hero ("Coming soon", the credentials, "Private Table from £1,500") →
 * Who it's for → What we offer (the Included band and two service cards, a
 * peeking carousel on a phone) → How it works (four steps) → Register your
 * interest. Server-rendered; the client pieces are the form, its country
 * combobox, the jumps that take focus with them, and the mobile bar.
 *
 * Plain `--brass` for small type on navy is the KNOWN, ACCEPTED 4.08:1
 * exception shared with the homepage band (design/CLAUDE.md) — the two are
 * revisited together or not at all.
 *
 * The mobile bar (#12, the waitlist variant) waits for the WHOLE hero to go
 * (its CTA sits below the fold on a phone) and stands down as soon as the
 * enquiry section is on screen (`data-purchase-bar-stop="entry"`), through
 * the footer. Only while the waitlist is open.
 */
export function PrivateTableView({ waitlist }: PrivateTableViewProps) {
  const open = Boolean(waitlist);
  const fromLine = `Private Table from ${formatPrice(PRIVATE_TABLE_FROM_PENCE)}`;

  return (
    <WaitlistChoiceProvider>
      <section className={styles.hero} data-purchase-bar-reveal="">
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            {/* A status mark, not an eyebrow: it changes what the whole page means. */}
            <span className={styles.soon}>Coming soon</span>
            <h1 className={styles.h1}>Abby’s Private Table</h1>
            <p className={styles.lede}>
              We develop a collection of Nigerian fusion recipes around your nutritional needs,
              wherever you are in the world. If you’re in the UK, your approved dishes can also be
              prepared and delivered to you.
            </p>
            <p className={styles.conf}>
              <LockGlyph className={styles.confGlyph} />
              {PRIVATE_TABLE_CONFIDENTIALITY}
            </p>
          </div>

          {/* Geometry reserved before the image loads: square on a phone,
              stretched to the copy column from 1024. */}
          <div className={styles.heroMedia}>
            <Image
              src={HERO_IMAGE}
              alt={HERO_ALT}
              fill
              priority
              fetchPriority="high"
              sizes={HERO_SIZES}
              className={styles.heroImage}
            />
          </div>

          {/* The credentials — read before the actions: they are what make
              the waitlist worth joining. Regulated claims (#38). */}
          <dl className={styles.facts}>
            {PRIVATE_TABLE_CREDENTIALS.map((credential) => (
              <div key={credential.role} className={styles.fact}>
                <dt className={styles.factLabel}>{credential.role}</dt>
                <dd className={styles.factValue}>
                  <KeepCompounds text={credential.name} />
                </dd>
              </div>
            ))}
          </dl>

          <div className={styles.actions}>
            {/* The price line belongs to the button, so it centres under it. */}
            <span className={styles.ctaWrap}>
              {open ? (
                <SectionJump targetId={WAITLIST_SECTION_ID} className={styles.heroCta}>
                  {JOIN_WAITLIST_LABEL}
                </SectionJump>
              ) : null}
              <span className={styles.from} data-alone={open ? undefined : ''}>
                {fromLine}
              </span>
            </span>
            {/* "What am I joining for?" — the two services. */}
            <SectionJump targetId={SERVICES_SECTION_ID} className={styles.more}>
              <span className={styles.moreInner}>
                Find out more
                <ArrowDown />
              </span>
            </SectionJump>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.shell}>
          <h2 className={styles.h2}>Who it’s for</h2>
          <p className={styles.intro}>
            When treatment, recovery, performance or changing nutritional needs reshape how you eat,
            the food you love can be rethought rather than given up.
          </p>
          <ul className={styles.audiences} role="list">
            {PRIVATE_TABLE_AUDIENCES.map((audience) => (
              <li key={audience.n} className={styles.audience}>
                <div className={styles.audienceTop}>
                  <span className={styles.num} aria-hidden="true">
                    {audience.n}
                  </span>
                  <h3 className={styles.audienceTitle}>{audience.title}</h3>
                </div>
                <p className={styles.audienceBody}>{audience.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={SERVICES_SECTION_ID} className={`${styles.section} ${styles.services}`}>
        <div className={styles.shell}>
          {/* Focused by "Find out more": a reading start, not a control. */}
          <h2 className={styles.h2} tabIndex={-1} data-jump-focus="">
            What we offer
          </h2>
          <p className={styles.intro}>
            Two ways to work with Abby’s Table. Both built around your nutritional needs, with
            expert oversight and optional ongoing support.
          </p>
          <p className={`${styles.conf} ${styles.confLight}`}>
            <LockGlyph className={styles.confGlyph} />
            {PRIVATE_TABLE_CONFIDENTIALITY}
          </p>

          {/* Stated once, above both cards: the same in either service. */}
          <div className={styles.included}>
            <p className={styles.includedLabel}>Included with both services</p>
            <ul className={styles.includedList} role="list">
              {PRIVATE_TABLE_ASSURANCES.map((assurance) => (
                <li key={assurance} className={styles.includedItem}>
                  <span className={styles.includedTick} aria-hidden="true">
                    <Tick className={styles.includedTickGlyph} size={16} weight={2.6} />
                  </span>
                  {/* One flex item: the held compound must not become its own. */}
                  <span>
                    <KeepCompounds text={assurance} />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* A peeking carousel on a phone (the second card shows at the
              edge), two columns from 640 — one grid throughout, so the cards'
              rows line up in both (subgrid). While the waitlist is closed the
              cards hold nothing focusable, so the scroller itself is a tab
              stop: a keyboard can still reach the second card. */}
          <ul
            className={styles.cards}
            role="list"
            aria-label="The two services"
            tabIndex={open ? undefined : 0}
            data-cta={open ? '' : undefined}
          >
            {PRIVATE_TABLE_SERVICES.map((service) => {
              const price = splitPrice(service.fromPence);
              return (
                <li key={service.service} className={styles.card} data-tone={service.tone}>
                  <span className={styles.cardHead}>
                    <span className={styles.cardLabel}>{service.label}</span>
                    <span className={styles.pill}>{service.region}</span>
                  </span>
                  <h3 className={styles.cardTitle}>{service.title}</h3>
                  <p className={styles.price}>
                    <span className={styles.pricePre}>From</span>{' '}
                    <span className={styles.priceSymbol}>{price.symbol}</span>
                    {price.amount}
                  </p>
                  <p className={styles.cardBody}>{service.body}</p>
                  <ul className={styles.points} role="list">
                    {service.points.map((point) => (
                      <li key={point} className={styles.point}>
                        <Tick className={styles.pointTick} />
                        <span>
                          <KeepCompounds text={point} />
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className={styles.support}>
                    <span className={styles.supportLabel}>{service.supportLabel}</span>
                    <span className={styles.supportBody}>{service.support}</span>
                  </p>
                  {open ? (
                    <SectionJump
                      targetId={WAITLIST_SECTION_ID}
                      service={service.service}
                      className={styles.cardCta}
                    >
                      <span className={styles.cardCtaInner}>
                        {JOIN_WAITLIST_LABEL}
                        <ArrowRight />
                      </span>
                    </SectionJump>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className={`${styles.section} ${styles.process}`}>
        <div className={styles.shell}>
          <h2 className={`${styles.h2} ${styles.h2Light}`}>How it works</h2>
          <p className={`${styles.intro} ${styles.introLight}`}>
            A private, collaborative process for Recipe Development and Meal Preparation clients.
          </p>
          <ol className={styles.steps}>
            {PRIVATE_TABLE_STEPS.map((step) => (
              <li key={step.n} className={styles.step}>
                <span className={styles.stepRail} aria-hidden="true">
                  <span className={styles.stepLine} />
                  <span className={styles.stepNum}>{step.n}</span>
                </span>
                <h3 className={styles.stepTitle}>
                  <KeepCompounds text={step.title} />
                </h3>
                <ul className={styles.stepPoints} role="list">
                  {step.points.map((point) => (
                    <li key={point} className={styles.stepPoint}>
                      <Tick className={styles.stepTick} size={15} />
                      <span>
                        <KeepCompounds text={point} />
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The form offers the bar's own action, so the bar stands down as soon
          as any of this section is on screen — and stays down through the
          footer. */}
      <section
        id={WAITLIST_SECTION_ID}
        className={`${styles.section} ${styles.enquire}`}
        data-purchase-bar-stop={STOP_ON_ENTRY}
      >
        <div className={styles.shell}>
          {/* Focused by every "Join the waitlist": a reading start, not a control. */}
          <h2 className={`${styles.h2} ${styles.centre}`} tabIndex={-1} data-jump-focus="">
            Register your interest
          </h2>
          {waitlist ? (
            <>
              <p className={`${styles.intro} ${styles.centre}`}>
                Tell us which Private Table service interests you and we’ll let you know when
                consultations open.
              </p>
              <div className={styles.panel}>
                <WaitlistForm action={waitlist.action} consent={waitlist.consent} />
              </div>
            </>
          ) : (
            // Held back while Aonik cannot store an entry (no published list,
            // aonik#357): never a form that thanks someone for a name that
            // went nowhere (#6).
            <p className={`${styles.intro} ${styles.centre}`}>
              The Private Table waitlist isn’t open yet.
            </p>
          )}
        </div>
      </section>

      {open ? (
        <PurchaseBarShell layout="centre">
          <SectionJump targetId={WAITLIST_SECTION_ID} className={purchaseBarClasses.cta}>
            {JOIN_WAITLIST_LABEL}
          </SectionJump>
        </PurchaseBarShell>
      ) : null}
    </WaitlistChoiceProvider>
  );
}
