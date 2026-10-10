/**
 * Order Confirmation v2's copy (design: Order Confirmation v2, verbatim, and
 * awaiting legal and content review, #38). Figures never live here: they are
 * the order's own, read back from Aonik.
 */

export const CONFIRMATION_COPY = {
  title: 'Order confirmed',
  /** True only once Aonik's order email is live and verified (aonik#349; go-live check). */
  lede: 'Thank you. We’ve emailed your order confirmation and delivery details.',
  orderNumber: 'Order number',
  delivery: 'Delivery details',
  summary: 'Order summary',
  nextTitle: 'What happens next',
  /**
   * The design's three lines, less "We'll email your tracking details when your
   * order is on its way.": nothing sends a tracking email yet (D10), and a
   * confirmation never promises what does not happen.
   */
  next: [
    'We’ll prepare your order fresh, in small batches.',
    'Keep chilled or freeze on arrival, and reheat as directed.',
  ],
  memberPoints: 'Added to your Abby’s Table account.',
  /** Neutral, not the design's "Account created" (D8): Aonik cannot know whether one will be. */
  setupTitle: 'Check your email to finish setting up or access your account.',
  setupText: 'We’ve sent you a secure link.',
  setupPoints: 'Your points will appear once your account setup is complete.',
  pointsNoteTitle: 'About Abby’s Table points',
  pointsNoteMember: 'They’ve been added to your Abby’s Table account.',
  pointsNoteSetup: 'They’ll appear once you finish setting up your account.',
} as const;

export const CONFIRMATION_PRIVATE_TABLE = {
  soon: 'Coming soon',
  title: 'Abby’s Private Table',
  text: 'A bespoke Nigerian fusion food programme, developed around your nutritional and clinical needs with expert oversight.',
  image: '/assets/private-table/private-table-hero-1120.jpg',
  imageAlt: 'Nigerian ingredients laid out around a tablet showing a bespoke menu',
  cta: 'Find out more',
} as const;
