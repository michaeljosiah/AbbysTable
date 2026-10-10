/**
 * Discount codes at checkout, React-free (`tests/checkout.test.tsx`).
 *
 * Aonik holds ONE code per cart, checks it the moment it is applied and moves
 * the total there and then (aonik#355). So the page says what actually
 * happened — applied, or the real reason it was not — and never "we'll apply
 * it at payment" or "something went wrong" (SHOPPING-STATE §39). The reason
 * wording is ours, pending copy sign-off (#37, D7).
 */

/** Codes are trimmed and upper-cased, as Aonik stores them; 64 characters at most. */
export const CODE_MAX_LENGTH = 64;

export function normaliseCode(raw: string): string {
  return raw.trim().toUpperCase();
}

const REASONS: Record<string, string> = {
  'commerce.discount_invalid': 'We couldn’t apply that code. Check it and try again.',
  'commerce.discount_expired': 'This code has expired.',
  'commerce.discount_already_used': 'This code has already been used as many times as it can be.',
  'commerce.discount_not_eligible': 'This code doesn’t apply to the items in your box.',
  'commerce.discount_inactive': 'This code isn’t active yet.',
  'commerce.discount_currency_mismatch': 'This code can’t be used with this order.',
};

/** Why a code was not applied, in the customer's words. */
export function codeRefusal(code: string | undefined): string {
  return (code && REASONS[code]) ?? 'We couldn’t apply that code just now. Please try again.';
}

/** Whether Aonik's code is one of its typed refusals — the code, not the page, at fault. */
export function isCodeRefusal(code: string | undefined): boolean {
  return Boolean(code && code in REASONS);
}

/** The line under the field once a code is on the cart. */
export function appliedLine(code: string): string {
  return `${code} has been applied to your order.`;
}

/**
 * A saved code that has stopped applying (it expired, or the box changed so
 * it no longer qualifies): checkout would refuse it, so it is said, and it
 * must be removed before paying.
 */
export function lapsedLine(code: string, reasonCode: string | undefined): string {
  return `${code} can no longer be applied. ${codeRefusal(reasonCode)} Remove it to continue.`;
}
