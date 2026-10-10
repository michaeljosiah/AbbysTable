/** Approved Gifting v2 / Gift Card Checkout values. Live quotes use tenant options. */
export type GiftRoute = 'email' | 'post' | 'box';
export interface GiftOptions {
  enabled: boolean;
  version: string;
  maximumQuantity: number;
  draftVersion: number;
  values: number[];
  customMinimum: number | null;
  customMaximum: number | null;
  postage: number;
  greetingCardPrice: number;
  postingDays: (number | string)[];
  timezone: string | null;
  emailSendTime: string | null;
  neverExpires: boolean;
  validForDays: number | null;
  deliveryMethods: string[];
}
export const DESIGN_GIFT_OPTIONS: GiftOptions = {
  enabled: false,
  version: '',
  maximumQuantity: 10,
  draftVersion: 1,
  values: [50, 75, 100, 150],
  customMinimum: 1,
  customMaximum: 999,
  postage: 3.95,
  greetingCardPrice: 3,
  postingDays: [1, 2, 3, 4, 5],
  timezone: 'Europe/London',
  emailSendTime: null,
  neverExpires: false,
  validForDays: null,
  deliveryMethods: ['Email', 'Post', 'InFoodBox'],
};
export interface GiftDraft {
  value: number;
  route: GiftRoute;
  quantity: number;
  message: string;
  includeGreetingCard: boolean;
  email: string;
  firstName: string;
  lastName: string;
  recipientEmail: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postcode: string;
  phone: string;
  date: string;
  createAccount: boolean;
  removed: boolean;
  dismissed: boolean;
}
export const EMPTY_GIFT: GiftDraft = {
  value: 100,
  route: 'email',
  quantity: 1,
  message: '',
  includeGreetingCard: false,
  email: '',
  firstName: '',
  lastName: '',
  recipientEmail: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postcode: '',
  phone: '',
  date: '',
  createAccount: false,
  removed: false,
  dismissed: false,
};
/** Shared HTTP/storage boundary; incomplete form fields are valid draft data. */
export function decodeGiftDraft(value: unknown): GiftDraft | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const result = { ...EMPTY_GIFT };
  for (const key of Object.keys(EMPTY_GIFT) as (keyof GiftDraft)[]) {
    if (typeof source[key] !== typeof EMPTY_GIFT[key]) return null;
    const limit =
      key === 'message'
        ? 240
        : key === 'email' || key === 'recipientEmail'
          ? 254
          : key === 'date'
            ? 10
            : key === 'postcode'
              ? 16
              : key === 'phone'
                ? 32
                : 200;
    if (
      typeof source[key] === 'string' &&
      (source[key] as string).length > limit
    )
      return null;
    Object.assign(result, { [key]: source[key] });
  }
  return ['email', 'post', 'box'].includes(result.route) &&
    Number.isInteger(result.value) &&
    result.value >= 1 &&
    result.value <= 999 &&
    Number.isInteger(result.quantity) &&
    result.quantity >= 1 &&
    result.quantity <= 10
    ? result
    : null;
}
export function giftEntry(
  params: Record<string, string | string[] | undefined>,
): Partial<GiftDraft> {
  const value = Number(params.value);
  return {
    ...(Number.isInteger(value) && value >= 1 && value <= 999 ? { value } : {}),
    ...(params.route === 'email' ||
    params.route === 'post' ||
    params.route === 'box'
      ? { route: params.route }
      : {}),
  };
}
export function giftTotal(draft: GiftDraft, options: GiftOptions): number {
  if (draft.removed) return 0;
  // A single envelope and greeting card per recipient, as in the approved checkout.
  return Math.round(
    (draft.value * draft.quantity +
      (draft.route === 'post' ? options.postage : 0) +
      (draft.route !== 'email' && draft.includeGreetingCard
        ? options.greetingCardPrice
        : 0)) *
      100,
  );
}
export function validateGift(
  draft: GiftDraft,
  options: GiftOptions,
  today: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.test(draft.email)) errors.email = 'Enter your email address.';
  if (!draft.firstName.trim())
    errors.firstName = 'Enter the recipient’s first name.';
  if (draft.message.length > 240)
    errors.message = 'Use at most 240 characters.';
  if (
    !Number.isInteger(draft.quantity) ||
    draft.quantity < 1 ||
    draft.quantity > 10
  )
    errors.quantity = 'Choose 1–10 gift cards.';
  if (
    !Number.isInteger(draft.value) ||
    !(
      options.values.includes(draft.value) ||
      (options.customMinimum !== null &&
        options.customMaximum !== null &&
        draft.value >= options.customMinimum &&
        draft.value <= options.customMaximum)
    )
  )
    errors.value = 'Choose an available gift-card value.';
  if (draft.route === 'email' && !email.test(draft.recipientEmail))
    errors.recipientEmail = 'Enter the recipient’s email address.';
  if (draft.route === 'post') {
    if (!draft.line1.trim())
      errors.line1 = 'Enter the first line of the address.';
    if (!draft.city.trim()) errors.city = 'Enter the town or city.';
    if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(draft.postcode.trim()))
      errors.postcode = 'Enter a valid UK postcode.';
    if (!/^[+\d ()-]{7,32}$/.test(draft.phone))
      errors.phone = 'Enter a phone number for the courier.';
  }
  if (
    draft.route !== 'box' &&
    !isGiftDate(draft.date, draft.route, options, today)
  )
    errors.date = 'Choose an available date within the next year.';
  if (draft.removed) errors.order = 'Restore your gift card before continuing.';
  return errors;
}
export function londonToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export function isGiftDate(
  date: string,
  route: GiftRoute,
  options: GiftOptions,
  today: string,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  const max = new Date(`${today}T12:00:00Z`);
  max.setUTCDate(max.getUTCDate() + 365);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date &&
    date >= today &&
    parsed <= max &&
    (route !== 'post' ||
      options.postingDays.some(
        (day) => day === parsed.getUTCDay() || day === DAYS[parsed.getUTCDay()],
      ))
  );
}
export const giftMoney = (pence: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: pence % 100 ? 2 : 0,
  }).format(pence / 100);
