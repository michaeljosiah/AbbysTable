'use client';
import { useState } from 'react';
import type { BoxPricing } from '@/lib/aonik/types';
import { boxPricePence } from '@/lib/cart/CartProvider';
import { formatPrice } from '@/lib/format';
import a from './Account.module.css';
import s from './Benefits.module.css';
export function PointsCalculator({
  pricing,
  available,
}: {
  pricing: BoxPricing;
  available: number;
}) {
  const presets = pricing.presets
    .map((p) => p.dishCount)
    .filter((n) => n >= 6 && n <= 99);
  const [size, setSize] = useState<number | 'own'>(
      presets[1] ?? presets[0] ?? 'own',
    ),
    [own, setOwn] = useState('6');
  const n = size === 'own' ? Number(own) : size;
  const invalid = !Number.isInteger(n) || n < 6 || n > 99;
  const price = invalid ? 0 : boxPricePence(n, size === 'own', pricing);
  const points = Math.floor((price * 2) / 100),
    cap = Math.floor(price * 0.2),
    use = Math.min(available, cap);
  return (
    <div className={`${a.card} ${s.calc}`}>
      <div>
        <h3 className={a.cardTitle}>What could your next box earn?</h3>
        <p className={a.smallP} style={{ marginTop: 6 }}>
          Choose a box size.
        </p>
      </div>
      <div className={s.seg} role="group" aria-label="Box size">
        {[...presets, 'own'].map((z) => (
          <button
            key={z}
            type="button"
            aria-pressed={size === z}
            onClick={() => setSize(z as typeof size)}
          >
            {z === 'own' ? 'Your own' : z}
          </button>
        ))}
      </div>
      {size === 'own' ? (
        <div>
          <label className={s.calcOwn} htmlFor="ac-calc-n">
            <input
              className={s.ownInput}
              id="ac-calc-n"
              inputMode="numeric"
              maxLength={2}
              autoComplete="off"
              value={own}
              onChange={(e) => setOwn(e.target.value.replace(/[^0-9]/g, ''))}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? 'ac-calc-e' : undefined}
            />
            <span>dishes (6 to 99)</span>
          </label>
          {invalid ? (
            <p id="ac-calc-e" className={a.err}>
              Choose between 6 and 99 dishes.
            </p>
          ) : null}
        </div>
      ) : null}
      {!invalid ? (
        <div className={s.calcOut} aria-live="polite">
          <p className={s.calcBig}>
            A {n}-dish box earns{' '}
            <span className={s.calcPts}>{points} points</span>
          </p>
          <p className={a.p}>
            That’s {formatPrice(points)} off a future order.
          </p>
          <p className={a.p}>
            Your {available.toLocaleString('en-GB')} points could take{' '}
            <b style={{ fontWeight: 600, color: 'var(--green-forest)' }}>
              {formatPrice(use)}
            </b>{' '}
            off this box.{available > cap ? ' (Up to 20% of an order.)' : ''}
          </p>
        </div>
      ) : null}
      <p className={a.smallP}>
        Based on today’s box prices, before extras and upgrades.
      </p>
    </div>
  );
}
