'use client';
import { useState, useActionState } from 'react';
import { loginAction, type AuthActionState } from '@/lib/auth/actions';
import { FORGOT_PASSWORD_HREF } from '@/lib/content/navigation';
import styles from '@/components/gifting/GiftCheckout.module.css';
const c = (...names: string[]) => names.map((n) => styles[n] ?? '').join(' ');
export function CheckoutLogin({
  beforeLogin,
}: {
  beforeLogin: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false),
    [reveal, setReveal] = useState(false),
    [email, setEmail] = useState('');
  const [state, action, pending] = useActionState(
    async (previous: AuthActionState, form: FormData) => {
      if (!(await beforeLogin()))
        return {
          status: 'error' as const,
          message: 'We couldn’t save your checkout details. Please try again.',
        };
      return loginAction(previous, form);
    },
    { status: 'idle' } as AuthActionState,
  );
  return (
    <div className={c('gc-login')}>
      <button
        className={c('gc-login-row')}
        type="button"
        aria-expanded={open}
        aria-controls="ck-login-panel"
        onClick={() => setOpen(!open)}
      >
        <span>
          <span style={{ display: 'block' }}>Already have an account?</span>
          <span className={c('gc-login-t')}>
            <span>Log in for faster checkout</span>
          </span>
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
          className={c('gc-login-chev', open ? 'gc-login-chev-open' : '')}
        >
          <path d="m6 9.5 6 6 6-6" />
        </svg>
      </button>
      <div
        id="ck-login-panel"
        hidden={!open}
        className={c('gc-login-panel', open ? 'is-open' : '')}
      >
        <form action={action}>
          <input type="hidden" name="next" value="/box/checkout" />
          <h3 className={c('gc-login-h')}>Log in to your account</h3>
          <label className={c('gc-lab')} htmlFor="ck-login-email">
            Email address
          </label>
          <input
            id="ck-login-email"
            className={c('gc-in')}
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className={c('gc-lab')} htmlFor="ck-login-password">
            Password
          </label>
          <span className={c('gc-pw-wrap')}>
            <input
              id="ck-login-password"
              className={c('gc-in')}
              name="password"
              type={reveal ? 'text' : 'password'}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className={c('gc-pw-btn')}
              aria-pressed={reveal}
              aria-label={reveal ? 'Hide password' : 'Show password'}
              onClick={() => setReveal(!reveal)}
            >
              {reveal ? 'Hide' : 'Show'}
            </button>
          </span>
          <p className={c('gc-err')} role="status">
            {state.status === 'unavailable'
              ? 'Sign-in is unavailable right now.'
              : (state.message ??
                Object.values(state.fieldErrors ?? {}).join(' '))}
          </p>
          <div className={c('gc-login-actions')}>
            <button className={c('gc-cta', 'gc-cta-sm')} disabled={pending}>
              Log in
            </button>
            <a className={c('gc-forgot')} href={FORGOT_PASSWORD_HREF}>
              Forgot your password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
