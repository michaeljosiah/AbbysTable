import Image from 'next/image';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import type { EnquiryAction } from '@/lib/contact/enquiry';
import { hoursRows, type OpeningHours } from '@/lib/contact/hours';
import { whatsAppHref, type SupportContact, type WhatsAppContact } from '@/lib/content/contact';
import { SOCIAL_LINKS } from '@/lib/content/navigation';

import { ContactForm } from './ContactForm';
import styles from './ContactView.module.css';
import { HoursButton, HoursDisclosureProvider, HoursPanel } from './HoursDisclosure';
import { HOURS_HEADING_ID, SEND_ID } from './ids';
import { OpenNow } from './OpenNow';

/**
 * Contact us — design/Abby's Table - Contact Us.dc.html; build-handoff
 * "Contact — what was settled"; behaviour guide §10.
 *
 * An information page like Delivery & FAQs: no hero and no mobile purchase
 * bar. Direct routes come before the form — someone who wants to phone should
 * not scroll past a form to find the number.
 *
 * The body is ONE 12-column grid, not a cards grid plus a form/sidebar grid:
 * the opening-hours block sits under the Phone card on a phone and at the top
 * of the sidebar from 1024, and CSS can only move a cell within the SAME grid.
 * Nothing is duplicated and nothing is moved with script. DOM order is the
 * phone order — WhatsApp, Email, the "Send a message" jump, Phone, hours, then
 * the onward routes and the form; from 1024 every cell is placed explicitly
 * (the design's composition: the form left, the routing sidebar right).
 *
 * What it shows is decided by configuration, never by the design's
 * placeholders (props, so every state is testable):
 * - each contact detail that is `null` is marked "to be confirmed" and is not
 *   a link — no mailto:, tel: or wa.me with nothing behind it;
 * - no hours, no "Open now / Closed": the status is computed in the browser
 *   from configured hours only;
 * - no send action, no form (aonik#356): the heading stays and says so;
 * - the FAQs card and the Private Table panel appear once their pages do.
 */
export interface ContactViewProps {
  /** Email and phone — `SUPPORT_CONTACT`. */
  support: SupportContact | null;
  whatsapp: WhatsAppContact | null;
  hours: OpeningHours | null;
  /**
   * Delivery & FAQs, once it has a page of its own. While it resolves to this
   * page (#23 not built), `null`: the card would link to itself.
   */
  faqsHref: string | null;
  /** The Private Table waitlist (#25), or `null` while there is none. */
  waitlistHref: string | null;
  /** A REAL send action, or nothing — and then no form. */
  sendAction?: EnquiryAction;
}

/* ---- Pieces ------------------------------------------------------------------------ */

/** A value the owner still has to supply: marked, so it cannot ship unnoticed. */
function Tbc({ children = 'to be confirmed' }: { children?: ReactNode }) {
  return (
    <span className={styles.tbc} data-tbc="config">
      {children}
    </span>
  );
}

function Arrow() {
  return (
    <span className={styles.arrow} aria-hidden="true">
      →
    </span>
  );
}

const ICONS = {
  whatsapp: (
    <>
      <path d="M20.5 11.6a8.4 8.4 0 0 1-12.3 7.4L3.5 20.5l1.6-4.6a8.4 8.4 0 1 1 15.4-4.3z" />
      <path d="M8.8 9.2c0 3.2 2.6 5.8 5.8 5.8" />
    </>
  ),
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 8l9 6 9-6" />
    </>
  ),
  form: (
    <>
      <path d="M4 20.5l1-4.2L16.2 5.1a2 2 0 0 1 2.8 0l.9.9a2 2 0 0 1 0 2.8L8.7 19.5z" />
      <path d="M14.6 6.7l2.7 2.7" />
    </>
  ),
  phone: (
    <path d="M6.5 3.5h3l1.5 4-2 1.3a10.5 10.5 0 0 0 5.2 5.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z" />
  ),
  faqs: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.8M12 16.8h.01" />
    </>
  ),
};

/** A card's label row: a brass-ink identity mark and a 13px caps label. */
function Eyebrow({ icon, children }: { icon: keyof typeof ICONS; children: ReactNode }) {
  return (
    <span className={styles.eyebrowRow}>
      <svg
        className={styles.eyebrowIcon}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICONS[icon]}
      </svg>
      <span className={styles.eyebrow}>{children}</span>
    </span>
  );
}

/** "hello@domain": wraps only after the "@" — never mid-domain, never shrunk. */
function EmailValue({ email }: { email: string }) {
  const at = email.indexOf('@');
  return (
    <span className={`${styles.value} ${styles.valueEmail}`}>
      {/* ONE child: as two flex items the gap opened a hole either side of the
          zero-width space, and a ZWSP is no break between flex items. */}
      <span className={styles.emailText}>
        {at === -1 ? (
          <>
            {email} <Arrow />
          </>
        ) : (
          <>
            {email.slice(0, at + 1)}
            {'​'}
            <span className={styles.nowrap}>
              {email.slice(at + 1)} <Arrow />
            </span>
          </>
        )}
      </span>
    </span>
  );
}

