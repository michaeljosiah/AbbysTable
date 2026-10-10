'use client';

import Link from 'next/link';
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import { PRIVACY_ITEM } from '@/lib/content/navigation';
import { JOIN_WAITLIST_LABEL, WAITLIST_SERVICES } from '@/lib/content/privateTable';
import { revealUnderHeader } from '@/lib/dom/reveal';
import { SIGNUP_FORM_CHANGED, type SignupConsent } from '@/lib/signup/consent';
import {
  firstInvalidField,
  validateWaitlist,
  WAITLIST_FORM_FIELDS,
  WAITLIST_LIMITS,
  type WaitlistAction,
  type WaitlistDraft,
  type WaitlistErrors,
  type WaitlistField,
  type WaitlistState,
} from '@/lib/private-table/waitlist';

import { CountryCombobox } from './CountryCombobox';
import { useWaitlistChoice } from './WaitlistChoice';
import styles from './WaitlistForm.module.css';

/** The error glyph — a triangle, never colour alone. */
function ErrorGlyph() {
  return (
    <svg
      className={styles.errorGlyph}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 3.5l8.5 16h-17z" />
      <path d="M12 10v4M12 16.8h.01" />
    </svg>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={styles.error}>
      <ErrorGlyph />
      <span>{message}</span>
    </p>
  );
}

type TextField = Exclude<keyof WaitlistDraft, 'service'>;

/** The typed fields; the service is the shared choice (`useWaitlistChoice`). */
const EMPTY_FIELDS: Omit<WaitlistDraft, 'service'> = { name: '', email: '', phone: '', country: '' };

/**
 * The Private Table waitlist form (#25) — design/Abby's Table - Private Table
 * v2.dc.html, "Register your interest"; behaviour guide §8.
 *
 * Rendered only when the page has a waitlist that can really store an entry
 * (`waitlistList`: the tenant's published list, michaeljosiah/aonik#357), and
 * it confirms only `status: 'joined'`, which the action returns only after
 * Aonik's 202. The confirmation promises no consultation date and no reply
 * time. Its consent line is the list's published wording, exactly, and the
 * post carries that wording's version (`@/lib/signup/consent`).
 *
 * - Fields, in order: Full name, Email address, Telephone number (optional),
 *   Country or region (`CountryCombobox`, the fixed list), Which service — a
 *   native radio group, so arrow keys move the choice and the group is one tab
 *   stop. A service card's "Join the waitlist" preselects its service through
 *   the shared choice (`useWaitlistChoice`).
 * - Validation is ours (`noValidate`): the design's messages, inline,
 *   `aria-invalid` + `aria-describedby`, each cleared as its field is
 *   corrected. A failed submit moves focus to the first error in FIELD order
 *   and brings it clear of the header. The server action runs the same rules
 *   again (`@/lib/private-table/waitlist`).
 * - Success REPLACES the form (leaving it up invites a second sign-up) and
 *   takes focus. A failed join says so and keeps every field as it was.
 *
 * Posts through `useActionState`, so a submit before hydration is still a POST
 * to the server action — never details in a URL.
 */
