import type { LegalDocument, LegalGroup } from './document';

/**
 * Terms of Sale — 56 numbered clauses in eight groups, one continuous
 * document (design/Abby's Table - Terms of Sale.dc.html; build-handoff.md,
 * "Terms of Sale — what was settled" and "the document architecture").
 *
 * The slugs are the design's, verbatim, and a PUBLIC CONTRACT: FAQ answers,
 * customer-service emails, checkout and confirmation emails link to them.
 * Never rename one. A new clause takes a new slug wherever it is inserted;
 * the numbers after it move, the slugs do not. `tests/legal-documents.test.ts`
 * pins all 56.
 *
 * Titles are verbatim from the design and shared by the index row and the
 * clause heading, so the two cannot drift. The copy is a working draft
 * awaiting solicitor review (build-handoff.md, open items).
 */
const TERMS_GROUPS = [
  {
    title: 'Ordering',
    sections: [
      { n: 1, slug: 'about-abbys-table', title: "About Abby's Table" },
      { n: 2, slug: 'what-these-terms-cover', title: 'What these terms cover' },
      { n: 3, slug: 'our-food', title: 'Our food' },
      { n: 4, slug: 'food-standards', title: 'Our food standards' },
      { n: 5, slug: 'choosing-your-order', title: 'Choosing your order' },
      { n: 6, slug: 'minimum-orders-boxes', title: 'Minimum orders and boxes' },
      { n: 7, slug: 'cooking-runs-availability', title: 'Cooking runs and availability' },
      { n: 8, slug: 'how-a-contract-is-formed', title: 'How a contract is formed' },
      { n: 9, slug: 'when-we-may-decline-an-order', title: 'When we may decline an order' },
      { n: 10, slug: 'prices', title: 'Prices' },
      { n: 11, slug: 'obvious-pricing-errors', title: 'Obvious pricing errors' },
      { n: 12, slug: 'payment', title: 'Payment' },
    ],
  },
  {
    title: 'Delivery',
    sections: [
      { n: 13, slug: 'where-we-deliver', title: 'Where we deliver' },
      { n: 14, slug: 'delivery-dates-time-windows', title: 'Delivery dates and time windows' },
      {
        n: 15,
        slug: 'delivery-information-you-provide',
        title: 'Delivery information you provide',
      },
      { n: 16, slug: 'receiving-chilled-deliveries', title: 'Receiving chilled deliveries' },
      { n: 17, slug: 'failed-delivery', title: 'Failed delivery' },
      {
        n: 18,
        slug: 'delays-and-events-outside-our-control',
        title: 'Delays and events outside our reasonable control',
      },
    ],
  },
  {
    title: 'Food & allergens',
    sections: [
      { n: 19, slug: 'ingredients-recipe-changes', title: 'Ingredients and recipe changes' },
      { n: 20, slug: 'allergen-information', title: 'Allergen information' },
      {
        n: 21,
        slug: 'cross-contact-severe-allergies',
        title: 'Cross-contact and severe allergies',
      },
      { n: 22, slug: 'dietary-descriptions', title: 'Dietary descriptions' },
      { n: 23, slug: 'nutrition-information', title: 'Nutrition information' },
      { n: 24, slug: 'portion-choices', title: 'Portion choices' },
    ],
  },
  {
    title: 'Changes, cancellations & refunds',
    sections: [
      { n: 25, slug: 'changing-an-order', title: 'Changing an order' },
      { n: 26, slug: 'cancelling-before-cutoff', title: 'Cancelling before the cutoff' },
      {
        n: 27,
        slug: 'perishable-food-and-cancellation-rights',
        title: 'Perishable food and your cancellation rights',
      },
      { n: 28, slug: 'requests-after-cutoff', title: 'Requests after the cutoff' },
      {
        n: 29,
        slug: 'if-we-cancel-an-accepted-order',
        title: "If Abby's Table cancels an accepted order",
      },
      { n: 30, slug: 'refunds', title: 'Refunds' },
    ],
  },
  {
    title: 'After delivery',
    sections: [
      { n: 31, slug: 'checking-your-order', title: 'Checking your order' },
      { n: 32, slug: 'storage-use-by-information', title: 'Storage and use-by information' },
      { n: 33, slug: 'freezing-defrosting', title: 'Freezing and defrosting' },
      { n: 34, slug: 'reheating', title: 'Reheating' },
      {
        n: 35,
        slug: 'product-recalls-food-safety-notices',
        title: 'Product recalls and food-safety notices',
      },
    ],
  },
  {
    title: 'Problems & complaints',
    sections: [
      { n: 36, slug: 'reporting-a-problem', title: 'Reporting a problem' },
      { n: 37, slug: 'perishable-food-complaints', title: 'Perishable-food complaints' },
      { n: 38, slug: 'returns-food', title: 'Returns of food' },
      { n: 39, slug: 'complaints-procedure', title: 'Complaints procedure' },
    ],
  },
  {
    title: 'Gifting & accounts',
    sections: [
      { n: 40, slug: 'gifting-food', title: 'Gifting food' },
      { n: 41, slug: 'gift-cards-vouchers', title: 'Gift cards and vouchers' },
      { n: 42, slug: 'promotions-discount-codes', title: 'Promotions and discount codes' },
      { n: 43, slug: 'account-credits', title: 'Account credits' },
      { n: 44, slug: 'customer-accounts', title: 'Customer accounts' },
      { n: 45, slug: 'private-table-waitlist', title: 'Private Table waitlist' },
    ],
  },
  {
    title: 'Legal',
    sections: [
      { n: 46, slug: 'our-responsibility-to-you', title: 'Our responsibility to you' },
      { n: 47, slug: 'liability-we-cannot-exclude', title: 'Liability we cannot exclude' },
      { n: 48, slug: 'personal-information', title: 'Personal information' },
      { n: 49, slug: 'images-you-upload', title: 'Images uploaded through Contact Us' },
      { n: 50, slug: 'changes-to-these-terms', title: 'Changes to these Terms of Sale' },
      { n: 51, slug: 'severability', title: 'Severability' },
      { n: 52, slug: 'delay-in-enforcing-a-right', title: 'Delay in enforcing a right' },
      {
        n: 53,
        slug: 'transferring-rights-obligations',
        title: 'Transferring rights or obligations',
      },
      { n: 54, slug: 'third-party-rights', title: 'Third-party rights' },
      { n: 55, slug: 'governing-law-jurisdiction', title: 'Governing law and jurisdiction' },
      { n: 56, slug: 'how-to-contact-us', title: 'How to contact us' },
    ],
  },
] as const satisfies readonly LegalGroup[];

/** A Terms of Sale clause anchor. */
export type TermsSlug = (typeof TERMS_GROUPS)[number]['sections'][number]['slug'];

export const TERMS_OF_SALE: LegalDocument = {
  navLabel: 'Terms of Sale sections',
  groups: TERMS_GROUPS,
  groupRules: true,
};
