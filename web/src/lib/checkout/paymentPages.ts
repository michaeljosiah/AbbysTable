/**
 * The payment-status pages' rules and copy, React-free
 * (`tests/payment.test.tsx`; design: Payment Processing / Payment Not
 * Completed / Payment Cancelled, verbatim).
 *
 * Which page shows is decided from AONIK's state, never from the browser — a
 * return from Stripe is navigation, not proof of anything (build-handoff
 * §3ae). The one thing the return can add is which button brought the
 * customer back, and only to choose between two pages Aonik's state already
 * allows: a closed attempt the customer cancelled reads "Payment was
 * cancelled"; one closed any other way reads "Payment wasn't completed".
 */

import type { Faq } from '@/components/checkout/HelpPanel';

export type PaymentPageKind = 'processing' | 'failed' | 'notCompleted' | 'cancelled';

/**
 * Where `/box/payment` goes for the payment Aonik reports. `outcome` is the
 * return handler's marker (`cancelled`, `failed`, `checking`) — display only.
 */
export function paymentStatusPage(
  state: { status: string } | null,
  outcome: string | null,
): { kind: PaymentPageKind; checking: boolean } | { redirect: '/box/confirmation' } | null {
  if (!state) return null;
  switch (state.status) {
    case 'succeeded':
      return { redirect: '/box/confirmation' };
    case 'failed':
      // Declined, but Stripe may still take another card on the same session:
      // nothing is proven closed, so "No charges have been made" is not said.
      return { kind: 'failed', checking: false };
    case 'cancelled':
      // Proven closed and unpaid (Aonik's recovery). Cancelled only when the
      // customer pressed Stripe's own back link and the attempt had not failed.
      return { kind: outcome === 'cancelled' ? 'cancelled' : 'notCompleted', checking: false };
    default:
      // processing, requires_action, or anything new: never offer to pay again.
      return { kind: 'processing', checking: outcome === 'checking' };
  }
}

/** After this long unresolved, the processing page says it is checking (SHOPPING-STATE §42). */
export const SLOW_PAYMENT_MS = 20_000;

/**
 * The processing page's poll: 2s, 5s, then every 10s — well inside Aonik's
 * shared 30-a-minute allowance — and 30s after a 429.
 */
export function nextPollDelay(attempt: number, throttled: boolean): number {
  if (throttled) return 30_000;
  if (attempt === 0) return 2_000;
  if (attempt === 1) return 5_000;
  return 10_000;
}

const SECURE: Faq = {
  id: 'secure',
  question: 'Is my payment secure?',
  answer: 'Yes. Your payment is processed by our secure payment provider.',
};

const DATE_HELD: Faq = {
  id: 'date',
  question: 'Is my delivery date still held?',
  answer:
    'Delivery dates are held for a short time during checkout. If yours is no longer available, you can choose another from your delivery details.',
};

const NOT_COMPLETED_FAQS: Faq[] = [
  {
    id: 'why',
    question: 'Why didn’t my payment go through?',
    answer:
      'Usually a detail didn’t match, the card was declined by your bank, or the bank asked for extra verification that wasn’t completed. Check your details and try again, or use a different payment method.',
  },
  {
    id: 'charged',
    question: 'Have I been charged?',
    answer:
      'No. Nothing is charged until your payment is confirmed. If your bank shows a pending amount, it is released automatically.',
  },
  {
    id: 'saved',
    question: 'Is my order still saved?',
    answer: 'Yes. Your box, dishes, extras and delivery details are kept, so you can pick up where you left off.',
  },
  DATE_HELD,
  SECURE,
];

export const PAYMENT_PAGES: Record<
  PaymentPageKind,
  { title: string; lede: string; panelTitle: string; panelText: string; faqs: Faq[] }
> = {
  processing: {
    title: 'We’re confirming your payment',
    lede: 'Please don’t close this page or refresh your browser. We’ll confirm your payment and show your order details shortly.',
    panelTitle: 'Your order is safe',
    panelText: 'We’ve received your order details and are confirming your payment with our secure payment provider.',
    faqs: [
      {
        id: 'how-long',
        question: 'How long does confirming my payment take?',
        answer:
          'Usually a few seconds. Please keep this page open — we’ll show your order details as soon as your payment is confirmed.',
      },
      {
        id: 'twice',
        question: 'Will I be charged twice if the page reloads?',
        answer: 'No. Your order is only confirmed once, however many times the page reloads.',
      },
      {
        id: 'fails',
        question: 'What if my payment doesn’t go through?',
        answer: 'Nothing is charged and your order is kept. You’ll be able to try again or use a different payment method.',
      },
      {
        id: 'email',
        question: 'Will I get a confirmation email?',
        answer: 'Yes. Once your payment is confirmed we’ll email your order confirmation and delivery details.',
      },
      SECURE,
    ],
  },
  failed: {
    title: 'Payment wasn’t completed',
    lede: 'Your order is still here. You can try again or use a different payment method.',
    panelTitle: 'Your payment didn’t go through',
    // Not yet proven closed (a declined card can leave a pending authorisation): no "No charges".
    panelText: 'Please check your details or try another payment method.',
    faqs: NOT_COMPLETED_FAQS,
  },
  notCompleted: {
    title: 'Payment wasn’t completed',
    lede: 'Your order is still here. You can try again or use a different payment method.',
    panelTitle: 'Your payment didn’t go through',
    panelText: 'No charges have been made. Please check your details or try another payment method.',
    faqs: NOT_COMPLETED_FAQS,
  },
  cancelled: {
    title: 'Payment was cancelled',
    lede: 'Nothing has been charged and your order is still here.',
    panelTitle: 'You cancelled the payment',
    panelText: 'You can continue and try again when you’re ready.',
    faqs: [
      { id: 'charged', question: 'Have I been charged?', answer: 'No. Nothing is charged until you complete your payment.' },
      {
        id: 'saved',
        question: 'Is my order still saved?',
        answer: 'Yes. Your box, dishes, extras and delivery details are kept, so you can continue when you’re ready.',
      },
      DATE_HELD,
      {
        id: 'change',
        question: 'Can I change my order before paying?',
        answer: 'Yes. Return to checkout to update your details, or go back through your box before you pay.',
      },
      SECURE,
    ],
  },
};
