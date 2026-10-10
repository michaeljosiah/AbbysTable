'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import {
  removeAddressAction,
  saveAddressAction,
  setDefaultAddressAction,
  type AddressActionResult,
} from '@/lib/account/addressActions';
import {
  EMPTY_ADDRESS_FORM,
  MAX_ADDRESS_TYPE,
  addressFormErrors,
  formFromAddress,
  trimmedForm,
  type AddressFormErrors,
  type AddressFormValues,
} from '@/lib/account/addressForm';
import type { AddressBook as Book, CustomerAddress } from '@/lib/aonik/addresses';
import { loginPathFor } from '@/lib/auth/redirect';

import styles from './Account.module.css';

const ADDRESSES_HREF = '/account/addresses';

interface FormState {
  /** The address being edited; absent when adding. */
  editing?: CustomerAddress;
  values: AddressFormValues;
  errors: AddressFormErrors;
  makeDefault: boolean;
}

function ErrorLine({ id, children }: { id: string; children: string }) {
  return (
    <p className={styles.err} id={id}>
      <svg className={styles.errGlyph} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M12 3.5l8.5 16h-17z" />
        <path d="M12 10v4M12 16.8h.01" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

/**
 * Addresses (design: My Account, Addresses). The book is held here and
 * replaced wholesale by every answer, exactly as Aonik returns it: each write
 * names the book `version` it was based on, a stale tab is refused, and the
 * refusal brings the current book with it. The server re-runs the form's rules.
 */
export function AddressBook({ initial }: { initial: Book }) {
  const [book, setBook] = useState<Book>(initial);
  const [form, setForm] = useState<FormState | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [said, setSaid] = useState<{ kind: 'ok' | 'problem'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const formTitleRef = useRef<HTMLHeadingElement>(null);
  const saidRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (form) formTitleRef.current?.focus();
  }, [form?.editing?.id, form === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (result: AddressActionResult): boolean => {
    if (result.status === 'ended') {
      window.location.assign(loginPathFor(ADDRESSES_HREF));
      return false;
    }
    if (result.status === 'ok') {
      setBook(result.book);
      setSaid({ kind: 'ok', text: result.said });
      return true;
    }
    if (result.status === 'failed') {
      if (result.book) setBook(result.book);
      setSaid({ kind: 'problem', text: result.message });
    }
    return false;
  };

  const run = async (action: () => Promise<AddressActionResult>): Promise<AddressActionResult | null> => {
    if (busy) return null;
    setBusy(true);
    setSaid(null);
    try {
      return await action();
    } catch {
      setSaid({ kind: 'problem', text: 'We couldn’t reach your addresses just now. Please try again in a moment.' });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const announce = () => requestAnimationFrame(() => saidRef.current?.focus());

  const open = (editing?: CustomerAddress) => {
    setSaid(null);
    setConfirming(null);
    setForm({
      editing,
      values: editing ? formFromAddress(editing) : EMPTY_ADDRESS_FORM,
      errors: {},
      // The first address is the default whatever the box says; later ones are not unless asked.
      makeDefault: editing ? editing.isDefault : book.addresses.length === 0,
    });
  };

  const setValue = (key: keyof AddressFormValues, value: string) =>
    setForm((current) =>
      current && {
        ...current,
        values: { ...current.values, [key]: value },
        errors: key === 'label' || key === 'line2' ? current.errors : { ...current.errors, [key]: undefined },
      },
    );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    const values = trimmedForm(form.values);
    const errors = addressFormErrors(values);
    if (Object.keys(errors).length > 0) {
      setForm({ ...form, errors });
      const first = (['line1', 'city', 'postcode'] as const).find((key) => errors[key]);
      if (first) document.getElementById(`address-${first}`)?.focus();
      return;
    }
    const result = await run(() =>
      saveAddressAction({
        id: form.editing?.id,
        version: book.version,
        values,
        makeDefault: form.makeDefault,
        knownIds: book.addresses.map((address) => address.id),
        keep: form.editing ? { line3: form.editing.fields.line3, state: form.editing.fields.state } : undefined,
      }),
    );
    if (!result) return;
    if (result.status === 'invalid') {
      setForm({ ...form, errors: result.errors });
      return;
    }
    if (apply(result)) setForm(null);
    announce();
  };

  const remove = async (id: string) => {
    const result = await run(() => removeAddressAction({ id, version: book.version }));
    setConfirming(null);
    if (result) apply(result);
    announce();
  };

  const makeDefault = async (id: string) => {
    const result = await run(() => setDefaultAddressAction({ id, version: book.version }));
    if (result) apply(result);
    announce();
  };

  const errors = form?.errors ?? {};

  return (
    <>
      <div role="status" aria-live="polite">
        {said ? (
          <p className={said.kind === 'ok' ? styles.ok : styles.problem} ref={saidRef} tabIndex={-1}>
            <span>{said.text}</span>
          </p>
        ) : null}
      </div>

      {form ? (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle} ref={formTitleRef} tabIndex={-1} id="address-form-h">
            {form.editing ? 'Edit address' : 'Add an address'}
          </h3>
          <form className={styles.form} onSubmit={submit} noValidate aria-labelledby="address-form-h">
            <div>
              <label className={styles.formLabel} htmlFor="address-label">
                Label <i>(optional)</i>
              </label>
              <input
                className={styles.field}
                id="address-label"
                type="text"
                autoComplete="off"
                maxLength={MAX_ADDRESS_TYPE}
                placeholder="Home"
                value={form.values.label}
                onChange={(event) => setValue('label', event.target.value)}
              />
            </div>
            <div>
              <label className={styles.formLabel} htmlFor="address-line1">
                Address line 1
              </label>
              <input
                className={styles.field}
                id="address-line1"
                type="text"
                autoComplete="address-line1"
                value={form.values.line1}
                onChange={(event) => setValue('line1', event.target.value)}
                aria-invalid={errors.line1 ? 'true' : undefined}
                aria-describedby={errors.line1 ? 'address-line1-e' : undefined}
              />
              {errors.line1 ? <ErrorLine id="address-line1-e">{errors.line1}</ErrorLine> : null}
            </div>
            <div>
              <label className={styles.formLabel} htmlFor="address-line2">
                Address line 2 <i>(optional)</i>
              </label>
              <input
                className={styles.field}
                id="address-line2"
                type="text"
                autoComplete="address-line2"
                value={form.values.line2}
                onChange={(event) => setValue('line2', event.target.value)}
              />
            </div>
            <div className={styles.formRow}>
              <div>
                <label className={styles.formLabel} htmlFor="address-city">
                  Town or city
                </label>
                <input
                  className={styles.field}
                  id="address-city"
                  type="text"
                  autoComplete="address-level2"
                  value={form.values.city}
                  onChange={(event) => setValue('city', event.target.value)}
                  aria-invalid={errors.city ? 'true' : undefined}
                  aria-describedby={errors.city ? 'address-city-e' : undefined}
                />
                {errors.city ? <ErrorLine id="address-city-e">{errors.city}</ErrorLine> : null}
              </div>
              <div>
                <label className={styles.formLabel} htmlFor="address-postcode">
                  Postcode
                </label>
                <input
                  className={styles.field}
                  id="address-postcode"
                  type="text"
                  autoComplete="postal-code"
                  autoCapitalize="characters"
                  value={form.values.postcode}
                  onChange={(event) => setValue('postcode', event.target.value)}
                  aria-invalid={errors.postcode ? 'true' : undefined}
                  aria-describedby={errors.postcode ? 'address-postcode-e' : undefined}
                />
                {errors.postcode ? <ErrorLine id="address-postcode-e">{errors.postcode}</ErrorLine> : null}
              </div>
            </div>
            {form.editing?.isDefault ? null : (
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={form.makeDefault}
                  onChange={(event) => setForm({ ...form, makeDefault: event.target.checked })}
                />
                <span>Make this my default address</span>
              </label>
            )}
            <div className={styles.formActs}>
              <button className={styles.submit} type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save address'}
              </button>
              <button className={styles.act} type="button" onClick={() => setForm(null)} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {book.addresses.length === 0 && !form ? (
        <div className={styles.empty}>
          <p className={styles.p}>No saved addresses yet.</p>
        </div>
      ) : null}

      <div className={styles.addrGrid}>
        {book.addresses.map((address) => {
          const headingId = `address-${address.id}-h`;
          return (
            <article className={`${styles.card} ${styles.addr}`} key={address.id} aria-labelledby={headingId}>
              <div className={styles.addrTop}>
                <h3 className={styles.addrLabel} id={headingId}>
                  {address.type}
                </h3>
                {address.isDefault ? <span className={styles.badge}>Default</span> : null}
              </div>
              <p className={styles.p}>
                {address.lines.map((line, index) => (
                  <span key={`${line}-${index}`}>
                    {index > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
              </p>
              {confirming === address.id ? (
                <div className={styles.confirm} role="group" aria-label="Confirm removal">
                  <p className={styles.p}>Remove this address?</p>
                  <div className={styles.actions} style={{ marginTop: 0 }}>
                    <button className={`${styles.act} ${styles.actRemove}`} type="button" onClick={() => remove(address.id)} disabled={busy}>
                      Remove
                    </button>
                    <button className={styles.act} type="button" onClick={() => setConfirming(null)} disabled={busy}>
                      Keep it
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.actions} style={{ marginTop: 8 }}>
                  <button className={styles.act} type="button" onClick={() => open(address)} aria-label={`Edit ${address.type} address`} disabled={busy}>
                    Edit
                  </button>
                  {address.isDefault ? null : (
                    <button className={styles.act} type="button" onClick={() => makeDefault(address.id)} disabled={busy}>
                      Set as default
                    </button>
                  )}
                  <button
                    className={`${styles.act} ${styles.actRemove}`}
                    type="button"
                    onClick={() => setConfirming(address.id)}
                    aria-label={`Remove ${address.type} address`}
                    disabled={busy}
                  >
                    Remove
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {form ? null : (
        <div>
          <button className={`${styles.pill} ${styles.pillOutline}`} type="button" onClick={() => open()} disabled={busy}>
            Add an address
          </button>
        </div>
      )}
    </>
  );
}
