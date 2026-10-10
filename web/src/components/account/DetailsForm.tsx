'use client';

import { useRef, useState, type FormEvent } from 'react';

import { saveDetailsAction } from '@/lib/account/detailsActions';
import {
  DETAILS_COPY,
  DETAILS_MESSAGES,
  detailsFormErrors,
  trimmedDetails,
  type DetailsFormErrors,
  type DetailsFormValues,
} from '@/lib/account/detailsForm';
import { loginPathFor } from '@/lib/auth/redirect';

import styles from './Account.module.css';

const DETAILS_HREF = '/account/details';

/**
 * "Your details" (design: My Account, Details): first name, last name and phone
 * are editable; the email is shown and not editable here — changing it needs a
 * recent sign-in proof the storefront cannot supply, so it goes through us
 * (`DETAILS_COPY.emailNote`).
 */
export function DetailsForm({ initial, email }: { initial: DetailsFormValues; email: string }) {
  const [values, setValues] = useState<DetailsFormValues>(initial);
  const [errors, setErrors] = useState<DetailsFormErrors>({});
  const [said, setSaid] = useState<{ kind: 'ok' | 'problem'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof DetailsFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key === 'firstName' || key === 'phone') setErrors((current) => ({ ...current, [key]: undefined }));
    setSaid(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const trimmed = trimmedDetails(values);
    const found = detailsFormErrors(trimmed);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      (found.firstName ? firstRef : phoneRef).current?.focus();
      return;
    }
    setBusy(true);
    setSaid(null);
    try {
      const result = await saveDetailsAction(trimmed);
      if (result.status === 'ended') window.location.assign(loginPathFor(DETAILS_HREF));
      else if (result.status === 'invalid') setErrors(result.errors);
      else if (result.status === 'failed') setSaid({ kind: 'problem', text: result.message });
      else {
        setValues(result.values);
        setSaid({ kind: 'ok', text: result.said });
      }
    } catch {
      setSaid({ kind: 'problem', text: DETAILS_MESSAGES.unavailable });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.formRow}>
        <div>
          <label className={styles.formLabel} htmlFor="details-first">
            First name
          </label>
          <input
            ref={firstRef}
            className={styles.field}
            id="details-first"
            autoComplete="given-name"
            value={values.firstName}
            onChange={(event) => set('firstName', event.target.value)}
            aria-invalid={errors.firstName ? 'true' : undefined}
            aria-describedby={errors.firstName ? 'details-first-e' : undefined}
          />
          {errors.firstName ? (
            <p className={styles.err} id="details-first-e">
              {errors.firstName}
            </p>
          ) : null}
        </div>
        <div>
          <label className={styles.formLabel} htmlFor="details-last">
            Last name
          </label>
          <input
            className={styles.field}
            id="details-last"
            autoComplete="family-name"
            value={values.lastName}
            onChange={(event) => set('lastName', event.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={styles.formLabel} htmlFor="details-email">
          Email address
        </label>
        <input
          className={styles.field}
          id="details-email"
          type="email"
          value={email}
          readOnly
          aria-describedby="details-email-h"
        />
        <p className={styles.hint} id="details-email-h">
          {DETAILS_COPY.emailNote}
        </p>
      </div>

      <div>
        <label className={styles.formLabel} htmlFor="details-phone">
          Phone <i>(optional)</i>
        </label>
        <input
          ref={phoneRef}
          className={styles.field}
          id="details-phone"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(event) => set('phone', event.target.value)}
          aria-invalid={errors.phone ? 'true' : undefined}
          aria-describedby={errors.phone ? 'details-phone-h details-phone-e' : 'details-phone-h'}
        />
        <p className={styles.hint} id="details-phone-h">
          {DETAILS_COPY.phoneHint}
        </p>
        {errors.phone ? (
          <p className={styles.err} id="details-phone-e">
            {errors.phone}
          </p>
        ) : null}
      </div>

      <div className={styles.formActs}>
        <button className={styles.submit} type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
      <div role="status" aria-live="polite">
        {said ? (
          <p className={said.kind === 'ok' ? styles.ok : styles.problem}>
            <span>{said.text}</span>
          </p>
        ) : null}
      </div>
    </form>
  );
}
