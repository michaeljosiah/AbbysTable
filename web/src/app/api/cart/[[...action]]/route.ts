/**
 * The `/api/cart/*` seam.
 *
 * These handlers are the only code that can see the cart cookie. The provider
 * calls them same-origin; the token never crosses into client JavaScript, and
 * Aonik never sees a request that did not come from this server.
 *
 * Every successful cart operation returns the whole `{ cart }`. A mutation
 * against a missing cart returns a non-2xx `{ cart: null, error, code }`, so the
 * provider can clear stale state before rejecting the caller.
 *
 * Every write forwards the tab's `X-Cart-Version` (the version of the box it
 * last adopted) to Aonik, which refuses a change based on an older box. The
 * refusal comes back as 409 `cart.conflict` / `cart.locked` carrying the box as
 * it really is, so the tab shows the current box before anything is retried.
 */

import { NextResponse } from 'next/server';

import type { BoxCartDto } from '@/lib/aonik/dto';
import { AONIK_CODES, AonikError } from '@/lib/aonik/errors';
import { mapBoxCart, type BoxCart, type PersonalisationSelection } from '@/lib/aonik/map';
import { CartMissingError, mapCartMissingError } from '@/lib/cart/cartMissing';
import { ORDERING_DISABLED_CODE } from '@/lib/cart/ordering';
import { CART_CONFLICT_CODE, CART_LOCKED_CODE, CART_VERSION_HEADER } from '@/lib/cart/transport';
import {
  CartUnavailableError,
  OrderingDisabledError,
  addBoxExtra,
  addBoxLine,
  checkoutBoxCart,
  continueBoxCart,
  createBoxCart,
  getBoxCart,
  removeBoxLine,
  setBoxSize,
  updateBoxLine,
} from '@/lib/cart/server';

/** A cart response is never cacheable. */
export const dynamic = 'force-dynamic';

interface Body {
  bundleProductId?: string;
  size?: number;
  /** Dish lines are named by product slug; extras already know their variant. */
  slug?: string;
  /** Chosen option key per group key, pre-encoding. See `addBoxLine`. */
  choices?: PersonalisationSelection;
  productVariantId?: string;
  quantity?: number;
  personalisation?: PersonalisationSelection;
  applyToUnits?: number;
  lineId?: string;
  discountCode?: string;
  firstLine?: {
    productVariantId: string;
    quantity: number;
    personalisation?: PersonalisationSelection;
  };
}

/**
 * Customer copy for a refused write. Ours; the design has no wording for it.
 * The cart alert adds "Please try the action again." beneath a conflict, so the
 * message does not say it twice — and a locked box gets no such line at all.
 */
const REFUSED_WRITE_MESSAGES = {
  [CART_CONFLICT_CODE]: 'Your box changed in another window, so we’ve updated it here.',
  [CART_LOCKED_CODE]: 'Your box can’t be changed while its payment is being processed.',
} as const;

/** The version this tab's change is based on, as the provider sent it. */
function versionOf(request: Request): string | undefined {
  return request.headers.get(CART_VERSION_HEADER)?.trim() || undefined;
}

/**
 * Turns an `AonikError` into a response the UI can branch on, WITHOUT leaking
 * anything Aonik deliberately withholds — a 404 stays opaque about whether the
 * cart is unknown or simply not ours.
 */
async function errorResponse(error: unknown) {
  if (error instanceof CartMissingError) {
    const mapped = mapCartMissingError(error);
    return NextResponse.json(mapped.payload, { status: mapped.status });
  }

  // Demo mode: these routes are not the path in use. Say so plainly rather
  // than logging it as a fault.
  if (error instanceof CartUnavailableError) {
    return NextResponse.json({ error: error.message, code: 'cart.unavailable' }, { status: 503 });
  }

  // Ordering is switched off. Nothing was sent to Aonik and the box is
  // untouched, so the response carries no cart and the provider keeps its own.
  if (error instanceof OrderingDisabledError) {
    return NextResponse.json({ error: error.message, code: ORDERING_DISABLED_CODE }, { status: 403 });
  }

  /*
   * The box moved on (another tab or device) or is mid-payment. Nothing was
   * changed, and the version the tab holds is stale, so the answer carries the
   * box as it is now — with its current version — for the tab to adopt before
   * the customer tries again. Never retried here: re-sending the change against
   * a box the customer has not seen is exactly what the version prevents.
   */
  if (error instanceof AonikError && error.isCartWriteRefused) {
    const code = error.code === AONIK_CODES.cartLocked ? CART_LOCKED_CODE : CART_CONFLICT_CODE;
    let cart: BoxCart | null | undefined;
    try {
      cart = await getBoxCart();
    } catch (readFailure) {
      // The refusal stands either way; without a fresh box the tab keeps its own.
      console.error('[api/cart] could not re-read the box after a refused write', readFailure);
    }
    return NextResponse.json({ error: REFUSED_WRITE_MESSAGES[code], code, cart }, { status: 409 });
  }

  if (error instanceof AonikError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        rule: error.rule,
        // Drift carries the repaired box. It is mapped HERE, not shipped raw:
        // the client would otherwise have to know Aonik's decimal money and DTO
        // field names, and every mapping rule would exist in two places. The UI
        // adopts it exactly as it adopts any other cart response.
        cart: mapDriftCart(error),
      },
      { status: error.status },
    );
  }

  console.error('[api/cart] unexpected failure', error);
  return NextResponse.json({ error: 'The box could not be updated.' }, { status: 500 });
}