/* ---- The page ---------------------------------------------------------------------- */

export function ContactView({
  support,
  whatsapp,
  hours,
  faqsHref,
  waitlistHref,
  sendAction,
}: ContactViewProps) {
  const onward = Boolean(faqsHref || waitlistHref);
  const anyDirectRoute = Boolean(whatsapp || support);

  const whatsappBody = (
    <>
      <span className={styles.waText}>
        <Eyebrow icon="whatsapp">WhatsApp</Eyebrow>
        {whatsapp ? (
          <span className={styles.value}>
            <span>
              Message us <Arrow />
            </span>
          </span>
        ) : (
          <span className={styles.value}>
            <Tbc>number to be confirmed</Tbc>
          </span>
        )}
        {whatsapp ? <span className={styles.note}>Usually the quickest way to reach us.</span> : null}
      </span>
      {/* The route appears once: the code lives inside the card. Desktop
          only — on a phone the card opens the app, and a code you would scan
          with the same phone is no use. Decorative for assistive tech: the
          card itself is the link. */}
      {whatsapp?.qrSrc ? (
        <>
          <span className={styles.qrRule} aria-hidden="true" />
          <span className={styles.qr} aria-hidden="true">
            <Image
              src={whatsapp.qrSrc}
              alt=""
              width={96}
              height={96}
              // A QR code's modules must arrive exactly as drawn: no re-encode.
              unoptimized
              className={styles.qrImage}
            />
            <span className={styles.qrCaption}>
              Scan with
              <br />
              your phone
            </span>
          </span>
        </>
      ) : null}
    </>
  );

  return (
    <>
      {/* The page head is centred as one unit; the body stays left-aligned —
          centred labels and card content would hurt scanning. */}
      <section className={styles.head}>
        <div className={styles.inner}>
          <h1 className={styles.title}>Contact us</h1>
          <p className={styles.kicker}>Choose the way you&rsquo;d prefer to get in touch.</p>
          <p className={styles.lede}>A member of our team will respond as soon as possible.</p>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.inner}>
          <HoursDisclosureProvider>
            <div className={styles.grid} data-faqs={faqsHref ? undefined : 'none'}>
              {/* WhatsApp: the highlighted card. Same tab, no prefilled
                  message, nothing about an order passed. */}
              {whatsapp ? (
                <a className={`${styles.method} ${styles.methodWa}`} href={whatsAppHref(whatsapp)}>
                  {whatsappBody}
                </a>
              ) : (
                <div className={`${styles.method} ${styles.methodWa}`}>{whatsappBody}</div>
              )}

              {support ? (
                <a className={`${styles.method} ${styles.methodEmail}`} href={`mailto:${support.email}`}>
                  <Eyebrow icon="email">Email</Eyebrow>
                  <EmailValue email={support.email} />
                  <span className={styles.note}>Send us an email</span>
                </a>
              ) : (
                <div className={`${styles.method} ${styles.methodEmail}`}>
                  <Eyebrow icon="email">Email</Eyebrow>
                  <span className={styles.value}>
                    <Tbc>address to be confirmed</Tbc>
                  </span>
                  <span className={styles.note}>Send us an email</span>
                </div>
              )}

              {/* Phone layout only: the form is further down this page, so
                  this is an in-page jump, not a separate view. Only while
                  there is a form to jump to. */}
              {sendAction ? (
                <a className={`${styles.method} ${styles.methodForm}`} href={`#${SEND_ID}`}>
                  <Eyebrow icon="form">Contact form</Eyebrow>
                  <span className={styles.value}>
                    <span>
                      Send a message <Arrow />
                    </span>
                  </span>
                  <span className={styles.note}>Best for detailed questions or attachments</span>
                </a>
              ) : null}

              {/* A div, not a link: it holds two destinations — the number,
                  and "See opening hours". */}
              <div
                className={`${styles.method} ${styles.methodPhone}${sendAction ? '' : ` ${styles.methodWide}`}`}
              >
                <Eyebrow icon="phone">Phone</Eyebrow>
                {support ? (
                  <a className={styles.phoneLink} href={`tel:${support.phone.e164}`}>
                    <span className={styles.phoneNumber}>{support.phone.display}</span>
                    <Arrow />
                  </a>
                ) : (
                  <span className={styles.value}>
                    <Tbc>number to be confirmed</Tbc>
                  </span>
                )}
                <span className={styles.note}>
                  UK number <span className={styles.noteDivider} aria-hidden="true" />{' '}
                  {/* An inline link in body copy: exempt from the 44px target —
                      padding an inline-block would inflate the line box. */}
                  <HoursButton
                    className={styles.hoursLink}
                    labelClassName={styles.hoursLabel}
                    chevronClassName={styles.hoursChevron}
                  />
                </span>
              </div>

              <HoursPanel className={styles.hours}>
                <div className={styles.hoursClip}>
                  <div className={styles.hoursBox} data-hours-box="">
                    {/* Shown from 1024, where the block heads the sidebar; on a
                        phone the Phone card's control names it. */}
                    <h2 id={HOURS_HEADING_ID} className={styles.hoursHeading} tabIndex={-1}>
                      Opening hours
                    </h2>
                    {hours ? (
                      <>
                        {/* The space is reserved, so the status arriving after
                            hydration moves nothing. */}
                        <p className={styles.status}>
                          <OpenNow hours={hours} className={styles.open} dotClassName={styles.dot} />
                        </p>
                        <dl className={styles.hoursTable}>
                          {hoursRows(hours.weekly).map((row) => (
                            <Fragment key={row.days}>
                              <dt>{row.days}</dt>
                              <dd data-closed={row.hours ? undefined : ''}>{row.hours ?? 'Closed'}</dd>
                            </Fragment>
                          ))}
                        </dl>
                        <p className={styles.hoursNote}>
                          {hours.bankHolidays.length > 0 ? 'Closed on bank holidays. ' : ''}UK time.
                        </p>
                      </>
                    ) : (
                      <p className={styles.hoursNote}>
                        <Tbc>Opening hours to be confirmed</Tbc>
                      </p>
                    )}
                  </div>
                </div>
              </HoursPanel>

              {/* Phone layout only: the onward routes are a different kind of
                  thing from the direct ones, so they get their own heading. */}
              {onward ? (
                <div className={styles.specific}>
                  <h2 className={styles.sectionTitle}>Looking for something specific?</h2>
                  <p className={styles.specificText}>You might find what you need here.</p>
                </div>
              ) : null}

              {faqsHref ? (
                <Link className={`${styles.method} ${styles.methodFaqs}`} href={faqsHref}>
                  <Eyebrow icon="faqs">
                    FAQ<span className={styles.lower}>s</span>
                  </Eyebrow>
                  <span className={styles.value}>
                    <span>
                      Browse our FAQs <Arrow />
                    </span>
                  </span>
                  <span className={styles.note}>Delivery, dishes, orders, storage and more.</span>
                </Link>
              ) : null}

              {/* One panel, in the homepage Private Table band's own
                  treatment: the navy ground is what makes the service
                  recognisable. Brass on navy is the accepted 4.1:1 Private
                  Table exception (design/CLAUDE.md) — revisit with the band. */}
              {waitlistHref ? (
                <div className={styles.ptCol}>
                  <div className={styles.pt}>
                    <p className={styles.ptEyebrow}>Abby&rsquo;s Private Table</p>
                    <p className={styles.ptTitle}>Interested in Private Table?</p>
                    <div className={styles.ptRule} aria-hidden="true">
                      <span className={styles.ptLine} />
                      <span className={styles.ptLozenge}>◆</span>
                      <span className={styles.ptLine} />
                    </div>
                    <p className={styles.ptText}>
                      Join the waitlist and we&rsquo;ll let you know when consultations open.
                    </p>
                    <div className={styles.ptAction}>
                      <Link href={waitlistHref} className={styles.ptCta}>
                        Join the waitlist
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className={styles.formCol} id={SEND_ID}>
                <h2 className={styles.sectionTitle}>Send us a message</h2>
                {sendAction ? (
                  <ContactForm action={sendAction} />
                ) : (
                  // Held back until Aonik can accept an enquiry (aonik#356):
                  // never a form that thanks someone for a message that went
                  // nowhere (the newsletter's rule, #6).
                  <div className={styles.heldBack}>
                    <p className={styles.heldBackText}>Our message form isn&rsquo;t available yet.</p>
                    {anyDirectRoute ? (
                      <p className={styles.heldBackText}>Please use one of the ways above to get in touch.</p>
                    ) : (
                      // Nothing above works yet either: every "contact us" on
                      // the site lands here, so it must not be a dead end. The
                      // brand's social accounts are the route that does.
                      <p className={styles.heldBackText}>
                        In the meantime, you can reach us on{' '}
                        {SOCIAL_LINKS.map(({ network, label, href }, index) => (
                          <Fragment key={network}>
                            {index === 0 ? '' : index === SOCIAL_LINKS.length - 1 ? ' or ' : ', '}
                            <a href={href} target="_blank" rel="noopener noreferrer" className={styles.heldBackLink}>
                              {label}
                            </a>
                          </Fragment>
                        ))}
                        .
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </HoursDisclosureProvider>
        </div>
      </section>
    </>
  );
}
