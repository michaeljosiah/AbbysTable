'use client';

import { selectionSummary } from '@/lib/aonik/personalisation';
import { purchaseBarClasses } from '@/components/purchase-bar/classes';
import { PurchaseBarShell } from '@/components/purchase-bar/PurchaseBarShell';

import { useDishOrder } from './DishOrderProvider';

/**
 * The dish page's mobile bar (Dish Landing v2 `.dl-bar`): the homepage bar's
 * treatment carrying a dish CTA instead of Build a Box — a named departure
 * approved for the dish pages only. "Add to box" runs the page's one
 * add-to-box action (`DishOrderProvider`), so it can never add something the
 * inline button would not.
 *
 * Shown once the inline CTA has been scrolled past and hidden from the footer
 * on — NOT by scroll direction: in Dish Landing v2 `barOn` is
 * `ctaPast && !drawer && !footNear`. It stays an offer to add THIS dish even
 * with a box active (the order state rewrites only the marketing bar).
 *
 * The second line names what will be added. The design reads the portion
 * ("Light Table · 225g") from its portion card; until the dish page moves to
 * that card (#22) it is the personaliser's own summary — "As Abby designed it"
 * or the chosen options.
 */
export function DishPurchaseBar() {
  const { optionGroups, choice, addToBox, pending } = useDishOrder();

  return (
    <PurchaseBarShell followsDirection={false}>
      <span className={purchaseBarClasses.text}>
        <span className={purchaseBarClasses.textLead}>Add to your box</span>
        <span className={purchaseBarClasses.textStrong}>
          {selectionSummary(optionGroups, choice.personalisation)}
        </span>
      </span>
      <button
        type="button"
        className={purchaseBarClasses.cta}
        onClick={addToBox}
        disabled={pending}
      >
        Add to box
      </button>
    </PurchaseBarShell>
  );
}
