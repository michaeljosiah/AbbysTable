import type { Metadata } from 'next';
import Link from 'next/link';

// "Browse our FAQs" is Delivery & FAQs, as in the design (it takes Contact's
// destination until its own page lands, #23); both "contact us" links are
// Contact.
import { CONTACT_HREF, DELIVERY_FAQS_HREF, MENU_ITEM } from '@/lib/content/navigation';

import styles from './page.module.css';

/*
 * Allergens — ported from design/Abby's Table - Allergens.dc.html.
 *
 * EVERY WORD OF SAFETY COPY ON THIS PAGE IS PLACEHOLDER pending food-safety
 * sign-off (design/build-handoff.md, open items): the cross-contamination
 * statement in the notice, and the operational claims under "Our approach" —
 * separate storage, careful preparation and thorough cleaning, and a team
 * trained to manage allergens. The copy is the client's, verbatim. Do not
 * reword it, and do not add to it, until whoever owns food safety signs it off.
 *
 * Dish-level allergen data is out of scope here (michaeljosiah/aonik#351): this
 * page names the regulated 14 and makes no claim about any individual dish.
 *
 * An information page, like Delivery & FAQs and Contact: no hero, no purchase
 * bar, and NOT opted into the desktop header auto-hide, which is reserved for
 * marketing/editorial pages (design/CLAUDE.md, "Desktop marketing header").
 */

const DESCRIPTION =
  'We take allergens seriously and follow strict procedures in our kitchen. This page provides information about the 14 major allergens used in our dishes.';

export const metadata: Metadata = {
  title: "Allergens — Abby's Table",
  description: DESCRIPTION,
  // Its own share card; the root one carries the homepage's copy.
  openGraph: { title: "Allergens — Abby's Table", description: DESCRIPTION, locale: 'en_GB' },
};

/**
 * The UK regulated 14, verbatim and in the mockup's order.
 *
 * A plain list, not links or buttons: there is no per-allergen destination, so
 * no icons and no chevrons either — a chevron on an inert item promises
 * something the page cannot deliver. If per-allergen detail is added later the
 * items become buttons with disclosure panels; the grid does not change.
 */
const REGULATED_ALLERGENS = [
  'Celery',
  'Cereals containing gluten',
  'Crustaceans',
  'Eggs',
  'Fish',
  'Lupin',
  'Milk',
  'Molluscs',
  'Mustard',
  'Nuts',
  'Peanuts',
  'Sesame',
  'Soya',
  'Sulphur dioxide and sulphites',
] as const;

