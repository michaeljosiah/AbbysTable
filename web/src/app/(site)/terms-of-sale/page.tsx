import type { Metadata } from 'next';

import { CompanyProvider } from '@/components/legal/company';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { resolveBusinessDetails } from '@/lib/content/business';
import { TERMS_OF_SALE } from '@/lib/legal/terms';

import { TERMS_CLAUSES } from './clauses';

/*
 * Terms of Sale — ported from design/Abby's Table - Terms of Sale.dc.html
 * (build-handoff.md, "Terms of Sale — what was settled" and "the document
 * architecture"). 56 clauses in eight groups, one continuous document; the
 * clause slugs are a public contract (`@/lib/legal/terms`).
 *
 * The copy is a working draft awaiting solicitor review (#38). The page's h1
 * stays "Terms of Sale" — the defined term the clauses use — while the footer
 * link reads "Terms".
 */

const DESCRIPTION =
  'These Terms of Sale explain how orders work at Abby’s Table, what you can expect from us and what we ask of you when you place an order.';

export const metadata: Metadata = {
  title: "Terms of Sale — Abby's Table",
  description: DESCRIPTION,
  openGraph: { title: "Terms of Sale — Abby's Table", description: DESCRIPTION, locale: 'en_GB' },
};

export default async function TermsOfSalePage() {
  // The company details: the tenant's published profile over configuration.
  const { company } = await resolveBusinessDetails();
  return (
    <CompanyProvider company={company}>
      <LegalDocument
        doc={TERMS_OF_SALE}
        title="Terms of Sale"
        lede={DESCRIPTION}
        statement={<strong>Nothing in these terms affects your statutory rights as a consumer.</strong>}
        lastUpdated="6 September 2026"
        linkTone="brass"
        bodies={TERMS_CLAUSES}
      />
    </CompanyProvider>
  );
}
