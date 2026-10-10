import type { Metadata } from 'next';

import { CompanyProvider } from '@/components/legal/company';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { resolveBusinessDetails } from '@/lib/content/business';
import { PRIVACY_POLICY } from '@/lib/legal/privacy';

import { PRIVACY_CLOSING, PRIVACY_SECTIONS } from './sections';

/*
 * Privacy Policy — ported from design/Abby's Table - Privacy Policy.dc.html
 * (build-handoff.md, "Privacy Policy — what was settled"). 11 sections in four
 * groups on Terms of Sale's architecture. `#cookies` is a committed anchor:
 * the consent panel and every footer's "Cookie preferences" fallback link to
 * `/privacy#cookies`.
 *
 * The cookie consent manager itself is mounted once in the root layout, never
 * here (build-handoff.md §3s); section 7's "Cookie preferences" button opens it
 * through the shared `data-consent-open` trigger.
 *
 * The copy has not been legally reviewed, and its "to be confirmed" marks stay
 * until production values exist (#38).
 */

const DESCRIPTION =
  'This policy explains what information we collect, how and why we use it, who we may share it with, how long we keep it, how we use cookies and similar technologies, and the rights and choices you have.';

export const metadata: Metadata = {
  title: "Privacy Policy — Abby's Table",
  description: DESCRIPTION,
  openGraph: { title: "Privacy Policy — Abby's Table", description: DESCRIPTION, locale: 'en_GB' },
};

export default async function PrivacyPolicyPage() {
  // The company details: the tenant's published profile over configuration.
  const { company } = await resolveBusinessDetails();
  return (
    <CompanyProvider company={company}>
      <LegalDocument
        doc={PRIVACY_POLICY}
        title="Privacy Policy"
        lede={DESCRIPTION}
        lastUpdated="6 September 2026"
        linkTone="green"
        bodies={PRIVACY_SECTIONS}
        closing={PRIVACY_CLOSING}
      />
    </CompanyProvider>
  );
}
