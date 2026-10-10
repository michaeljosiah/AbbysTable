'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { COMPANY, type CompanyDetails } from '@/lib/content/company';

import styles from './LegalDocument.module.css';
import { Tbc } from './Tbc';

/*
 * The company details a legal document states: the business profile the
 * tenant publishes in Aonik over `@/lib/content/company`
 * (`resolveBusinessDetails`), resolved once by the page and provided here.
 *
 * Client components only because the clause bodies are module-level markup
 * that cannot take the request's details as props; they hold no state and
 * render the same on the server. Each renders the value, or the "to be
 * confirmed" mark while it is `null`. The mark names WHAT is missing wherever
 * the surrounding copy does not (a label beside it already does in the info
 * panels).
 */

const CompanyContext = createContext<CompanyDetails>(COMPANY);

export function CompanyProvider({ company, children }: { company: CompanyDetails; children: ReactNode }) {
  return <CompanyContext.Provider value={company}>{children}</CompanyContext.Provider>;
}

function useCompany(): CompanyDetails {
  return useContext(CompanyContext);
}

/** The registered company name: emphasised in running copy, as the design sets it. */
export function CompanyName({ plain = false }: { plain?: boolean }) {
  const name = useCompany().legalName;
  if (!name) return <Tbc source="config">company name to be confirmed</Tbc>;
  return plain ? <>{name}</> : <strong>{name}</strong>;
}

/** The registered office: one line per entry, or joined with commas inline. */
export function RegisteredOffice({ inline = false }: { inline?: boolean }) {
  const lines = useCompany().registeredOffice;
  if (!lines || lines.length === 0) return <Tbc source="config" />;
  if (inline) return <>{lines.join(', ')}</>;
  return (
    <>
      {lines.map((line, index) => (
        <span key={`${index}:${line}`}>
          {index > 0 ? <br /> : null}
          {line}
        </span>
      ))}
    </>
  );
}

/** Terms clause 56: the company name over its registered office, for written enquiries. */
export function RegisteredAddress() {
  return (
    <div className={styles.addressPanel}>
      <p className={styles.infoLabel}>
        <CompanyName plain />
      </p>
      <p className={styles.infoValue}>
        <RegisteredOffice />
      </p>
    </div>
  );
}

export function CompanyNumber() {
  const number = useCompany().companyNumber;
  return number ? <>{number}</> : <Tbc source="config" />;
}

/**
 * The contact email as a mailto: link. The address breaks only after the "@"
 * (a zero-width space there, the domain kept whole), so it wraps rather than
 * shrinking or splitting mid-domain (design/CLAUDE.md, "Long unbreakable values").
 */
export function CompanyEmail({ pending = 'to be confirmed' }: { pending?: string }) {
  const email = useCompany().email;
  if (!email) return <Tbc source="config">{pending}</Tbc>;
  const at = email.indexOf('@');
  return (
    <a href={`mailto:${email}`} className={styles.link}>
      {at === -1 ? (
        email
      ) : (
        <>
          {email.slice(0, at + 1)}
          {'​'}
          <span className={styles.nowrap}>{email.slice(at + 1)}</span>
        </>
      )}
    </a>
  );
}

/** The contact telephone number, as a tel: link when `link` is set. */
export function CompanyPhone({
  link = false,
  pending = 'to be confirmed',
}: {
  link?: boolean;
  pending?: string;
}) {
  const phone = useCompany().phone;
  if (!phone) return <Tbc source="config">{pending}</Tbc>;
  if (!link) return <>{phone.display}</>;
  return (
    <a href={`tel:${phone.e164}`} className={styles.link}>
      {phone.display}
    </a>
  );
}

/**
 * The card-payment processor (Terms clause 12, Privacy section 5). Unset, it is
 * a mark: plain "to be confirmed" where the copy already names what is
 * missing, or `pending` — set in brackets, as the design brackets a mark inside
 * a sentence — where the sentence would otherwise read "such as to be
 * confirmed".
 */
export function PaymentProvider({ strong = false, pending }: { strong?: boolean; pending?: string }) {
  const name = useCompany().paymentProvider;
  if (!name) {
    return pending ? (
      <>
        (<Tbc source="config">{pending}</Tbc>)
      </>
    ) : (
      <Tbc source="config" />
    );
  }
  return strong ? <strong>{name}</strong> : <>{name}</>;
}