export default function AllergensPage() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div>
            <h1 className={styles.title}>Allergens</h1>
            <p className={styles.lede}>
              We take allergens seriously and follow strict procedures in our kitchen. This page
              provides information about the 14 major allergens used in our dishes.
            </p>

            <h2 className={styles.listHeading}>The 14 major allergens</h2>
            <p className={styles.listIntro}>
              Our dishes may contain, or be prepared in an environment where the following
              allergens are present.
            </p>

            {/* role="list": `list-style: none` drops list semantics in Safari/VoiceOver. */}
            <ul className={styles.list} role="list">
              {REGULATED_ALLERGENS.map((allergen) => (
                <li key={allergen} className={styles.item}>
                  {allergen}
                </li>
              ))}
            </ul>

            {/*
             * The legally load-bearing notice. Its own blush panel so it cannot
             * be read as supporting copy, and every point is stated in words
             * rather than relying on the icon. Emphasis marks the ACTION in each
             * paragraph — what the reader must do, or the limit of what they may
             * assume — so it is semantic <strong>, not bold for weight. The
             * final line is a legal backstop rather than an instruction, so a
             * brass hairline sets it apart.
             */}
            <div className={styles.notice}>
              <div className={styles.noticeHead}>
                <svg
                  className={styles.noticeIcon}
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5.5M12 7.6h.01" />
                </svg>
                <h2 className={styles.noticeHeading}>Important allergen information</h2>
              </div>

              <p className={styles.noticeText}>
                <strong>
                  Allergens contained in each dish are clearly identified on our website before
                  you order and provided again with your food when it is delivered.
                </strong>{' '}
                Recipes, ingredients and suppliers can change, so please check the current
                allergen information for every dish when ordering and check the information
                supplied with your delivery again before eating. This is especially important if
                you are ordering for someone else.
              </p>
              <p className={styles.noticeText}>
                We have procedures in place to manage allergens and reduce the risk of unintended
                cross-contact. However, different allergens are handled within our kitchen. Where
                our allergen risk assessment identifies an unavoidable risk of cross-contact that
                cannot be adequately controlled, we will clearly identify the specific allergen
                using appropriate precautionary wording, such as{' '}
                <strong>“may contain [allergen]”</strong>. Precautionary warnings are based on
                assessed risk and are not used as a substitute for good food-safety practices.
              </p>
              <p className={styles.noticeText}>
                Unless a product is expressly described as <strong>free from</strong> a particular
                allergen, you should not assume that it is suitable for someone who needs to
                completely avoid that allergen. Terms such as{' '}
                <strong>vegan, vegetarian or plant-led do not mean allergen-free.</strong>
              </p>
              <p className={styles.noticeText}>
                <strong>
                  If you have a food allergy or intolerance, please review the allergen
                  information carefully before placing your order. If anything is unclear, or you
                  have a severe allergy or specific concern,{' '}
                  {/* Inline in body copy, so exempt from the 44px target: padding an
                      inline-block would inflate the line box (design/CLAUDE.md). */}
                  <Link href={CONTACT_HREF} className={styles.inlineLink}>
                    contact us
                  </Link>{' '}
                  before ordering.
                </strong>
              </p>
              <p className={styles.noticeText}>
                <strong>
                  If the allergen information supplied with your delivery differs from information
                  you previously viewed online, or if a label is missing, damaged or unclear, do
                  not eat the dish until you have contacted us and we have confirmed the
                  information.
                </strong>
              </p>
              <p className={styles.noticeBackstop}>
                Nothing in this notice limits Abby’s Table’s responsibilities under food-safety or
                consumer law.
              </p>
            </div>
          </div>

          {/*
           * Sidebar on desktop; a continuation of the page on mobile, in the SAME
           * DOM order at every width: Our approach, Need more help, Useful links.
           * After the caveat it reads as an escalation — how we handle allergens,
           * then a person, then links. The mockup leads with "Need more help",
           * but swapping with flex `order` desyncs visual and DOM order, and both
           * panels hold links, so tab focus would jump back up the page (WCAG
           * 2.4.3). Do not reintroduce the swap at either breakpoint.
           */}
          <div className={styles.aside}>
            <div>
              <h2 className={styles.asideHeading}>Our approach</h2>
              <p className={styles.asideText}>
                We follow strict food safety procedures, including separate storage, careful
                preparation and thorough cleaning. Our team is trained to manage allergens
                responsibly.
              </p>
              <p className={`${styles.asideText} ${styles.asideTextFollow}`}>
                If you’re unsure whether a dish is suitable for you, please ask us.
              </p>
            </div>

            <div>
              <h2 className={styles.asideHeading}>Need more help?</h2>
              <p className={styles.asideText}>
                If you have a specific allergy or dietary requirement, please get in touch before
                placing an order.
              </p>
              {/* 52px: the "need help → Contact us" panel CTA on the button ladder. */}
              <div className={styles.ctaRow}>
                <Link href={CONTACT_HREF} className={styles.cta}>
                  Contact us
                </Link>
              </div>
            </div>

            <div>
              <h2 className={styles.asideHeading}>Useful links</h2>
              <ul className={styles.links} role="list">
                <li className={styles.linkCard}>
                  <p className={styles.linkTitle}>Allergen information by dish</p>
                  <p className={styles.linkText}>Check allergens for each dish on our menu.</p>
                  <Link href={MENU_ITEM.href} className={styles.textLink}>
                    <span className={styles.textLinkLabel}>View the menu</span>
                    <span className={styles.arrow} aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
                <li className={styles.linkCard}>
                  <p className={styles.linkTitle}>FAQs</p>
                  <p className={styles.linkText}>
                    Find answers to common questions about allergens, ingredients and more.
                  </p>
                  <Link href={DELIVERY_FAQS_HREF} className={styles.textLink}>
                    <span className={styles.textLinkLabel}>
                      Browse our FAQ<span className={styles.lowercase}>s</span>
                    </span>
                    <span className={styles.arrow} aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