/**
 * The refreshed box out of a 409 drift body, or undefined.
 *
 * Undefined and null mean different things downstream — undefined is "this
 * error carried no box", null is "the cart is gone" — so a malformed drift body
 * must not collapse into null and blank someone's box on an unrelated failure.
 */
function mapDriftCart(error: AonikError) {
  if (!error.drift) return undefined;
  try {
    const { box, quote, changes, cartVersion } = error.drift;
    return mapBoxCart({ box, quote, changes, cartToken: null, cartVersion } as BoxCartDto);
  } catch (mappingFailure) {
    console.error('[api/cart] drift body did not map', mappingFailure);
    return undefined;
  }
}

/** A null cart means the cookie was dropped: the UI resets to the empty box. */
function cartResponse(cart: unknown) {
  return NextResponse.json({ cart });
}

export async function GET() {
  try {
    return cartResponse(await getBoxCart());
  } catch (error) {
    return await errorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ action?: string[] }> }) {
  const { action = [] } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Body;
  const version = versionOf(request);

  try {
    switch (action.join('/')) {
      case 'create':
        if (!body.bundleProductId || typeof body.size !== 'number') {
          return NextResponse.json({ error: 'bundleProductId and size are required' }, { status: 400 });
        }
        return cartResponse(
          (
            await createBoxCart({
              bundleProductId: body.bundleProductId,
              size: body.size,
              firstLine: body.firstLine,
            })
          ).cart,
        );

      // A dish is named by slug: browse rows carry no variant id, so the
      // product → variant resolution belongs on this side of the seam.
      case 'lines':
        if (!body.slug) {
          return NextResponse.json({ error: 'slug is required' }, { status: 400 });
        }
        return cartResponse(
          await addBoxLine(
            {
              slug: body.slug,
              quantity: body.quantity ?? 1,
              choices: body.choices,
            },
            version,
          ),
        );

      case 'extras':
        if (!body.productVariantId) {
          return NextResponse.json({ error: 'productVariantId is required' }, { status: 400 });
        }
        return cartResponse(
          await addBoxExtra(
            {
              productVariantId: body.productVariantId,
              quantity: body.quantity ?? 1,
              personalisation: body.personalisation,
            },
            version,
          ),
        );

      case 'continue':
        return cartResponse(await continueBoxCart(version));

      // Not idempotent and the only call that creates durable state, so it is
      // never retried. A 409 drift falls to `errorResponse`, which forwards the
      // refreshed box for the review page to re-render from.
      case 'checkout': {
        const result = await checkoutBoxCart({ discountCode: body.discountCode }, version);
        /*
         * `cart: null` is not decoration — checkout has just deleted the cart
         * cookie, so it is the literal truth, and it is what resets the
         * provider. Returning only the order left `payload.cart` undefined,
         * which the engine reads as "this response carried no box, leave the
         * current one alone" — so the client went on holding the box it had
         * just bought until something else happened to refresh it.
         */
        return NextResponse.json({ order: result, cart: null });
      }

      default:
        return NextResponse.json({ error: 'Unknown cart action' }, { status: 404 });
    }
  } catch (error) {
    return await errorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ action?: string[] }> }) {
  const { action = [] } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Body;
  const version = versionOf(request);

  try {
    // `size` and `lines/{lineId}` are the two patchable surfaces.
    if (action[0] === 'size') {
      if (typeof body.size !== 'number') {
        return NextResponse.json({ error: 'size is required' }, { status: 400 });
      }
      return cartResponse(await setBoxSize(body.size, version));
    }

    if (action[0] === 'lines' && action[1]) {
      return cartResponse(
        await updateBoxLine(
          action[1],
          {
            quantity: body.quantity,
            personalisation: body.personalisation,
            applyToUnits: body.applyToUnits,
          },
          version,
        ),
      );
    }

    return NextResponse.json({ error: 'Unknown cart action' }, { status: 404 });
  } catch (error) {
    return await errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ action?: string[] }> }) {
  const { action = [] } = await context.params;

  try {
    if (action[0] === 'lines' && action[1]) {
      return cartResponse(await removeBoxLine(action[1], versionOf(request)));
    }
    return NextResponse.json({ error: 'Unknown cart action' }, { status: 404 });
  } catch (error) {
    return await errorResponse(error);
  }
}
