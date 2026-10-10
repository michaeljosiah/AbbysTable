/** SERVER ONLY. Standalone gift carts never overwrite the food-box cookie. */
import { AonikError } from '@/lib/aonik/errors';
import { cookies } from 'next/headers';
import { aonikFetch, type AonikFetchOptions } from '@/lib/aonik/http';
import {
  resolveDataMode,
  liveOrderingEnabled,
  readAonikConfig,
} from '@/lib/aonik/dataMode';
import { currentSession } from '@/lib/auth/server';
import { isExpired, readSession } from '@/lib/auth/session';
import { returnUrls } from '@/lib/checkout/payment';
import type {
  CheckoutResultDto,
  CartPaymentStateDto,
  StorefrontOrderDetailDto,
} from '@/lib/aonik/dto';
import {
  DESIGN_GIFT_OPTIONS,
  EMPTY_GIFT,
  giftTotal,
  londonToday,
  validateGift,
  type GiftDraft,
  type GiftOptions,
} from './model';

const CART = 'abbys-table-gift-cart';
const DEMO = 'abbys-table-gift-demo';
const PREPARED = 'abbys-table-gift-prepared';
const PAYMENT = 'abbys-table-gift-payment';
type Proof = { cartId: string; cartToken?: string };
type DraftResponse = {
  cartVersion: string;
  draft: { giftCardDraft?: GiftDraft; [key: string]: unknown } | null;
  status: string;
  orderId?: string | null;
};
export interface GiftSession {
  draft: GiftDraft;
  version: string;
  mode: 'live' | 'demo';
  totalPence: number | null;
}
async function cookie<T>(name: string): Promise<T | null> {
  try {
    return JSON.parse((await cookies()).get(name)?.value ?? 'null') as T | null;
  } catch {
    return null;
  }
}
async function store(name: string, value: unknown) {
  (await cookies()).set(name, JSON.stringify(value), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 86400 * 7,
  });
}
async function api<T>(
  path: string,
  options: Omit<AonikFetchOptions, 'baseUrl' | 'tenantId' | 'policy'> = {},
): Promise<T> {
  const config = readAonikConfig();
  if (!config) throw new Error('Gift-card checkout is unavailable.');
  return aonikFetch<T>(path, { ...config, policy: 'volatile', ...options });
}
async function call<T>(
  suffix: string,
  options: Omit<AonikFetchOptions, 'baseUrl' | 'tenantId' | 'policy'> = {},
  mutation = false,
): Promise<T> {
  const proof = await cookie<Proof>(CART);
  if (!proof?.cartId) throw new Error('Please start your gift from Gifting.');
  const stored = await readSession();
  const session = mutation
    ? await currentSession()
    : stored && !isExpired(stored)
      ? stored
      : null;
  return api<T>(`/commerce/carts/${proof.cartId}${suffix}`, {
    cartToken: proof.cartToken,
    accessToken: session?.accessToken,
    ...options,
  });
}
export async function giftOptions(): Promise<GiftOptions> {
  if ((await resolveDataMode()).mode === 'demo') return DESIGN_GIFT_OPTIONS;
  const live = await api<GiftOptions>(
    '/commerce/storefront/gift-cards/options',
  );
  return {
    ...DESIGN_GIFT_OPTIONS,
    ...live,
    maximumQuantity: live.maximumQuantity ?? 1,
    draftVersion: live.draftVersion ?? 0,
    values: live.values?.length ? live.values : DESIGN_GIFT_OPTIONS.values,
  };
}
export async function readGift(): Promise<GiftSession | null> {
  const { mode } = await resolveDataMode();
  if (mode === 'demo') return cookie<GiftSession>(DEMO);
  if (!(await cookie<Proof>(CART))) return null;
  const response = await call<DraftResponse>('/checkout-draft');
  {
    const payment = await call<CartPaymentStateDto>('/payment');
    if (
      payment.paymentIntentId &&
      !payment.canEdit &&
      payment.status !== 'succeeded'
    )
      throw new Error(
        'A payment is already in progress. Check your gift payment before starting again.',
      );
    if (payment.status === 'succeeded') return null;
  }
  const storedDraft = response.draft?.giftCardDraft;
  const draft = storedDraft
    ? (Object.fromEntries(
        Object.entries(EMPTY_GIFT).map(([key, fallback]) => [
          key,
          storedDraft[key as keyof GiftDraft] ?? fallback,
        ]),
      ) as unknown as GiftDraft)
    : null;
  if (!draft || response.status !== 'Open') return null;
  return { draft, version: response.cartVersion, mode, totalPence: null };
}
export async function startGift(
  entry: Partial<GiftDraft>,
  reset = false,
): Promise<GiftSession> {
  const current = await readGift();
  if (current && !reset) return current;
  const draft = {
    ...EMPTY_GIFT,
    ...current?.draft,
    ...entry,
    removed: false,
    dismissed: false,
  };
  if (draft.route === 'box')
    throw new Error('This gift belongs in your food box.');
  if ((await resolveDataMode()).mode === 'demo') {
    const result: GiftSession = {
      draft,
      version: crypto.randomUUID(),
      mode: 'demo',
      totalPence: giftTotal(draft, DESIGN_GIFT_OPTIONS),
    };
    await store(DEMO, result);
    return result;
  }
  const options = await giftOptions();
  if (options.draftVersion < 1)
    throw new Error(
      'Gift checkout is awaiting its backend update. Please try again later.',
    );
  if (!current) {
    const session = await currentSession();
    const created = await api<{
      id: string;
      anonymousToken?: string;
      cartVersion: string;
    }>('/commerce/carts', {
      method: 'POST',
      body: { currency: 'GBP' },
      accessToken: session?.accessToken,
    });
    if (!created.id || (!created.anonymousToken && !session))
      throw new Error('Your gift session could not be created.');
    await store(CART, {
      cartId: created.id,
      cartToken: created.anonymousToken,
    });
    return saveGift(draft, created.cartVersion);
  }
  return saveGift(draft, current.version);
}
export async function saveGift(
  draft: GiftDraft,
  version: string,
): Promise<GiftSession> {
  if ((await resolveDataMode()).mode === 'demo') {
    const current = await readGift();
    if (current && current.version !== version)
      throw new AonikError({
        status: 409,
        path: '/gift-draft',
        code: 'commerce.cart_conflict',
        message: 'Your gift changed in another tab. Reload to review it.',
      });
    const result: GiftSession = {
      draft,
      version: crypto.randomUUID(),
      mode: 'demo',
      totalPence: giftTotal(draft, DESIGN_GIFT_OPTIONS),
    };
    await store(DEMO, result);
    return result;
  }
  await store(PREPARED, null);
  const current = await call<DraftResponse>('/checkout-draft');
  const saved = await call<DraftResponse>(
    '/checkout-draft',
    {
      method: 'PUT',
      cartVersion: version,
      body: {
        ...current.draft,
        giftCardDraft: draft,
        createAccount: draft.createAccount,
        purchaser: {
          email: draft.email,
          firstName: '',
          lastName: '',
          phone: '',
        },
      },
    },
    true,
  );
  if (!saved.draft?.giftCardDraft)
    throw new Error(
      'Your gift draft could not be confirmed. Please reload before continuing.',
    );
  let savedVersion = saved.cartVersion;
  if (draft.removed) {
    const removed = await call<{ cartVersion: string }>(
      '/gift-card-purchase',
      { method: 'DELETE', cartVersion: savedVersion },
      true,
    );
    savedVersion = removed.cartVersion;
  }
  return {
    draft: saved.draft.giftCardDraft,
    version: savedVersion,
    mode: 'live',
    totalPence: null,
  };
}
export function purchaseSelection(draft: GiftDraft, options: GiftOptions) {
  return {
    faceValue: draft.value,
    quantity: draft.quantity,
    deliveryMethod:
      draft.route === 'post'
        ? 'Post'
        : draft.route === 'box'
          ? 'InFoodBox'
          : 'Email',
    acceptedVersion: options.version,
    recipientName: `${draft.firstName} ${draft.lastName}`.trim(),
    recipientEmail: draft.route === 'email' ? draft.recipientEmail : null,
    sendDate: draft.route === 'email' ? draft.date : null,
    postingDate: draft.route === 'post' ? draft.date : null,
    postalAddress:
      draft.route === 'post'
        ? {
            line1: draft.line1,
            line2: draft.line2 || null,
            city: draft.city,
            region: draft.region || null,
            postcode: draft.postcode,
            countryCode: 'GB',
          }
        : null,
    recipientPhone: draft.route === 'post' ? draft.phone : null,
    message: draft.message || null,
    includeGreetingCard: draft.route !== 'email' && draft.includeGreetingCard,
  };
}
export async function prepareGift(
  draft: GiftDraft,
  version: string,
): Promise<GiftSession> {
  const options = await giftOptions();
  if (!options.enabled || !liveOrderingEnabled())
    throw new Error(
      'Gift-card purchasing is not open yet. Nothing has been charged.',
    );
  if (draft.quantity > options.maximumQuantity)
    throw new Error(
      'Multiple gift cards are awaiting the backend update. Your details are saved.',
    );
  if (Object.keys(validateGift(draft, options, londonToday())).length)
    throw new Error('Please check your gift details.');
  const saved = await saveGift(draft, version);
  const purchase = await call<{
    cartVersion: string;
    quote: { total: number };
  }>(
    '/gift-card-purchase',
    {
      method: 'PUT',
      cartVersion: saved.version,
      body: purchaseSelection(draft, options),
    },
    true,
  );
  await store(PREPARED, {
    cartId: (await cookie<Proof>(CART))?.cartId,
    version: purchase.cartVersion,
    totalPence: Math.round(purchase.quote.total * 100),
  });
  return {
    ...saved,
    version: purchase.cartVersion,
    totalPence: Math.round(purchase.quote.total * 100),
  };
}
export async function payGift(
  version: string,
  expectedTotalPence: number,
  origin: string,
) {
  if (!liveOrderingEnabled() || !(await giftOptions()).enabled)
    throw new Error(
      'Gift-card purchasing is not open yet. Nothing has been charged.',
    );
  const prepared = await cookie<{
    cartId: string;
    version: string;
    totalPence: number;
  }>(PREPARED);
  const proof = await cookie<Proof>(CART);
  if (
    !prepared ||
    prepared.cartId !== proof?.cartId ||
    prepared.version !== version ||
    prepared.totalPence !== expectedTotalPence
  )
    throw new Error('Review your current gift and total before paying.');
  const urls = returnUrls(origin);
  const config = await api<{ saleTerms?: { version: string } }>(
    '/commerce/config/storefront',
  );
  const current = await call<DraftResponse>('/checkout-draft');
  const accepted = await call<DraftResponse>(
    '/checkout-draft',
    {
      method: 'PUT',
      cartVersion: version,
      body: {
        ...current.draft,
        acceptedTermsVersion: config.saleTerms?.version,
      },
    },
    true,
  );
  const result = await call<CheckoutResultDto>(
    '/checkout',
    {
      method: 'POST',
      cartVersion: accepted.cartVersion,
      body: {
        provider: 'Stripe',
        paymentMethodType: 'Card',
        expectedTotal: expectedTotalPence / 100,
        returnUrl: urls.returnUrl.replace(
          '/box/payment/return',
          '/gift-card/payment/return',
        ),
        cancelUrl: urls.cancelUrl.replace(
          '/box/payment/return',
          '/gift-card/payment/return',
        ),
      },
    },
    true,
  );
  await store(PAYMENT, {
    orderId: result.orderId,
    paymentIntentId: result.paymentIntentId,
    guestOrderToken: result.guestOrderToken,
  });
  return {
    checkoutUrl: result.checkoutUrl,
    paymentStatus: result.paymentStatus,
  };
}
export async function giftPayment(
  saveProof = false,
): Promise<CartPaymentStateDto | null> {
  if ((await resolveDataMode()).mode === 'demo' || !(await cookie<Proof>(CART)))
    return null;
  const result = await call<
    CartPaymentStateDto & { guestOrderToken?: string | null }
  >(saveProof ? '/payment/confirmation' : '/payment');
  const { guestOrderToken, ...state } = result;
  if (saveProof && state.status === 'succeeded' && state.orderId)
    await store(PAYMENT, {
      orderId: state.orderId,
      paymentIntentId: state.paymentIntentId,
      guestOrderToken,
    });
  return state;
}
export async function recoverGift(
  version: string,
  paymentIntentId: string,
): Promise<CartPaymentStateDto> {
  const state = await call<CartPaymentStateDto>(
    '/payment/recover',
    { method: 'POST', cartVersion: version, body: { paymentIntentId } },
    true,
  );
  return state.status === 'succeeded'
    ? ((await giftPayment(true)) ?? state)
    : state;
}
export async function giftOrder(): Promise<StorefrontOrderDetailDto | null> {
  const proof = await cookie<{ orderId: string; guestOrderToken?: string }>(
    PAYMENT,
  );
  if (!proof) return null;
  const session = await readSession();
  return api(
    `/commerce/storefront/${proof.guestOrderToken ? 'guest-orders' : 'orders'}/${proof.orderId}`,
    {
      orderToken: proof.guestOrderToken,
      accessToken:
        session && !isExpired(session) ? session.accessToken : undefined,
    },
  );
}