export function WaitlistForm({ action, consent }: { action: WaitlistAction; consent: SignupConsent }) {
  const [state, dispatch, isPending] = useActionState<WaitlistState, FormData>(action, {
    status: 'idle',
  });
  // A submit made without JavaScript is a full round trip: the page comes back
  // rendered with the action's answer, which carries what was posted, so the
  // fields (and any errors) start from it rather than empty.
  const [draft, setDraft] = useState<Omit<WaitlistDraft, 'service'>>(() =>
    state.values
      ? { name: state.values.name, email: state.values.email, phone: state.values.phone, country: state.values.country }
      : EMPTY_FIELDS,
  );
  const { service: chosen, choose } = useWaitlistChoice();
  const service = chosen || state.values?.service || '';
  const [errors, setErrors] = useState<WaitlistErrors>(() =>
    state.status === 'invalid' ? (state.errors ?? {}) : {},
  );
  /**
   * The action's last answer once the customer has moved past it — by joining
   * again — so a stale failure never shows beside what they are doing now.
   */
  const [settled, setSettled] = useState<WaitlistState | null>(null);

  const id = useId();
  const ids = {
    name: `${id}-name`,
    email: `${id}-email`,
    phone: `${id}-phone`,
    country: `${id}-country`,
    service: `${id}-service`,
  };
  const errorId = (field: WaitlistField) => `${ids[field]}-error`;

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef<HTMLFieldSetElement>(null);
  const focusFrame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(focusFrame.current), []);

  /** The control focus goes to for a field: the chosen radio, or the first. */
  const controlFor = (field: WaitlistField): HTMLElement | null => {
    if (field !== 'service') {
      return { name: nameRef, email: emailRef, phone: phoneRef, country: countryRef }[field].current;
    }
    const group = serviceRef.current;
    return group?.querySelector<HTMLInputElement>('input:checked') ?? group?.querySelector('input') ?? null;
  };

  /** Focus a field after the commit that mounts its message, then bring it into view. */
  const focusField = (field: WaitlistField) => {
    cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      const control = controlFor(field);
      if (!control) return;
      control.focus({ preventScroll: true });
      // The whole field — label, control and message — not just the control.
      revealUnderHeader(control.closest<HTMLElement>('[data-field]') ?? control);
    });
  };

  // The server's own verdict on the fields wins: show it, and focus the first.
  useEffect(() => {
    if (state.status !== 'invalid') return;
    const serverErrors = state.errors ?? {};
    setErrors(serverErrors);
    const first = firstInvalidField(serverErrors);
    if (first) focusField(first);
    // `focusField` reads only refs; this runs once per answer from the action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // A service chosen anywhere — here, or by a card's "Join the waitlist" —
  // answers the service error.
  useEffect(() => {
    if (!service) return;
    setErrors((current) => {
      if (!current.service) return current;
      const next = { ...current };
      delete next.service;
      return next;
    });
  }, [service]);

  const current = state !== settled;
  const joined = current && state.status === 'joined';
  const failed =
    current &&
    !isPending &&
    (state.status === 'error' || state.status === 'changed' || state.status === 'unavailable');

  // Stable, so a re-render never takes focus back: it runs once, as the
  // confirmation mounts — announced, and where a keyboard user continues.
  const successRef = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    element.focus({ preventScroll: true });
    revealUnderHeader(element, 16);
  }, []);

  const clearError = (field: WaitlistField) => {
    if (!errors[field]) return;
    setErrors((existing) => {
      const next = { ...existing };
      delete next[field];
      return next;
    });
  };

  const update = (field: TextField) => (event: ChangeEvent<HTMLInputElement>) => {
    // While joining, what was sent is what shows.
    if (isPending) return;
    const value = event.target.value;
    setDraft((existing) => ({ ...existing, [field]: value }));
    // An error clears as soon as its field is being corrected, so it never
    // contradicts what is on screen.
    clearError(field);
  };

  const setCountry = (value: string) => {
    if (isPending) return;
    setDraft((existing) => ({ ...existing, country: value }));
    clearError('country');
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setSettled(state);
    const found = validateWaitlist({ ...draft, service });
    const first = firstInvalidField(found);
    setErrors(found);
    if (first) {
      focusField(first);
      return;
    }
    const form = new FormData();
    form.set(WAITLIST_FORM_FIELDS.name, draft.name);
    form.set(WAITLIST_FORM_FIELDS.email, draft.email);
    form.set(WAITLIST_FORM_FIELDS.phone, draft.phone);
    form.set(WAITLIST_FORM_FIELDS.country, draft.country);
    form.set(WAITLIST_FORM_FIELDS.service, service);
    form.set(WAITLIST_FORM_FIELDS.consentVersion, consent.version);
    startTransition(() => dispatch(form));
  };

  if (joined) {
    return (
      <div
        ref={successRef}
        className={styles.success}
        role="status"
        tabIndex={-1}
        // Where a "Join the waitlist" jump lands once the form has gone.
        data-jump-focus=""
      >
        <span className={styles.successMark} aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7" />
          </svg>
        </span>
        {/* A waitlist, not a booking: no consultation date, no reply time
            (behaviour guide §8). */}
        <h3 className={styles.successTitle}>Thank you — you’re on the waitlist.</h3>
        <p className={styles.successText}>We’ll let you know as soon as consultations open.</p>
      </div>
    );
  }

  const describedBy = (...parts: Array<string | false | undefined>) =>
    parts.filter(Boolean).join(' ') || undefined;

  return (
    // noValidate: the browser's own bubbles cannot be styled, are announced
    // inconsistently and vanish on scroll.
    <form
      className={styles.form}
      action={dispatch}
      onSubmit={onSubmit}
      noValidate
      aria-busy={isPending || undefined}
    >
      {/* The wording shown below, by version — what the sign-up agrees to. */}
      <input type="hidden" name={WAITLIST_FORM_FIELDS.consentVersion} value={consent.version} />

      <div data-field="">
        <label htmlFor={ids.name} className={styles.label}>
          Full name
        </label>
        <input
          ref={nameRef}
          id={ids.name}
          name={WAITLIST_FORM_FIELDS.name}
          type="text"
          autoComplete="name"
          placeholder="Your name"
          required
          maxLength={WAITLIST_LIMITS.name}
          value={draft.name}
          onChange={update('name')}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy(errors.name && errorId('name'))}
          className={styles.field}
        />
        <FieldError id={errorId('name')} message={errors.name} />
      </div>

      <div className={styles.pair}>
        <div data-field="">
          <label htmlFor={ids.email} className={styles.label}>
            Email address
          </label>
          <input
            ref={emailRef}
            id={ids.email}
            name={WAITLIST_FORM_FIELDS.email}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            maxLength={WAITLIST_LIMITS.email}
            value={draft.email}
            onChange={update('email')}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy(errors.email && errorId('email'))}
            className={styles.field}
          />
          <FieldError id={errorId('email')} message={errors.email} />
        </div>

        <div data-field="">
          <label htmlFor={ids.phone} className={styles.label}>
            Telephone number (optional)
          </label>
          <input
            ref={phoneRef}
            id={ids.phone}
            name={WAITLIST_FORM_FIELDS.phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+44 7700 900000"
            maxLength={WAITLIST_LIMITS.phone}
            value={draft.phone}
            onChange={update('phone')}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={describedBy(errors.phone && errorId('phone'))}
            className={styles.field}
          />
          <FieldError id={errorId('phone')} message={errors.phone} />
        </div>
      </div>

      <div data-field="">
        <label htmlFor={ids.country} className={styles.label}>
          Country or region
        </label>
        <CountryCombobox
          id={ids.country}
          name={WAITLIST_FORM_FIELDS.country}
          value={draft.country}
          onValueChange={setCountry}
          inputRef={countryRef}
          maxLength={WAITLIST_LIMITS.country}
          invalid={Boolean(errors.country)}
          errorId={errors.country ? errorId('country') : undefined}
          disabled={isPending}
        />
        <FieldError id={errorId('country')} message={errors.country} />
      </div>

      {/* A native radio group: three mutually exclusive answers, one tab stop,
          arrow keys between them — and it posts without JavaScript. */}
      <fieldset
        ref={serviceRef}
        className={styles.choices}
        aria-describedby={errors.service ? errorId('service') : undefined}
        data-field=""
      >
        <legend className={styles.label}>Which service</legend>
        <div className={styles.options}>
          {WAITLIST_SERVICES.map((option) => (
            <label
              key={option.id}
              className={styles.choice}
              data-checked={service === option.id || undefined}
            >
              <span className={styles.choiceTop}>
                <input
                  type="radio"
                  name={WAITLIST_FORM_FIELDS.service}
                  value={option.id}
                  checked={service === option.id}
                  required
                  onChange={() => {
                    if (!isPending) choose(option.id);
                  }}
                  className={styles.radio}
                />
                <span className={styles.choiceLabel}>{option.label}</span>
              </span>
              {option.note ? <span className={styles.choiceNote}>{option.note}</span> : null}
            </label>
          ))}
        </div>
        <FieldError id={errorId('service')} message={errors.service} />
      </fieldset>

      <div>
        {/* Not in the design: a plain statement that nothing was stored, with
            everything entered still in place. */}
        {failed ? (
          <p className={styles.failure} role="alert">
            <ErrorGlyph />
            <span>
              {state.status === 'unavailable'
                ? 'The waitlist can’t take sign-ups from this page yet, so you haven’t been added.'
                : state.status === 'changed'
                  ? SIGNUP_FORM_CHANGED
                  : 'We couldn’t add you to the waitlist just now. Everything you’ve entered is still here, so please try again.'}
            </span>
          </p>
        ) : null}
        {/* The label never changes — every waitlist CTA reads "Join the
            waitlist"; the wait is `aria-busy` on the form and the disabled state. */}
        <button type="submit" className={styles.submit} disabled={isPending}>
          {JOIN_WAITLIST_LABEL}
        </button>
        {/* The design's line is "Confidential by design. We’ll only use your
            details to contact you about Private Table. See our Privacy
            Policy." — its middle sentence is the list's published wording. */}
        <p className={styles.privacy}>
          Confidential by design. {consent.text} See our{' '}
          <Link href={PRIVACY_ITEM.href} className={styles.privacyLink}>
            {PRIVACY_ITEM.label}
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
