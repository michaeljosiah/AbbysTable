import type { LegalDocument, LegalGroup } from './document';

/**
 * Privacy Policy — 11 numbered sections in four groups, plus the unnumbered
 * closing "Changes to this Privacy Policy" (design/Abby's Table - Privacy
 * Policy.dc.html; build-handoff.md, "Privacy Policy — what was settled").
 * Built on Terms of Sale's architecture, so its slugs are the same kind of
 * public contract (see `./document`).
 *
 * `cookies` in particular is COMMITTED: the cookie consent panel and every
 * footer's "Cookie preferences" fallback deep-link to `/privacy#cookies`
 * (build-handoff.md §3s). Do not rename it.
 */
const PRIVACY_GROUPS = [
  {
    title: 'Your privacy',
    sections: [
      { n: 1, slug: 'who-we-are', title: 'Who we are' },
      { n: 2, slug: 'what-information-we-collect', title: 'What information we collect' },
      {
        n: 3,
        slug: 'how-and-why-we-use-your-information',
        title: 'How and why we use your information',
      },
    ],
  },
  {
    title: 'How we use your information',
    sections: [
      {
        n: 4,
        slug: 'allergies-sensitive-information',
        title: 'Allergies and sensitive information',
      },
      { n: 5, slug: 'who-we-share-information-with', title: 'Who we share information with' },
      { n: 6, slug: 'marketing-and-private-table', title: 'Marketing and Private Table' },
      { n: 7, slug: 'cookies', title: 'Cookies and similar technologies' },
    ],
  },
  {
    title: 'Keeping your information',
    sections: [
      {
        n: 8,
        slug: 'how-long-we-keep-your-information',
        title: 'How long we keep your information',
      },
      { n: 9, slug: 'your-rights', title: 'Your rights' },
      {
        n: 10,
        slug: 'security-and-international-transfers',
        title: 'Security and international transfers',
      },
    ],
  },
  {
    title: 'Need help?',
    sections: [{ n: 11, slug: 'questions-and-complaints', title: 'Questions and complaints' }],
  },
] as const satisfies readonly LegalGroup[];

/** A Privacy Policy section anchor. */
export type PrivacySlug = (typeof PRIVACY_GROUPS)[number]['sections'][number]['slug'];

/** Section 7's committed anchor — the target of every cookie-preferences fallback. */
export const PRIVACY_COOKIES_SLUG = 'cookies' satisfies PrivacySlug;

export const PRIVACY_POLICY: LegalDocument = {
  navLabel: 'Privacy Policy sections',
  groups: PRIVACY_GROUPS,
};
