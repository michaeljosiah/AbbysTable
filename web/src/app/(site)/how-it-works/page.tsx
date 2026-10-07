import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { BoxSizePicker } from '@/components/how-it-works/BoxSizePicker';
import { BoxSizeLink, BoxSizeProvider } from '@/components/how-it-works/BoxSizeProvider';
import { ExampleDishCard } from '@/components/how-it-works/ExampleDishCard';
import { getHowItWorksPageData } from '@/lib/aonik/client';
import { HOW_IT_WORKS_EXAMPLE_DISH_SLUG } from '@/lib/content/marketing';
import { buildBoxSizeModel, closingSentence, sizesSentence } from '@/lib/how-it-works/boxSizes';

import styles from './page.module.css';

/*
 * How it works — ported from design/Abby's Table - How It Works v2.dc.html
 * (build-handoff §3v, contract §4c).
 *
 * Server Component. Commerce data — the box plan behind the size picker and
 * the example dish — is resolved here, once, and passed down. The only client
 * pieces are the size picker (it holds the selection) and the purchase links
 * that carry that selection (`BoxSizeLink`); `BoxSizeProvider` shares it
 * between them while every section below stays server-rendered.
 *
 * Out of scope here, by issue: the mobile purchase bar and its footer
 * suppression (#12), the v2 header/footer and the desktop header auto-hide this
 * marketing page opts into (#10), and Choose Box reading `?dishes=` (#28).
 *
 * Photography is placeholder (#38). Steps 02–04 use the design's own
 * photographs (design/assets/hw-*.jpg, copied to public/assets/how-it-works/,
 * 1402px JPEGs — handoff §3v explains why the source width, not 2×, is the
 * honest ceiling) with the design's alt text. The hero shows the example
 * dish's own record image, so its caption names what the record says it is.
 *
 * Aonik failures degrade per piece (`getHowItWorksPageData`): no box plan
 * means a picker without sizes or prices, no dish means no example card.
 */

const DESCRIPTION =
  'Choose your box size, fill it with dishes from the menu, and pick a delivery date. We’ll take care of the rest.';

export const metadata: Metadata = {
  title: "How it works — Abby's Table",
  description: DESCRIPTION,
  openGraph: { title: "How it works — Abby's Table", description: DESCRIPTION, locale: 'en_GB' },
};

const MENU_HREF = '/menu';

/** The four steps, as the rail and the step sections both name them. */
const STEPS = [
  { id: 'step-1', label: 'Build your box' },
  { id: 'step-2', label: 'We cook' },
  { id: 'step-3', label: 'Delivered chilled' },
  { id: 'step-4', label: 'Heat and eat' },
] as const;

/** A hyphenated compound kept on one line; wrapping still happens around it. */
function Keep({ children }: { children: ReactNode }) {
  return <span className={styles.keep}>{children}</span>;
}

/** Step 02's method points. Icons: thin-stroke 1.5px line set (handoff §3v). */
const METHOD_POINTS: { title: string; body: ReactNode; icon: ReactNode }[] = [
  {
    title: 'Quality ingredients',
    body: (
      <>
        From <Keep>wild-caught</Keep> seafood and <Keep>grass-fed</Keep> meats to fresh produce and
        carefully chosen oils.
      </>
    ),
    icon: (
      <>
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" />
        <path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12" />
      </>
    ),
  },
  {
    title: 'Flavour built properly',
    body: (
      <>
        Nigerian flavours built with herbs, spices and aromatics, not{' '}
        <Keep>ultra-processed</Keep> shortcuts.
      </>
    ),
    icon: (
      <>
        <path d="M4 9h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" />
        <path d="M2.5 9h19" />
        <path d="M9 6h6" />
        <path d="M12 6V4.5" />
      </>
    ),
  },
  {
    title: 'Nutrition at the core',
    body: 'Nutrition shapes how our dishes are developed, from ingredients to portion and balance.',
    icon: (
      <>
        <path d="M12 21v-9" />
        <path d="M12 12C12 8 9.5 5.5 5.5 5.5 5.5 9.5 8 12 12 12Z" />
        <path d="M12 12c0-3.4 2.1-5.5 5.5-5.5C17.5 9.9 15.4 12 12 12Z" />
      </>
    ),
  },
  {
    title: 'No shortcuts',
    body: 'No commercial seasoning blends, added MSG, seed oils or refined sugars. Cooked to order in small batches.',
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M6 18 18 6" />
      </>
    ),
  },
];

const DELIVERY_FACTS = [
  { title: 'You choose the date', body: 'At checkout' },
  // "Mainland UK" is deliberate (CLAUDE.md, build-handoff): the design's
  // "UK-wide delivery" overstates coverage while non-mainland is unresolved.
  { title: 'Mainland UK delivery', body: 'Arrives chilled' },
  { title: 'Enjoy now or later', body: 'Fridge or freezer ready' },
];

