'use client';
import {
  useEffect,
  useState,
  useRef,
  type MouseEvent,
  type KeyboardEvent,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/lib/cart/CartProvider';
import {
  EMPTY_GIFT,
  giftMoney,
  giftTotal,
  type GiftDraft,
  type GiftOptions,
  type GiftRoute,
} from '@/lib/gifting/model';
import type { GiftSession } from '@/lib/gifting/server';
import { GiftDialog } from './GiftDialog';
import Image from 'next/image';
import { GiftIcon } from './GiftIcons';
import { giftResponse } from '@/lib/gifting/response';
import styles from './Gifting.module.css';
const c = (...names: string[]) =>
  names
    .map((name) => styles[name])
    .filter(Boolean)
    .join(' ');
export function GiftArt({
  value,
  small = false,
}: {
  value: number;
  small?: boolean;
}) {
  return (
    <div className={c(small ? 'gf-preview' : 'gf-mock')} aria-hidden="true">
      <span className={c('gf-mock-brand')}>Abby’s Table</span>
      <span className={c('gf-mock-row')}>
        <span className={c('gf-mock-line')}>
          A gift for
          <br />
          your table.
        </span>
        <span className={c('gf-mock-val')}>{giftMoney(value * 100)}</span>
      </span>
    </div>
  );
}
export function Gifting({
  options,
  resume,
}: {
  options: GiftOptions;
  resume: GiftSession | null;
}) {
  const cart = useCart();
  const router = useRouter();
  const search = useSearchParams();
  const [draft, setDraft] = useState<GiftDraft>(
    search.get('edit') === 'box' && cart.giftCard
      ? cart.giftCard
      : search.has('edit') && resume
        ? resume.draft
        : {
            ...EMPTY_GIFT,
            ...(search.get('edit') === 'box' ? { route: 'box' as const } : {}),
          },
  );
  const [custom, setCustom] = useState(
    search.has('edit') && resume && !options.values.includes(resume.draft.value)
      ? String(resume.draft.value)
      : '',
  );
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmBox, setConfirmBox] = useState(false);
  const [reminder, setReminder] = useState(
    Boolean(resume && !resume.draft.removed && !resume.draft.dismissed),
  );
  const [progress, setProgress] = useState(0);
  const routeButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const editedBox = useRef(false);
  useEffect(() => {
    if (search.get('edit') !== 'box' || !cart.hydrated || editedBox.current)
      return;
    editedBox.current = true;
    if (cart.giftCard) {
      setDraft(cart.giftCard);
      setCustom(
        options.values.includes(cart.giftCard.value)
          ? ''
          : String(cart.giftCard.value),
      );
    }
  }, [search, cart.hydrated, cart.giftCard, options.values]);
  const change = (patch: Partial<GiftDraft>) => {
    if (busy) return;
    setDraft((current) => ({ ...current, ...patch }));
    setSaid('');
  };
  const routes: { id: GiftRoute; title: string; body: string; sub: string }[] =
    [
      {
        id: 'email',
        title: 'Email',
        body: 'Sent directly to their inbox.',
        sub: 'No delivery charge.',
      },
      {
        id: 'post',
        title: 'By post',
        body: 'Posted directly to their address.',
        sub: `Delivery +${giftMoney(options.postage * 100)}.`,
      },
      {
        id: 'box',
        title: 'In a food box',
        body: cart.shopping.active
          ? 'We’ll add this gift card to the food box you’re already building.'
          : 'We’ll save your gift card while you build a food box.',
        sub: 'No extra delivery charge.',
      },
    ];
  const radioKeys = (event: KeyboardEvent) => {
    if (busy) return;
    let index = routes.findIndex((route) => route.id === draft.route);
    if (['ArrowRight', 'ArrowDown'].includes(event.key))
      index = (index + 1) % 3;
    else if (['ArrowLeft', 'ArrowUp'].includes(event.key))
      index = (index + 2) % 3;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = 2;
    else return;
    event.preventDefault();
    change({ route: routes[index].id });
    routeButtons.current[index]?.focus();
  };
  const giftHref = `/gift-card/checkout?route=${draft.route}&value=${draft.value}`;
  const build = async (event?: MouseEvent<HTMLAnchorElement>) => {
    if (
      event &&
      (event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0)
    )
      return;
    event?.preventDefault();
    if (busy) return;
    if (cart.shopping.active && !cart.gift?.giftIntent) {
      setConfirmBox(true);
      return;
    }
    setBusy(true);
    try {
      if (!cart.gift?.giftIntent) await cart.setGiftIntent(true);
      router.push(cart.shopping.active ? cart.shopping.resumeHref : '/box');
    } catch (error) {
      setSaid(
        error instanceof Error
          ? error.message
          : 'Your box could not be updated.',
      );
    } finally {
      setBusy(false);
    }
  };
  const go = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    if (busy || draft.value < 1) return;
    setBusy(true);
    setSaid('');
    try {
      const response = await fetch('/api/gift-card/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      });
      await giftResponse(response);
      window.location.assign('/gift-card/checkout');
    } catch (error) {
      setSaid(
        error instanceof Error
          ? error.message
          : 'Your gift could not be saved.',
      );
    } finally {
      setBusy(false);
    }
  };
  const addToBox = async () => {
    setBusy(true);
    setSaid('');
    try {
      await cart.setBoxGiftCard(draft);
      setSaid('Your gift card has been added to your food box.');
    } catch (error) {
      setSaid(
        error instanceof Error
          ? error.message
          : 'Your gift card could not be added.',
      );
    } finally {
      setBusy(false);
    }
  };
  const dismiss = async () => {
    if (!resume) return;
    const response = await fetch('/api/gift-card/draft', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Cart-Version': resume.version,
      },
      body: JSON.stringify({ draft: { ...resume.draft, dismissed: true } }),
    });
    if (response.ok) setReminder(false);
    else
      setSaid(
        'The reminder could not be dismissed. Please reload and try again.',
      );
  };
  return (
    <>
      {reminder && resume ? (
        <div className={c('gf-resume-wrap')}>
          <section className={c('gf-resume')} aria-labelledby="gift-resume">
            <span className={c('gf-resume-ic')} aria-hidden="true">
              <GiftIcon size={24} />
            </span>
            <div className={c('gf-resume-txt')}>
              <h2 id="gift-resume" className={c('gf-resume-h')}>
                You have an unfinished gift
              </h2>
              <p className={c('gf-resume-p')}>
                {giftMoney(resume.draft.value * 100)} gift card ·{' '}
                {resume.draft.route === 'email' ? 'By email' : 'By post'}
              </p>
            </div>
            <div className={c('gf-resume-act')}>
              <a className={c('gf-resume-cta')} href="/gift-card/checkout">
                Continue your gift
              </a>
              <a
                className={c('gf-resume-edit')}
                href="/gifting?edit=1#gift-card"
              >
                <span>Edit gift details ↓</span>
              </a>
            </div>
            <button
              className={c('gf-resume-x')}
              onClick={() => void dismiss()}
              aria-label="Dismiss unfinished gift reminder"
            >
              ×
            </button>
          </section>
        </div>
      ) : null}
      <section className={c('gf-sec', 'gf-hero')} id="top">
        <div className={c('inner')}>
          <h1 className={c('title')}>Give an Abby’s Table gift</h1>
          <p className={c('gf-lede')}>
            Choose their dishes and send a food box, or send a gift card and let
            them choose.
          </p>
        </div>
        <div
          className={c('gf-routes')}
          onScroll={(event) => {
            const element = event.currentTarget;
            setProgress(
              element.scrollLeft /
                Math.max(1, element.scrollWidth - element.clientWidth),
            );
          }}
        >
          <article className={c('gf-route')}>
            <div className={c('gf-route-media')}>
              <Image
                width={1536}
                height={1024}
                src="/assets/gifting-box.jpg"
                alt="An Abby’s Table box packed with chilled dishes"
              />
            </div>
            <div className={c('gf-route-body')}>
              <h2 className={c('gf-route-h')}>
                Send a food box — you choose their dishes
              </h2>
              <p className={c('gf-route-p')}>
                Build a box from the menu, add a personalised greeting card if
                you like, and send it straight to their door.
              </p>
              <div className={c('gf-route-ctas')}>
                <a className={c('gf-cta')} href="/box?gift=1" onClick={build}>
                  {cart.gift?.giftIntent
                    ? 'Continue your gift box'
                    : 'Build their box'}
                </a>
                <a className={c('gf-link')} href="#food-box">
                  <span>How it works →</span>
                </a>
              </div>
            </div>
          </article>
          <article className={c('gf-route', 'gf-route-dark')}>
            <div className={c('gf-route-media')}>
              <GiftArt value={draft.value} />
            </div>
            <div className={c('gf-route-body')}>
              <h2 className={c('gf-route-h')}>
                Send a gift card — they choose their dishes
              </h2>
              <p className={c('gf-route-p')}>
                Choose a value and send it by email, by post, or inside a food
                box. They can use it towards any Abby’s Table order.
              </p>
              <div className={c('gf-route-ctas')}>
                <a className={c('gf-cta', 'gf-cta-light')} href="#gift-card">
                  Order a gift card
                </a>
                <a className={c('gf-link')} href="#gift-card">
                  <span>See the options →</span>
                </a>
              </div>
            </div>
          </article>
        </div>
        <div className={c('gf-rail')} aria-hidden="true">
          <span style={{ transform: `translateX(${progress * 100}%)` }} />
        </div>
      </section>
      <section className={c('gf-sec', 'gf-step-sec')} id="food-box">
        <div className={c('inner')}>
          <h2 className={c('gf-h2')}>Send a food box</h2>
          <p className={c('gf-lede')}>
            Add a personalised greeting card if you like, and we’ll send
            everything straight to their door.
          </p>
          <div className={c('gf-split')}>
            <div className={c('gf-media')}>
              <Image
                width={1536}
                height={1024}
                src="/assets/gifting-box.jpg"
                alt="A packed Abby’s Table box, insulated and ready for the fridge"
                loading="lazy"
              />
            </div>
            <div className={c('gf-panel')}>
              <h3 className={c('gf-panel-h')}>A food box, made personal.</h3>
              <ol className={c('gf-steps')}>
                {[
                  [
                    'Build their box',
                    'Choose six or more dishes from the menu, just as you would for any Abby’s Table order.',
                  ],
                  [
                    'Make it a gift',
                    'At checkout, choose “Is this box a gift?”. You can hide prices and add a personalised greeting card with your message for £3.',
                  ],
                  [
                    'Send it to them',
                    'Enter their delivery address, choose an available delivery date, and we’ll send it straight to their door.',
                  ],
                ].map(([title, body], i) => (
                  <li className={c('gf-step')} key={title}>
                    <span className={c('gf-step-n')} aria-hidden="true">
                      {i + 1}
                    </span>
                    <h4>{title}</h4>
                    <p>{body}</p>
                  </li>
                ))}
              </ol>
              <a
                className={c('gf-cta', 'gf-cta-light')}
                href="/box?gift=1"
                onClick={build}
              >
                {cart.gift?.giftIntent
                  ? 'Continue your gift box'
                  : 'Build their box'}
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className={c('gf-sec', 'gf-dark', 'gf-step-sec')} id="gift-card">
        <div className={c('inner')}>
          <h2 className={c('gf-h2')}>Send a gift card</h2>
          <p className={c('gf-lede')}>
            Choose the credit to add, how it arrives, and the message that makes
            it theirs.
          </p>
          <div className={c('gf-order')}>
            <div className={c('gf-order-head')}>
              <GiftArt value={draft.value} small />
              <div>
                <h3 className={c('gf-order-h')}>Make it theirs.</h3>
                <p className={c('gf-order-p')}>
                  Usable towards any Abby’s Table order.
                </p>
              </div>
            </div>
            <div className={c('gf-cols')}>
              <div className={c('gf-col')}>
                <div className={c('gf-col-head')}>
                  <span className={c('gf-col-n')}>1</span>
                  <span className={c('gf-col-t')} id="gift-value">
                    Choose a value
                  </span>
                </div>
                <div
                  className={c('gf-values')}
                  role="group"
                  aria-labelledby="gift-value"
                >
                  {options.values.map((value) => (
                    <button
                      key={value}
                      className={c('gf-chip')}
                      disabled={busy}
                      aria-pressed={!custom && draft.value === value}
                      onClick={() => {
                        setCustom('');
                        change({ value });
                      }}
                    >
                      {giftMoney(value * 100)}
                    </button>
                  ))}
                </div>
                <div className={c('gf-custom')}>
                  <span aria-hidden="true">£</span>
                  <input
                    aria-label="Custom gift card amount in pounds"
                    disabled={busy}
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="Custom amount"
                    value={custom}
                    onChange={(event) => {
                      const value = event.target.value
                        .replace(/\D/g, '')
                        .slice(0, 3);
                      setCustom(value);
                      change({ value: Number(value) });
                    }}
                  />
                </div>
              </div>
              <div className={c('gf-col')}>
                <div className={c('gf-col-head')}>
                  <span className={c('gf-col-n')}>2</span>
                  <span className={c('gf-col-t')} id="gift-arrival">
                    How it arrives
                  </span>
                </div>
                <div
                  className={c('gf-opts')}
                  role="radiogroup"
                  aria-labelledby="gift-arrival"
                  onKeyDown={radioKeys}
                >
                  {routes.map((route, index) => (
                    <button
                      key={route.id}
                      ref={(element) => {
                        routeButtons.current[index] = element;
                      }}
                      className={c('gf-opt')}
                      role="radio"
                      disabled={busy}
                      aria-checked={draft.route === route.id}
                      tabIndex={draft.route === route.id ? 0 : -1}
                      onClick={() => change({ route: route.id })}
                    >
                      <span className={c('gf-opt-top')}>
                        <span className={c('gf-dot')} />
                        <span className={c('gf-opt-t')}>{route.title}</span>
                        {route.id === 'email' ? (
                          <span className={c('gf-fast')}>Fastest</span>
                        ) : null}
                      </span>
                      <span className={c('gf-opt-b')}>{route.body}</span>
                      <span className={c('gf-opt-sub')}>{route.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className={c('gf-col')}>
                <div className={c('gf-col-head')}>
                  <span className={c('gf-col-n')}>3</span>
                  <span className={c('gf-col-t')}>
                    {draft.route === 'email'
                      ? 'Personal message (optional)'
                      : 'Greeting card + message'}
                  </span>
                  {draft.route !== 'email' ? (
                    <span className={c('gf-col-mark')}>
                      +{giftMoney(options.greetingCardPrice * 100)}
                    </span>
                  ) : null}
                </div>
                <p className={c('gf-msg-lead')} id="gift-message-help">
                  {draft.route === 'email'
                    ? 'Your message will be included in the gift email.'
                    : `Add an Abby’s Table greeting card with your personal message printed inside. We’ll ${draft.route === 'post' ? 'send it with their gift card to their address.' : 'include it with their gift card in your food box.'}`}
                </p>
                {draft.route !== 'email' ? (
                  <button
                    className={c('gf-check')}
                    role="checkbox"
                    disabled={busy}
                    aria-checked={draft.includeGreetingCard}
                    onClick={() =>
                      change({
                        includeGreetingCard: !draft.includeGreetingCard,
                      })
                    }
                  >
                    <span className={c('gf-box')}>✓</span>
                    <span className={c('gf-check-t')}>Add greeting card</span>
                    <span className={c('gf-check-p')}>
                      +{giftMoney(options.greetingCardPrice * 100)}
                    </span>
                  </button>
                ) : null}
                {draft.route === 'email' || draft.includeGreetingCard ? (
                  <>
                    <div className={c('gf-msg-meta')}>
                      <span className={c('gf-msg-count')}>
                        {draft.message.length}/240
                      </span>
                    </div>
                    <textarea
                      className={c('gf-msg')}
                      aria-label="Your personal message"
                      aria-describedby="gift-message-help"
                      placeholder="Write something they’ll want to keep"
                      disabled={busy}
                      rows={5}
                      maxLength={240}
                      value={draft.message}
                      onChange={(event) =>
                        change({ message: event.target.value })
                      }
                    />
                  </>
                ) : null}
              </div>
            </div>
            <div className={c('gf-sum')}>
              <div className={c('gf-sum-rows')}>
                {[
                  [
                    draft.quantity > 1
                      ? `Gift cards × ${draft.quantity}`
                      : 'Gift card',
                    giftMoney(draft.value * draft.quantity * 100),
                  ],
                  [
                    draft.route === 'email' ? 'Message' : 'Greeting card',
                    draft.route === 'email'
                      ? draft.message
                        ? 'Added'
                        : 'Not added'
                      : draft.includeGreetingCard
                        ? `+${giftMoney(options.greetingCardPrice * 100)}`
                        : 'Not added',
                  ],
                  [
                    'Delivery',
                    draft.route === 'email'
                      ? 'By email'
                      : draft.route === 'post'
                        ? `By post +${giftMoney(options.postage * 100)}`
                        : 'In a food box',
                  ],
                  ['Total', giftMoney(giftTotal(draft, options))],
                ].map(([label, value]) => (
                  <span
                    key={label}
                    className={c(
                      label === 'Total' ? 'gf-sum-tot' : 'gf-sum-row',
                    )}
                  >
                    <span className={c('gf-sum-l')}>{label}</span>
                    <span className={c('gf-sum-v')}>{value}</span>
                  </span>
                ))}
              </div>
              <p className={c('gf-sum-note')}>
                {draft.route === 'box'
                  ? 'Delivered inside your food box to the same delivery address.'
                  : 'You’ll add their details and choose when it arrives at checkout.'}
              </p>
              {draft.route === 'box' ? (
                cart.shopping.active ? (
                  <button
                    className={c('gf-cta')}
                    disabled={busy || draft.value < 1}
                    onClick={() => void addToBox()}
                  >
                    Add to food box
                  </button>
                ) : (
                  <a
                    className={c('gf-cta')}
                    href="/box"
                    onClick={async (event) => {
                      event.preventDefault();
                      try {
                        await cart.setBoxGiftCard(draft);
                        router.push('/box');
                      } catch (error) {
                        setSaid(
                          error instanceof Error
                            ? error.message
                            : 'Your gift could not be saved.',
                        );
                      }
                    }}
                  >
                    Build your box
                  </a>
                )
              ) : (
                <a
                  className={c('gf-cta')}
                  href={giftHref}
                  onClick={go}
                  aria-disabled={busy || draft.value < 1}
                >
                  Buy gift card
                </a>
              )}
              <p className={c('gf-said')} role="status">
                {said}
                {said.includes('payment is already in progress') ? (
                  <a href="/gift-card/payment">Check your gift payment</a>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      </section>
      <a className={c('gf-top')} href="#top">
        ↑ Top
      </a>
      {confirmBox ? (
        <GiftDialog
          title="You already have a box in progress."
          onClose={() => setConfirmBox(false)}
        >
          <button
            className={c('gf-cta')}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                if (!cart.gift?.giftIntent) await cart.setGiftIntent(true);
                setConfirmBox(false);
                router.push(cart.shopping.resumeHref);
              } catch (error) {
                setSaid(
                  error instanceof Error
                    ? error.message
                    : 'Your box could not be updated.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Use my current box as a gift
          </button>
          <button className={c('gf-link')} onClick={() => setConfirmBox(false)}>
            Keep my current box
          </button>
        </GiftDialog>
      ) : null}
    </>
  );
}
