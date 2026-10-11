'use client';
import { useEffect, useRef, useState } from 'react';
import { previewReorderAction } from '@/lib/account/reorderActions';
import type { ReorderPreview, ReorderDishChoice } from '@/lib/cart/reorder';
import { useOverlay } from '@/components/checkout/checkout/useOverlay';
import { loginPathFor } from '@/lib/auth/redirect';
import a from './Account.module.css';
import s from './OrderAgain.module.css';
export function OrderAgainSheet({
  orderId,
  label,
  upcoming,
  returnTo,
  busy,
  message,
  onClose,
  onGo,
}: {
  orderId: string;
  label: string;
  upcoming: boolean;
  returnTo: string;
  busy: boolean;
  message: string | null;
  onClose: () => void;
  onGo: (selections: ReorderDishChoice[]) => Promise<void>;
}) {
  const [preview, setPreview] = useState<ReorderPreview | null>(null),
    [failed, setFailed] = useState(false),
    [selected, setSelected] = useState<Record<string, number>>({}),
    [error, setError] = useState('');
  const panel = useRef<HTMLDivElement>(null),
    scrim = useRef<HTMLDivElement>(null),
    opener = useRef<HTMLElement | null>(null),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    opener.current = document.activeElement as HTMLElement;
  }, []);
  useOverlay({
    open: true,
    modal: true,
    panel,
    scrim,
    opener,
    onClose: () => {
      if (!busy) onClose();
    },
  });
  useEffect(() => {
    heading.current?.focus();
    let active = true;
    void previewReorderAction(orderId)
      .then((r) => {
        if (!active) return;
        if (r.status === 'ended') {
          window.location.assign(loginPathFor(returnTo));
          return;
        }
        if (r.status !== 'ready') {
          setFailed(true);
          return;
        }
        setPreview(r.preview);
        setSelected(
          Object.fromEntries(
            r.preview.dishes
              .filter((d) => d.maxQuantity > 0)
              .map((d) => [d.selectionId, Math.min(d.quantity, d.maxQuantity)]),
          ),
        );
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [orderId, returnTo]);
  const total = Object.values(selected).reduce((n, q) => n + q, 0),
    date = label.replace(/^Order again: dishes from /, '');
  function set(id: string, quantity: number) {
    setSelected((prev) => {
      const next = { ...prev };
      if (quantity > 0) next[id] = quantity;
      else delete next[id];
      return next;
    });
    setError('');
  }
  return (
    <div className={s.roWrap}>
      <div
        className={s.roScrim}
        ref={scrim}
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        className={s.ro}
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ac-ro-h"
        aria-describedby="ac-ro-from"
      >
        <div className={s.roHead}>
          <h2 className={s.roH} id="ac-ro-h" tabIndex={-1} ref={heading}>
            Order again
          </h2>
          <button
            type="button"
            className={s.roX}
            disabled={busy}
            onClick={onClose}
            aria-label="Close Order again"
          >
            ×
          </button>
        </div>
        <div className={s.roBody}>
          <p className={a.p} id="ac-ro-from">
            From your {date} order. Untick anything you’d rather leave out.
          </p>
          {upcoming ? (
            <p
              className={a.p}
              style={{ fontWeight: 600, color: 'var(--green-forest)' }}
            >
              This starts a new box. Your {date} delivery won’t change.
            </p>
          ) : null}
          {failed ? (
            <p className={a.problem}>
              We couldn’t load these dishes. Please try again later.
            </p>
          ) : !preview ? (
            <p className={a.p} role="status">
              Loading your dishes…
            </p>
          ) : (
            <ul className={s.roList}>
              {preview.dishes.map((d) => {
                const q = selected[d.selectionId] ?? 0;
                return (
                  <li
                    key={d.selectionId}
                    className={s.roRow}
                    data-off={!q || undefined}
                    data-na={!d.maxQuantity || undefined}
                  >
                    <label className={s.roPick}>
                      <input
                        type="checkbox"
                        disabled={!d.maxQuantity || busy}
                        checked={!!q}
                        onChange={(e) =>
                          set(
                            d.selectionId,
                            e.target.checked
                              ? Math.min(d.quantity, d.maxQuantity)
                              : 0,
                          )
                        }
                      />
                      <span className={s.roName}>
                        <span>
                          {d.name}
                          {d.isSignature ? (
                            <span className={a.sig}>Signature</span>
                          ) : null}
                        </span>
                        <span className={s.roMeta}>
                          {d.maxQuantity
                            ? d.personalisationSummary || 'Light Table'
                            : 'No longer available'}
                        </span>
                      </span>
                    </label>
                    {d.maxQuantity ? (
                      <span
                        className={s.roStep}
                        role="group"
                        aria-label={`Quantity of ${d.name}`}
                      >
                        <button
                          type="button"
                          disabled={!q || q <= 1 || busy}
                          onClick={() => set(d.selectionId, q - 1)}
                          aria-label={`Decrease ${d.name}`}
                        >
                          −
                        </button>
                        <span className={s.roQ} aria-live="polite">
                          {q}
                        </span>
                        <button
                          type="button"
                          disabled={
                            busy || !q || q >= d.maxQuantity || total >= 99
                          }
                          onClick={() => set(d.selectionId, q + 1)}
                          aria-label={`Increase ${d.name}`}
                        >
                          +
                        </button>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className={s.roFoot}>
          <p
            className={s.roSum}
            id="ac-ro-sum"
            aria-live="polite"
            data-err={!!error || !!message || undefined}
          >
            {error ||
              message ||
              `${total} ${total === 1 ? 'dish' : 'dishes'} selected`}
          </p>
          <p className={a.hint}>
            Prices are today’s. You’ll see your total on the next step.
          </p>
          <button
            type="button"
            className={a.submit}
            disabled={busy || !preview || failed}
            aria-describedby="ac-ro-sum"
            onClick={() => {
              if (!total) {
                setError('Choose at least one dish.');
                return;
              }
              void onGo(
                Object.entries(selected).map(([selectionId, quantity]) => ({
                  selectionId,
                  quantity,
                })),
              );
            }}
          >
            {busy ? 'Starting…' : 'Build a box'}
          </button>
          <button
            type="button"
            className={`${a.act} ${s.roCancel}`}
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