const HEATING_METHODS = ['Microwave', 'Oven', 'Hob'];

/*
 * Rendered widths: full column on a phone, capped at 720px through the
 * single-column 640–1023 band, half the 1280 shell (564px) from 1024.
 */
const MEDIA_SIZES = '(min-width: 1024px) 564px, (min-width: 640px) 720px, 100vw';

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="12" x2="19" y2="12" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function StepPhoto({ src, alt, label }: { src: string; alt: string; label: string }) {
  return (
    <figure className={styles.media}>
      <Image src={src} alt={alt} fill sizes={MEDIA_SIZES} className={styles.mediaImage} />
      {/* A caption, not a pill: a filled capsule read as a call to action. */}
      <figcaption className={styles.mediaLabel}>{label}</figcaption>
    </figure>
  );
}

export default async function HowItWorksPage() {
  const { boxPlan, exampleDish } = await getHowItWorksPageData(HOW_IT_WORKS_EXAMPLE_DISH_SLUG);
  const sizes = buildBoxSizeModel(boxPlan);

  return (
    <BoxSizeProvider defaultId={sizes.defaultId}>
      {/* ---- Hero ---- */}
      <section className={`${styles.band} ${styles.hero}`}>
        <div className={styles.inner}>
          <div className={styles.split}>
            <div className={styles.copy}>
              <h1 className={styles.title}>How Abby’s Table works</h1>
              <p className={styles.lede}>{DESCRIPTION}</p>
              <div className={styles.heroCtas}>
                {/* Carries the picker's choice, like every purchase link here:
                    pick 18, scroll back up, tap this, and 18 survives. */}
                <BoxSizeLink className={styles.heroCta}>Build a Box</BoxSizeLink>
                <Link href={MENU_HREF} className={styles.textLink}>
                  <span>
                    See the menu
                    <ArrowIcon />
                  </span>
                </Link>
              </div>
            </div>

            <figure className={styles.media}>
              {exampleDish ? (
                <>
                  {/* The caption names the dish, so the photograph's alt is
                      empty rather than announcing the name twice. The record
                      carries no description of the photograph itself. */}
                  <Image
                    src={exampleDish.imageUrl}
                    alt=""
                    fill
                    priority
                    sizes={MEDIA_SIZES}
                    className={styles.mediaImage}
                  />
                  <figcaption className={styles.heroCaption}>{exampleDish.title}</figcaption>
                </>
              ) : (
                <Image
                  src="/assets/how-1-build-your-box.jpg"
                  alt="A hand holding a phone open on the Abby’s Table menu"
                  fill
                  priority
                  sizes={MEDIA_SIZES}
                  className={styles.mediaImage}
                />
              )}
            </figure>
          </div>
        </div>
      </section>

      {/* ---- Step rail: a jump nav, not a progress indicator ---- */}
      <nav className={styles.rail} aria-label="The four steps">
        <div className={styles.railRow}>
          {STEPS.map((step, index) => (
            <a key={step.id} href={`#${step.id}`} className={styles.railItem}>
              <span className={styles.railNum} aria-hidden="true">
                {index + 1}
              </span>
              <span className={styles.railLabel}>{step.label}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* ---- 01 Build your box ---- */}
      <section id="step-1" className={`${styles.band} ${styles.step}`}>
        <div className={styles.inner}>
          <div className={styles.stepOne}>
            <div className={styles.copy}>
              <span className={styles.num} aria-hidden="true">
                1
              </span>
              <h2 className={styles.h2}>Build your box. Fill it your way.</h2>
              <p className={styles.body}>
                {sizesSentence(sizes)} Then choose your dishes and select your portion size.
              </p>
              <div className={styles.subSteps}>
                <div>
                  <h3>Pick every dish</h3>
                  <p>Choose your favourites from the full menu.</p>
                </div>
                <div>
                  <h3>Make it yours</h3>
                  <p>Choose your portion size where available.</p>
                </div>
                <div>
                  <h3>Choose delivery</h3>
                  {/* Mainland wording on purpose; the design says "UK nationwide". */}
                  <p>Pick an available mainland UK delivery date at checkout.</p>
                </div>
              </div>
            </div>

            {/* Under the picker, because "Start building" acts on the choice. */}
            <div className={styles.panelWrap}>
              <BoxSizePicker model={sizes} />
            </div>
          </div>
        </div>
      </section>

      {/* ---- 02 We cook ---- */}
      <section id="step-2" className={`${styles.band} ${styles.step} ${styles.stepTwo}`}>
        <div className={styles.inner}>
          <div className={styles.methodLayout}>
            <div className={styles.copy}>
              <span className={styles.num} aria-hidden="true">
                2
              </span>
              <h2 className={styles.h2}>We cook. Real flavour. Nutrition at the core.</h2>
              <p className={styles.lede}>
                We cook with <Keep>high-quality</Keep> ingredients, bringing together Nigerian
                flavours and a modern, <Keep>nutrition-led</Keep> approach.
              </p>
            </div>

            {/* The photograph before the points at every width, so it arrives
                with the argument it supports; it is also the left column on
                desktop, so DOM order is visual order. */}
            <StepPhoto
              src="/assets/how-it-works/hw-scratch.jpg"
              alt="Whole spices and dried chillies ground by hand in a stone mortar"
              label="Cooked from scratch"
            />

            <ul className={styles.points} role="list">
              {METHOD_POINTS.map((point) => (
                <li key={point.title} className={styles.point}>
                  <span className={styles.pointIcon} aria-hidden="true">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {point.icon}
                    </svg>
                  </span>
                  <h3>{point.title}</h3>
                  <p>{point.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---- 03 Delivered chilled ---- */}
      <section id="step-3" className={`${styles.band} ${styles.step}`}>
        <div className={styles.inner}>
          <div className={styles.split}>
            <div className={styles.copy}>
              <span className={styles.num} aria-hidden="true">
                3
              </span>
              <h2 className={styles.h2}>Freshly cooked. Delivered chilled.</h2>
              <p className={styles.body}>
                Choose an available date at checkout. We prepare and pack your box in insulated,
                recyclable packaging, ready for your fridge or freezer.
              </p>
              <ul className={styles.facts} role="list">
                {DELIVERY_FACTS.map((fact) => (
                  <li key={fact.title} className={styles.fact}>
                    <span className={styles.factTitle}>{fact.title}</span>
                    <span className={styles.factBody}>{fact.body}</span>
                  </li>
                ))}
              </ul>
            </div>

            <StepPhoto
              src="/assets/how-it-works/hw-delivery.jpg"
              alt="An Abby’s Table box packed chilled with labelled dishes"
              label="Packed safely chilled"
            />
          </div>
        </div>
      </section>

      {/* ---- 04 Heat and eat: the green band ---- */}
      <section id="step-4" className={`${styles.band} ${styles.step} ${styles.dark}`}>
        <div className={styles.inner}>
          <div className={`${styles.split} ${styles.splitReverse}`}>
            <div className={styles.copy}>
              <span className={styles.num} aria-hidden="true">
                4
              </span>
              <h2 className={styles.h2}>Fridge to plate in minutes.</h2>
              <p className={styles.body}>
                Every dish arrives fully prepared. Follow the simple microwave, oven or hob
                guidance, then plate and enjoy. No prep, no cooking.
              </p>
              <ul className={styles.methods} role="list" aria-label="Ways to heat">
                {HEATING_METHODS.map((method, index) => (
                  <li key={method}>
                    {index > 0 ? (
                      <span className={styles.methodMark} aria-hidden="true">
                        ⬥
                      </span>
                    ) : null}
                    {method}
                  </li>
                ))}
              </ul>
            </div>

            {/* Only the photograph moves at desktop (media left), and it holds
                no controls, so the tab order is untouched. */}
            <StepPhoto
              src="/assets/how-it-works/hw-heat.jpg"
              alt="A plated Abby’s Table dish being eaten at home"
              label="Ready when you are"
            />
          </div>
        </div>
      </section>

      {/* ---- Nutrition, clearly shared ---- */}
      <section className={`${styles.band} ${styles.nutrition}`}>
        <div className={styles.inner}>
          <div className={styles.nutritionSplit}>
            <div className={styles.nutritionCopy}>
              <h2 className={styles.h2}>Nutrition, clearly shared.</h2>
              {/* Qualified on purpose: not every dish publishes all of these yet,
                  and "on every dish" would be an untrue, safety-adjacent claim.
                  Restore the design's "are shown on every dish" once every dish
                  publishes them (#38). */}
              <p className={styles.body}>
                Nutrition, ingredients, allergens and heat level are shown on each dish where
                we&apos;ve published them, so you can choose with confidence.
              </p>
              <div className={styles.ctaRow}>
                <Link href={MENU_HREF} className={styles.ctaOutline}>
                  View the full menu
                </Link>
              </div>
            </div>

            {exampleDish ? <ExampleDishCard dish={exampleDish} /> : null}
          </div>
        </div>
      </section>

      {/* ---- Closing ---- */}
      <section className={`${styles.band} ${styles.closing}`}>
        <div className={styles.inner}>
          <h2 className={styles.h2}>Ready to fill your box?</h2>
          <p className={styles.lede}>{closingSentence(sizes.minDishes)}</p>
          <div className={styles.ctaRow}>
            <BoxSizeLink className={styles.cta}>Build a Box</BoxSizeLink>
          </div>
        </div>
      </section>
    </BoxSizeProvider>
  );
}
