/**
 * The Next delivery card's progress (design: My Account): Aonik's four
 * fulfilment steps, with the one the order is at marked current. Pure; the card
 * renders what this says. The headline wording is the design's for Cooking and
 * ours for the others (it awaits sign-off).
 */

export const TRACKER_STEPS = [
  { key: 'Confirmed', label: 'Confirmed' },
  { key: 'Cooking', label: 'Cooking' },
  { key: 'OutForDelivery', label: 'Out for delivery' },
  { key: 'Delivered', label: 'Delivered' },
] as const;

export type TrackerState = 'done' | 'now' | 'todo';

export interface DeliveryTracker {
  headline: string;
  steps: Array<{ label: string; state: TrackerState }>;
}

const HEADLINES: Record<string, string> = {
  Confirmed: 'Your order is confirmed',
  Cooking: 'We’re preparing your box',
  OutForDelivery: 'Your box is on its way',
};

/**
 * The tracker for an order's fulfilment status, or null when it is not one of
 * the four (an unknown or missing status draws no tracker rather than a guess).
 */
export function deliveryTracker(fulfilmentStatus: string | undefined): DeliveryTracker | null {
  const at = TRACKER_STEPS.findIndex((step) => step.key === fulfilmentStatus);
  const headline = fulfilmentStatus ? HEADLINES[fulfilmentStatus] : undefined;
  if (at < 0 || !headline) return null;

  return {
    headline,
    steps: TRACKER_STEPS.map((step, index) => ({
      label: step.label,
      state: index < at ? 'done' : index === at ? 'now' : 'todo',
    })),
  };
}
