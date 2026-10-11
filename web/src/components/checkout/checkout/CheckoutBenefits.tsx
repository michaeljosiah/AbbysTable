'use client';
import { useState } from 'react';
import type { BoxQuote } from '@/lib/aonik/map';
import { formatPrice } from '@/lib/format';
import { InfoNote } from './InfoNote';
import s from './CheckoutBenefits.module.css';
import a from './Checkout.module.css';
export function CheckoutBenefits({
  loyalty,
  signedIn,
  createAccount,
  busy,
  onChange,
}: {
  loyalty: BoxQuote['loyalty'];
  signedIn: boolean;
  createAccount: boolean;
  busy: boolean;
  onChange: (input: {
    createAccount?: boolean;
    requestedPoints?: number;
  }) => Promise<void>;
}) {
  const [requested, setRequested] = useState(''),
    [error, setError] = useState('');
  const enabled = Boolean(
    loyalty &&
    loyalty.reasonCode !== 'commerce.loyalty_disabled' &&
    loyalty.reasonCode !== 'commerce.loyalty_currency_unsupported',
  );
  if (signedIn && !enabled) return null;
  const earned = loyalty?.estimatedEarnedPoints ?? 0;
  const max = Math.min(
    loyalty?.availablePoints ?? 0,
    loyalty?.maxRedeemablePoints ?? 0,
  );
  async function apply() {
    const n = Number(requested);
    if (!requested || !Number.isSafeInteger(n) || n < 0 || n > max) {
      setError(`Choose between 0 and ${max} points.`);
      return;
    }
    setError('');
    await onChange({ requestedPoints: n });
  }
  return (
    <>
      <div className={s.pts}>
        {enabled ? (
          <span className={s.ptsIc} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--brass)">
              <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" />
            </svg>
          </span>
        ) : null}
        <div style={{ position: 'relative' }}>
          {enabled ? (
            <div className={s.heading}>
              <p className={s.ptsH}>
                {signedIn || createAccount
                  ? `You’ll earn ${earned} points`
                  : `${earned} points available`}
              </p>
              <InfoNote
                id="ck-points-note"
                title="About Abby’s Table points"
                closeLabel="Close About Abby’s Table points"
                trigger={{ kind: 'icon', label: 'About points' }}
              >
                <p className={a.noteP}>
                  Earn points with every order and use them towards future
                  Abby’s Table purchases. This order will earn you {earned}{' '}
                  points.
                </p>
                <p className={a.noteP}>
                  Log in or create an account before payment to collect them.
                  Your points will be added to your account once your order is
                  confirmed.
                </p>
              </InfoNote>
            </div>
          ) : null}
          {!signedIn ? (
            <label className={s.check}>
              <input
                type="checkbox"
                checked={createAccount}
                disabled={busy}
                onChange={(e) =>
                  void onChange({ createAccount: e.target.checked })
                }
              />
              <span>
                <b>Create an Abby’s Table account</b>
                <small>
                  {createAccount
                    ? 'We’ll email you after payment to finish setting it up.'
                    : 'Collect your points, save your details and make future orders quicker.'}
                </small>
              </span>
            </label>
          ) : null}
        </div>
      </div>
      {signedIn &&
      loyalty &&
      ((loyalty.availablePoints ?? 0) > 0 || loyalty.appliedPoints > 0) ? (
        <div className={s.redeem}>
          <p className={a.sectionP}>
            {loyalty.availablePoints} points available · worth{' '}
            {formatPrice(loyalty.availablePoints ?? 0)}. Use any amount, up to
            20% of this order.
          </p>
          {loyalty.appliedPoints > 0 ? (
            <div className={a.applied}>
              <span>
                {loyalty.appliedPoints} points applied ·{' '}
                {formatPrice(loyalty.appliedValuePence)} off
              </span>
              <button
                type="button"
                className={a.textAction}
                disabled={busy}
                onClick={() => void onChange({ requestedPoints: 0 })}
              >
                Remove points
              </button>
            </div>
          ) : null}
          <div className={a.code}>
            <label className="visuallyHidden" htmlFor="ck-use-points">
              Points to use
            </label>
            <input
              className={a.input}
              id="ck-use-points"
              inputMode="numeric"
              placeholder="Points to use"
              value={requested}
              onChange={(e) => {
                setRequested(e.target.value.replace(/[^0-9]/g, ''));
                setError('');
              }}
              aria-describedby="ck-use-points-error"
            />
            <button
              className={a.apply}
              type="button"
              disabled={busy}
              onClick={() => void apply()}
            >
              Apply
            </button>
          </div>
          <p
            className={a.codeMsg}
            id="ck-use-points-error"
            role="status"
            data-bad={!!error || undefined}
          >
            {error}
          </p>
        </div>
      ) : null}
    </>
  );
}
