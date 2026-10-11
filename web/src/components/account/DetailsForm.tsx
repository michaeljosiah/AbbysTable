'use client';

import { useRef, useState, type FormEvent } from 'react';

import {
  saveDetailsAction,
  requestEmailChangeAction,
} from '@/lib/account/detailsActions';
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

/** Editable email requests identity-service confirmation; profile updates never directly change it. */
export function DetailsForm({
  initial,
  email,
}: {
  initial: DetailsFormValues;
  email: string;
}) {
  const [emailValue, setEmailValue] = useState(email);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [values, setValues] = useState<DetailsFormValues>(initial);
  const [errors, setErrors] = useState<DetailsFormErrors>({});
  const [said, setSaid] = useState<{
    kind: 'ok' | 'problem';
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);
  const lastRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  // Aonik cannot clear a stored phone: the form knows it has one.
  const hasStoredPhone = Boolean(initial.phone);

  const set = (key: keyof DetailsFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key === 'firstName' || key === 'lastName' || key === 'phone')
      setErrors((current) => ({ ...current, [key]: undefined }));
    setSaid(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim()) ||
      emailValue.length > 254
    ) {
      setEmailError('Enter a valid email address.');
      document.getElementById('details-email')?.focus();
      return;
    }
    const trimmed = trimmedDetails(values);
    const found = detailsFormErrors(trimmed, { hasStoredPhone });
    if (Object.keys(found).length > 0) {
      setErrors(found);
      (found.firstName
        ? firstRef
        : found.lastName
          ? lastRef
          : phoneRef
      ).current?.focus();
      return;
    }
    setBusy(true);
    setSaid(null);
    try {
      const result = await saveDetailsAction(trimmed);
      if (result.status === 'ended')
        window.location.assign(loginPathFor(DETAILS_HREF));
      else if (result.status === 'invalid') setErrors(result.errors);
      else if (result.status === 'failed')
        setSaid({ kind: 'problem', text: result.message });
      else {
        setValues(result.values);
        if (emailValue.trim() !== email) {
          const change = await requestEmailChangeAction(emailValue);
          if (change.status === 'ended')
            window.location.assign(loginPathFor(DETAILS_HREF));
          else
            setSaid({
              kind: change.status === 'requested' ? 'ok' : 'problem',
              text: `${result.said} ${change.message}`,
            });
        } else setSaid({ kind: 'ok', text: result.said });
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
            ref={lastRef}
            className={styles.field}
            id="details-last"
            autoComplete="family-name"
            value={values.lastName}
            onChange={(event) => set('lastName', event.target.value)}
            aria-invalid={errors.lastName ? 'true' : undefined}
            aria-describedby={errors.lastName ? 'details-last-e' : undefined}
          />
          {errors.lastName ? (
            <p className={styles.err} id="details-last-e">
              {errors.lastName}
            </p>
          ) : null}
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
          value={emailValue}
          onChange={(event) => {
            setEmailValue(event.target.value);
            setEmailError(null);
            setSaid(null);
          }}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={
            emailError ? 'details-email-h details-email-e' : 'details-email-h'
          }
        />
        <p className={styles.hint} id="details-email-h">
          If you change it, we’ll email a link to confirm the new address.
        </p>
      </div>

      {emailError ? (
        <p className={styles.err} id="details-email-e">
          {emailError}
        </p>
      ) : null}
      <div>
        <label className={styles.formLabel} htmlFor="details-phone">
          Phone {hasStoredPhone ? null : <i>(optional)</i>}
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
          aria-describedby={
            errors.phone ? 'details-phone-h details-phone-e' : 'details-phone-h'
          }
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
