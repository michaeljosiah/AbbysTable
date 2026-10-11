'use client';
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { PaymentChrome } from '@/components/checkout/payment/PaymentChrome';
import { loginAction } from '@/lib/auth/actions';
import {
  FORGOT_PASSWORD_HREF,
  TERMS_ITEM,
  PRIVACY_ITEM,
} from '@/lib/content/navigation';
import { RemovalWindow } from '@/lib/cart/removalWindow';
import {
  EMPTY_GIFT,
  giftMoney,
  giftTotal,
  londonToday,
  validateGift,
  type GiftDraft,
  type GiftOptions,
} from '@/lib/gifting/model';
import type { GiftSession } from '@/lib/gifting/server';
import { GiftCalendar } from './GiftCalendar';
import { GiftDialog } from './GiftDialog';
import { CalendarIcon, GiftIcon, LockIcon, ShieldIcon } from './GiftIcons';
import { giftResponse } from '@/lib/gifting/response';
import styles from './GiftCheckout.module.css';
const c = (...names: string[]) =>
  names
    .map((name) => styles[name])
    .filter(Boolean)
    .join(' ');
const FAQS = [
  {
    id: 'arrival',
    question: 'How will the gift card arrive?',
    answer:
      'Choose email or post. Email cards go to the recipient’s inbox on your chosen send date. Physical cards are posted on your chosen posting date.',
  },
  {
    id: 'message',
    question: 'Can I add a message?',
    answer:
      'Email includes your message at no charge. For post, add a greeting card with your printed message.',
  },
  {
    id: 'spending',
    question: 'How do they spend it?',
    answer: 'They can use their gift card towards an Abby’s Table order.',
  },
];
export function GiftCheckout({
  options,
  initial,
  entry,
  signedIn,
  signedEmail,
}: {
  options: GiftOptions;
  initial: GiftSession | null;
  entry: Partial<GiftDraft>;
  signedIn: boolean;
  signedEmail?: string;
}) {
  const router = useRouter();
  const hasEntry = Object.keys(entry).length > 0;
  const [draft, setDraft] = useState<GiftDraft>({
    ...EMPTY_GIFT,
    ...initial?.draft,
    ...(hasEntry ? entry : {}),
    ...(signedEmail ? { email: signedEmail } : {}),
  });
  const latest = useRef(draft);
  const dirty = useRef(false);
  const version = useRef(initial?.version ?? '');
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [ready, setReady] = useState(Boolean(initial && !hasEntry));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const blocked = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginState, loginForm, loginPending] = useActionState(
    async (previous: Parameters<typeof loginAction>[0], form: FormData) => {
      if (!ready || blocked.current || busy)
        return {
          status: 'error' as const,
          message: 'Please save your gift before signing in.',
        };
      setBusy(true);
      try {
        await persist(latest.current);
      } catch {
        setBusy(false);
        return {
          status: 'error' as const,
          message: 'Your gift could not be saved. Reload before signing in.',
        };
      }
      try {
        return await loginAction(previous, form);
      } finally {
        setBusy(false);
      }
    },
    {
      status: 'idle' as const,
    },
  );
  const [reveal, setReveal] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [sheetHost, setSheetHost] = useState<HTMLDivElement | null>(null);
  const dateOpener = useRef<HTMLButtonElement>(null);
  const summary = useRef<HTMLElement>(null);
  const payButton = useRef<HTMLButtonElement>(null);
  const [barVisible, setBarVisible] = useState(true);
  const [undo, setUndo] = useState(false);
  const [today] = useState(londonToday);
  const [when, setWhen] = useState(
    (draft.date && draft.date !== today) || draft.route === 'post'
      ? 'pick'
      : 'today',
  );
  const removeClock = useRef<RemovalWindow | null>(null);
  const initialized = useRef(false);
  const [quote, setQuote] = useState<number | null>(null);
  const request = useCallback(
    async (action: string, body: unknown, basis = version.current) => {
      const response = await fetch(`/api/gift-card/${action}`, {
        method: action === 'draft' ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cart-Version': basis,
        },
        body: JSON.stringify(body),
      });
      if (response.status === 409) {
        blocked.current = true;
        setConflict(true);
      }
      const answer = await giftResponse(response);
      if (typeof answer.version === 'string') version.current = answer.version;
      return answer;
    },
    [],
  );
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (initial && !hasEntry) return;
    request('start', { draft: latest.current })
      .then(() => setReady(true))
      .catch((error) => setNotice(error.message));
  }, [hasEntry, initial, request]);
  const persist = useCallback(
    (value: GiftDraft) => {
      const operation = queue.current
        .catch(() => undefined)
        .then(() => {
          if (blocked.current)
            throw new Error(
              'Your gift changed in another tab. Reload to review the saved details.',
            );
          return request('draft', { draft: value }).then((answer) => {
            if (latest.current === value) dirty.current = false;
            return answer;
          });
        });
      queue.current = operation;
      return operation;
    },
    [request],
  );
  useEffect(() => {
    if (!ready || busy || !dirty.current) return;
    const timer = setTimeout(() => {
      void persist(draft).catch((error) => setNotice(error.message));
    }, 450);
    return () => clearTimeout(timer);
  }, [draft, initial, persist, ready, busy]);
  useEffect(() => {
    const visible = new Map<Element, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((item) =>
          visible.set(item.target, item.isIntersecting),
        );
        setBarVisible(!Array.from(visible.values()).some(Boolean));
      },
      { threshold: 0 },
    );
    if (payButton.current) observer.observe(payButton.current);
    const footer = document.querySelector('footer');
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, [draft.removed]);
  useEffect(() => {
    removeClock.current = new RemovalWindow(() => {
      setUndo(false);
    });
    return () => removeClock.current?.clear();
  }, []);
  const update = (patch: Partial<GiftDraft>) => {
    if (busy || blocked.current) return;
    const next = { ...latest.current, ...patch };
    dirty.current = true;
    latest.current = next;
    setDraft(next);
    setQuote(null);
    setNotice('');
    setErrors((current) => {
      const nextErrors = { ...current };
      Object.keys(patch).forEach((key) => delete nextErrors[key]);
      return nextErrors;
    });
  };
  const remove = () => {
    update({ removed: true });
    setUndo(true);
    removeClock.current?.start();
  };
  const restore = () => {
    removeClock.current?.clear();
    setUndo(false);
    update({ removed: false });
  };
  const leave = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    if (!ready || busy || blocked.current) return;
    const href = event.currentTarget.href;
    setBusy(true);
    try {
      await persist(latest.current);
      window.location.assign(href);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Your gift could not be saved.',
      );
      setBusy(false);
    }
  };
  const total = quote ?? giftTotal(draft, options);
  const pay = async () => {
    const submitted = {
      ...latest.current,
      date:
        latest.current.route === 'email' && when === 'today'
          ? today
          : latest.current.date,
    };
    const found = validateGift(submitted, options, today);
    setErrors(found);
    if (Object.keys(found).length) {
      setSheet(false);
      requestAnimationFrame(() =>
        document.getElementById(`gift-${Object.keys(found)[0]}`)?.focus(),
      );
      return;
    }
    if (!ready || busy || conflict) return;
    setBusy(true);
    setNotice('');
    try {
      await queue.current.catch(() => undefined);
      if (blocked.current)
        throw new Error(
          'Your gift changed in another tab. Reload to review it.',
        );
      const prepared = await request('prepare', { draft: submitted });
      if (prepared.totalPence !== total) {
        setQuote(Number(prepared.totalPence));
        setNotice(
          'Your total has changed. Review the current total, then continue to payment.',
        );
        return;
      }
      const result = await request('pay', {
        expectedTotalPence: prepared.totalPence,
      });
      if (result.checkoutUrl)
        window.location.assign(String(result.checkoutUrl));
      else router.push('/gift-card/payment');
    } catch (error) {
      // Read an uncertain outcome; never submit a second payment automatically.
      const payment = await fetch('/api/gift-card/payment', {
        cache: 'no-store',
      })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);
      if (payment?.paymentIntentId && !payment.canEdit) {
        window.location.assign('/gift-card/payment');
        return;
      }
      setNotice(
        error instanceof Error
          ? error.message
          : 'Payment could not be started.',
      );
    } finally {
      setBusy(false);
    }
  };
  const field = (
    key: keyof GiftDraft,
    label: string,
    attributes: {
      type?: string;
      placeholder?: string;
      autoComplete?: string;
      optional?: boolean;
      maxLength?: number;
    } = {},
  ) => (
    <div className={c('gc-field')}>
      <label className={c('gc-lab')} htmlFor={`gift-${key}`}>
        {label}
      </label>
      <input
        id={`gift-${key}`}
        className={c('gc-in')}
        type={attributes.type ?? 'text'}
        autoComplete={attributes.autoComplete ?? 'off'}
        placeholder={attributes.placeholder}
        maxLength={attributes.maxLength ?? 200}
        value={String(draft[key])}
        onChange={(event) => update({ [key]: event.target.value })}
        aria-invalid={Boolean(errors[key])}
        data-bad={Boolean(errors[key])}
        aria-describedby={errors[key] ? `gift-${key}-error` : undefined}
        disabled={busy}
      />
      {errors[key] ? (
        <p className={c('gc-err')} id={`gift-${key}-error`}>
          {errors[key]}
        </p>
      ) : null}
    </div>
  );
  const undoContent = undo ? (
    <div
      className={c('undoToast')}
      role="status"
      onMouseEnter={() => removeClock.current?.pause()}
      onMouseLeave={() => removeClock.current?.resume()}
      onFocus={() => removeClock.current?.pause()}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          removeClock.current?.resume();
      }}
    >
      Gift card removed <button onClick={restore}>Undo</button>
    </div>
  ) : null;
  const summaryContent: ReactNode = (
    <div className={c('gc-sum')}>
      <div className={c('gc-sum-head')}>
        <h2 className={c('gc-sum-title')}>
          <GiftIcon />
          Your order
        </h2>
        <a
          className={c('gc-edit')}
          href="/gifting?edit=1#gift-card"
          onClick={(event) => void leave(event)}
        >
          <span>Edit</span>
        </a>
      </div>
      <div className={c('gc-sum-body')}>
        {draft.removed ? (
          <div className={c('gc-empty')}>
            <p className={c('gc-empty-h')}>Your order is empty</p>
            <p className={c('gc-empty-p')}>Nothing you typed has been lost.</p>
            <div className={c('gc-empty-act')}>
              <button className={c('gc-empty-link')} onClick={restore}>
                <span>Restore gift card</span>
              </button>
              <a
                className={c('gc-empty-link')}
                href="/gifting"
                onClick={(event) => void leave(event)}
              >
                <span>Back to gifting →</span>
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className={c('gc-prod')}>
              <span className={c('gc-card')} aria-hidden="true">
                <span className={c('gc-card-b')}>Abby’s Table</span>
                <span className={c('gc-card-v')}>
                  {giftMoney(draft.value * 100)}
                </span>
              </span>
              <span>
                <span className={c('gc-prod-n')}>Gift card</span>
                <span className={c('gc-prod-v')}>
                  {giftMoney(draft.value * 100)}
                </span>
              </span>
            </div>
            <div className={c('gc-line')}>
              <div
                className={c('gc-qty')}
                role="group"
                aria-label="Gift card quantity"
              >
                <button
                  className={c('gc-step')}
                  disabled={draft.quantity <= 1 || busy || conflict}
                  aria-label="Remove one gift card"
                  onClick={() => update({ quantity: draft.quantity - 1 })}
                >
                  −
                </button>
                <span className={c('gc-qty-n')} role="status">
                  {draft.quantity}
                </span>
                <button
                  className={c('gc-step')}
                  disabled={draft.quantity >= 10 || busy || conflict}
                  aria-label="Add one gift card"
                  onClick={() => update({ quantity: draft.quantity + 1 })}
                >
                  +
                </button>
              </div>
              <button
                className={c('gc-remove')}
                disabled={busy || conflict}
                aria-label="Remove gift card from your order"
                onClick={remove}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M9 7V5h6v2M6 7l1 12h10l1-12" />
                </svg>
                Remove
              </button>
            </div>
            <div className={c('gc-rows')}>
              {[
                [
                  draft.quantity > 1 ? 'Gift cards' : 'Gift card amount',
                  '',
                  draft.quantity > 1
                    ? `${draft.quantity} × ${giftMoney(draft.value * 100)} = ${giftMoney(draft.value * draft.quantity * 100)}`
                    : giftMoney(draft.value * 100),
                ],
                draft.route === 'email'
                  ? [
                      'Delivery method',
                      'Sent to the recipient on your chosen date',
                      'Email',
                    ]
                  : [
                      'Postage',
                      'Royal Mail, 2–3 working days after your chosen posting date',
                      giftMoney(options.postage * 100),
                    ],
                ...(draft.date
                  ? [
                      [
                        draft.route === 'post'
                          ? 'Posting date'
                          : 'Delivery date',
                        '',
                        new Date(`${draft.date}T12:00:00Z`).toLocaleDateString(
                          'en-GB',
                          { day: 'numeric', month: 'short', year: 'numeric' },
                        ),
                      ],
                    ]
                  : []),
                ...(draft.route === 'post' && draft.includeGreetingCard
                  ? [
                      [
                        'Greeting card',
                        '',
                        `+${giftMoney(options.greetingCardPrice * 100)}`,
                      ],
                    ]
                  : draft.route === 'email' && draft.message.trim()
                    ? [['Personal message', '', 'Included']]
                    : []),
              ].map(([label, detail, value]) => (
                <div className={c('gc-row')} key={label}>
                  <span className={c('gc-row-l')}>
                    {label}
                    {detail ? (
                      <span className={c('gc-row-s')}>{detail}</span>
                    ) : null}
                  </span>
                  <span className={c('gc-row-v')}>{value}</span>
                </div>
              ))}
            </div>
            <div className={c('gc-tot')}>
              <span className={c('gc-tot-l')}>Total</span>
              <strong className={c('gc-tot-v')}>{giftMoney(total)}</strong>
            </div>
            <button
              ref={payButton}
              className={c('gc-cta')}
              disabled={!ready || busy || conflict}
              onClick={() => void pay()}
            >
              <LockIcon />
              Continue to secure payment
            </button>
            <p className={c('gc-stripe')}>
              <LockIcon size={15} />
              You’ll review and pay securely on Stripe.
            </p>
            <p className={c('gc-terms')}>
              By continuing, you agree to our{' '}
              <a href={TERMS_ITEM.href} target="_blank" rel="noopener">
                Terms of Sale
                <span className="visuallyHidden"> (opens in a new tab)</span>
              </a>{' '}
              and{' '}
              <a href={PRIVACY_ITEM.href} target="_blank" rel="noopener">
                Privacy Policy
                <span className="visuallyHidden"> (opens in a new tab)</span>
              </a>
              .
            </p>
          </>
        )}
        {notice ? (
          <p className={c('gc-said')} role="status">
            {notice}
          </p>
        ) : null}
        {conflict ? (
          <button
            className={c('gc-empty-link')}
            onClick={() => window.location.reload()}
          >
            Reload saved gift
          </button>
        ) : null}
      </div>
    </div>
  );
  return (
    <PaymentChrome inFlight={false} faqs={FAQS}>
      <div className={c('gc-page')}>
        <div className={c('gc-grid')}>
          <div className={c('gc-left')}>
            <div className={c('gc-head')}>
              <h1 className={c('gc-h1')}>Checkout</h1>
              <p className={c('gc-lede')}>
                Almost there, let’s complete your gift card purchase.
              </p>
              <p className={c('gc-secure')}>
                <ShieldIcon />
                Payment is completed securely on the next page.
              </p>
            </div>
            <section className={c('gc-sec')}>
              <div className={c('gc-sec-top')}>
                <span className={c('gc-num')}>1</span>
                <h2 className={c('gc-sec-h')}>Your details</h2>
              </div>
              <p className={c('gc-sec-p')}>
                We’ll send your order confirmation and gift card delivery
                details to this email.
              </p>
              {signedIn ? (
                <p className={c('gc-signed')}>✓ You’re signed in.</p>
              ) : (
                <>
                  <div className={c('gc-login')}>
                    <button
                      className={c('gc-login-row')}
                      aria-expanded={loginOpen}
                      aria-controls="gift-login"
                      onClick={() => setLoginOpen(!loginOpen)}
                    >
                      <span>
                        <span style={{ display: 'block' }}>
                          Already have an account?
                        </span>
                        <span className={c('gc-login-t')}>
                          <span>Log in for faster checkout</span>
                        </span>
                      </span>
                      <svg
                        className={c(
                          'gc-login-chev',
                          loginOpen ? 'gc-login-chev-open' : '',
                        )}
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <path d="m6 9.5 6 6 6-6" />
                      </svg>
                    </button>
                    <div
                      id="gift-login"
                      hidden={!loginOpen}
                      className={c(
                        'gc-login-panel',
                        loginOpen ? 'is-open' : '',
                      )}
                    >
                      <form action={loginForm}>
                        <input
                          type="hidden"
                          name="next"
                          value="/gift-card/checkout"
                        />
                        <h3 className={c('gc-login-h')}>
                          Log in to your account
                        </h3>
                        <label
                          className={c('gc-lab')}
                          htmlFor="gift-login-email"
                        >
                          Email address
                        </label>
                        <input
                          className={c('gc-in')}
                          id="gift-login-email"
                          name="email"
                          type="email"
                          autoComplete="username"
                          required
                        />
                        <label
                          className={c('gc-lab')}
                          htmlFor="gift-login-password"
                        >
                          Password
                        </label>
                        <span className={c('gc-pw-wrap')}>
                          <input
                            className={c('gc-in')}
                            id="gift-login-password"
                            name="password"
                            type={reveal ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                          />
                          <button
                            className={c('gc-pw-btn')}
                            type="button"
                            aria-pressed={reveal}
                            onClick={() => setReveal(!reveal)}
                          >
                            {reveal ? 'Hide' : 'Show'}
                          </button>
                        </span>
                        <p role="status" className={c('gc-err')}>
                          {loginState.message ??
                            Object.values(loginState.fieldErrors ?? {}).join(
                              ' ',
                            )}
                        </p>
                        <div className={c('gc-login-actions')}>
                          <button
                            className={c('gc-cta', 'gc-cta-sm')}
                            disabled={loginPending}
                          >
                            Log in
                          </button>
                          <a
                            className={c('gc-forgot')}
                            href={FORGOT_PASSWORD_HREF}
                          >
                            Forgot your password?
                          </a>
                        </div>
                      </form>
                    </div>
                  </div>
                </>
              )}
              {field('email', 'Email', {
                type: 'email',
                autoComplete: 'email',
                placeholder: 'For order confirmations and updates',
                maxLength: 254,
              })}
              {!signedIn ? (
                <label className={c('accountChoice')}>
                  <input
                    type="checkbox"
                    disabled={busy || conflict}
                    checked={draft.createAccount}
                    onChange={(event) =>
                      update({ createAccount: event.target.checked })
                    }
                  />
                  Create an account after payment and earn points on this gift.
                </label>
              ) : null}
              <p className={c('gc-sec-p')}>
                {signedIn || draft.createAccount
                  ? `Earn ${draft.value * draft.quantity * 2} points on the gift-card value when payment is confirmed. Postage and greeting-card fees don’t earn points.`
                  : 'Earn 2 points per £1 when you create an account after payment.'}
              </p>
            </section>
            <section className={c('gc-sec')}>
              <div className={c('gc-sec-top')}>
                <span className={c('gc-num')}>2</span>
                <h2 className={c('gc-sec-h')}>Send to</h2>
              </div>
              <p className={c('gc-sec-p')}>
                {draft.route === 'post'
                  ? 'We’ll print the gift card and post it to this address.'
                  : 'Choose who you’d like to send the gift card to.'}
              </p>
              <div className={c('gc-two')}>
                {field('firstName', 'Recipient first name', { maxLength: 100 })}
                {field('lastName', 'Recipient last name', { maxLength: 100 })}
              </div>
              {draft.route === 'post' ? (
                <>
                  <p className={c('gc-sec-p')}>
                    Enter the delivery address manually.
                  </p>
                  {field('line1', 'Address line 1', {
                    autoComplete: 'shipping address-line1',
                  })}
                  {field('line2', 'Address line 2 (optional)', {
                    autoComplete: 'shipping address-line2',
                  })}
                  <div className={c('gc-two')}>
                    {field('city', 'Town / city', {
                      autoComplete: 'shipping address-level2',
                      maxLength: 100,
                    })}
                    {field('region', 'County (optional)', {
                      autoComplete: 'shipping address-level1',
                      maxLength: 100,
                    })}
                  </div>
                  {field('postcode', 'Postcode', {
                    autoComplete: 'shipping postal-code',
                    maxLength: 16,
                  })}
                  {field('phone', 'Recipient phone', {
                    type: 'tel',
                    autoComplete: 'shipping tel',
                    maxLength: 32,
                  })}
                  <p className={c('gc-sec-p')}>
                    For the courier, in case they need to contact the recipient
                    about delivery.
                  </p>
                  <label className={c('accountChoice')}>
                    <input
                      type="checkbox"
                      disabled={busy || conflict}
                      checked={draft.includeGreetingCard}
                      onChange={(event) =>
                        update({ includeGreetingCard: event.target.checked })
                      }
                    />
                    Add greeting card (+
                    {giftMoney(options.greetingCardPrice * 100)})
                  </label>
                </>
              ) : (
                field('recipientEmail', 'Recipient email', {
                  type: 'email',
                  placeholder: 'We’ll send the gift card to this email',
                  maxLength: 254,
                })
              )}
              {draft.route === 'email' || draft.includeGreetingCard ? (
                <div className={c('gc-field')}>
                  <label className={c('gc-lab')} htmlFor="gift-message">
                    Add a personal message (optional)
                  </label>
                  <textarea
                    id="gift-message"
                    className={c('gc-in', 'gc-ta')}
                    placeholder="Write your message here…"
                    maxLength={240}
                    rows={4}
                    disabled={busy || conflict}
                    value={draft.message}
                    onChange={(event) =>
                      update({ message: event.target.value })
                    }
                  />
                  <span className={c('gc-hint')}>
                    <span className={c('gc-hint-p')}>
                      {draft.route === 'email'
                        ? 'Your message will be included in the gift card email.'
                        : 'Printed inside an Abby’s Table greeting card and posted with the gift card.'}
                    </span>
                    <span className={c('gc-count')}>
                      {draft.message.length}/240
                    </span>
                  </span>
                </div>
              ) : null}
            </section>
            <section className={c('gc-sec')}>
              <div className={c('gc-sec-top')}>
                <span className={c('gc-num')}>3</span>
                <h2 className={c('gc-sec-h')}>
                  {draft.route === 'post'
                    ? 'Choose a posting date'
                    : 'Choose a delivery date'}
                </h2>
              </div>
              <p className={c('gc-sec-p')}>
                {draft.route === 'post'
                  ? 'We’ll post the gift card on your chosen date. Royal Mail usually takes 2–3 working days.'
                  : 'We’ll send the gift card on your chosen date.'}
              </p>
              {draft.route === 'email' ? (
                <div
                  className={c('gc-opts')}
                  role="radiogroup"
                  aria-label="When to send"
                  onKeyDown={(event) => {
                    if (busy || conflict) return;
                    if (
                      [
                        'ArrowLeft',
                        'ArrowRight',
                        'ArrowUp',
                        'ArrowDown',
                        'Home',
                        'End',
                      ].includes(event.key)
                    ) {
                      event.preventDefault();
                      const next =
                        event.key === 'Home'
                          ? 'today'
                          : event.key === 'End'
                            ? 'pick'
                            : when === 'today'
                              ? 'pick'
                              : 'today';
                      setWhen(next);
                      update({ date: next === 'today' ? today : '' });
                      event.currentTarget
                        .querySelector<HTMLButtonElement>(
                          `[data-when="${next}"]`,
                        )
                        ?.focus();
                    }
                  }}
                >
                  {[
                    ['today', 'Send today', 'As soon as payment is complete.'],
                    ['pick', 'Choose a date', 'Pick a future delivery date.'],
                  ].map(([id, label, helper]) => (
                    <button
                      key={id}
                      className={c('gc-opt')}
                      data-when={id}
                      role="radio"
                      disabled={busy || conflict}
                      aria-checked={when === id}
                      tabIndex={when === id ? 0 : -1}
                      onClick={() => {
                        setWhen(id);
                        update({ date: id === 'today' ? today : '' });
                      }}
                    >
                      <span className={c('gc-opt-top')}>
                        <span className={c('gc-dot')} />
                        <span className={c('gc-opt-t')}>{label}</span>
                      </span>
                      <span className={c('gc-opt-s')}>{helper}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {draft.route === 'post' || when === 'pick' ? (
                <div className={c('gc-field', 'dateWrap')}>
                  <label className={c('gc-lab')} htmlFor="gift-date">
                    {draft.route === 'post' ? 'Posting date' : 'Delivery date'}
                  </label>
                  <button
                    id="gift-date"
                    ref={dateOpener}
                    className={c('gc-dtbtn')}
                    aria-haspopup="dialog"
                    aria-expanded={calendar}
                    aria-describedby={
                      errors.date ? 'gift-date-error' : undefined
                    }
                    disabled={busy || conflict}
                    onClick={() => setCalendar(true)}
                  >
                    {draft.date
                      ? new Date(`${draft.date}T12:00:00Z`).toLocaleDateString(
                          'en-GB',
                          { dateStyle: 'long' },
                        )
                      : 'dd/mm/yyyy'}
                    <CalendarIcon />
                  </button>
                  {calendar ? (
                    <GiftCalendar
                      value={draft.date}
                      today={today}
                      route={draft.route}
                      options={options}
                      opener={dateOpener}
                      onClose={() => setCalendar(false)}
                      onPick={(date) => {
                        update({ date });
                        setCalendar(false);
                      }}
                    />
                  ) : null}
                  {errors.date ? (
                    <p id="gift-date-error" className={c('gc-err')}>
                      {errors.date}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {!options.enabled ? (
                <p className={c('gc-sec-p')}>
                  Gift-card purchasing is not open yet. Your gift can be
                  prepared, but payment is unavailable.
                </p>
              ) : options.emailSendTime && draft.route === 'email' ? (
                <p className={c('gc-sec-p')}>
                  Scheduled emails are sent at{' '}
                  {options.emailSendTime.slice(0, 5)} ({options.timezone}).
                </p>
              ) : null}
              {options.validForDays ? (
                <p className={c('gc-sec-p')}>
                  Gift cards are valid for {options.validForDays} days from
                  issue.
                </p>
              ) : options.enabled && options.neverExpires ? (
                <p className={c('gc-sec-p')}>Gift cards do not expire.</p>
              ) : null}
            </section>
          </div>
          <aside
            className={c('gc-summary')}
            ref={summary}
            aria-label="Your gift order"
          >
            {sheet ? null : summaryContent}
          </aside>
        </div>
      </div>
      <div
        className={c(
          'gc-bar',
          !barVisible || draft.removed || sheet ? 'gc-bar-off' : '',
        )}
      >
        <button
          className={c('gc-bar-t')}
          disabled={draft.removed}
          aria-haspopup="dialog"
          aria-expanded={sheet}
          onClick={() => setSheet(true)}
        >
          <span className={c('gc-bar-ico')} aria-hidden="true">
            <GiftIcon size={26} />
          </span>
          <span className={c('gc-bar-l')}>
            <span className={c('gc-bar-k')}>Your order</span>
            <span className={c('gc-bar-s')}>
              {draft.quantity} × {giftMoney(draft.value * 100)} gift card
              {draft.quantity > 1 ? 's' : ''}
            </span>
          </span>
          <span className={c('gc-bar-r')}>
            <span className={c('gc-bar-v')}>{giftMoney(total)}</span>
            <span className={c('gc-bar-view')}>
              View{' '}
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 14.5 6-6 6 6" />
              </svg>
            </span>
          </span>
        </button>
      </div>
      {sheet ? (
        <GiftDialog
          title="Your order"
          order
          headerAction={
            <a
              className={c('gc-edit', 'gc-sheet-edit')}
              href="/gifting?edit=1#gift-card"
              onClick={(event) => void leave(event)}
            >
              Edit
            </a>
          }
          onClose={() => {
            setSheet(false);
            setSheetHost(null);
          }}
        >
          <div className={c('sheetHost')} ref={setSheetHost} />
        </GiftDialog>
      ) : null}
      {sheet && sheetHost
        ? createPortal(
            <>
              {summaryContent}
              {undoContent}
            </>,
            sheetHost,
          )
        : null}
      {!sheet ? undoContent : null}
    </PaymentChrome>
  );
}
