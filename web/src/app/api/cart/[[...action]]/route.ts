/**
 * The `/api/cart/*` seam.
 *
 * These handlers are the only code that can see the cart cookie. The provider
 * calls them same-origin; the token never crosses into client JavaScript, and
 * Aonik never sees a request that did not come from this server.
 *
 * Every response is the whole `{ cart }` — Aonik returns the full box on every
 * mutation, and the provider replaces its state wholesale rather than
 * reconciling deltas. That is what makes concurrent tabs self-correct.
 */

import { NextResponse } from 'next/server';

import type { BoxCartDto } from '@/lib/aonik/dto';
import { AonikError } from '@/lib/aonik/errors';
import { mapBoxCart, type PersonalisationSelection } from '@/lib/aonik/map';
import {
  CartUnavailableError,
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
  choices?: Record<string, string>;
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
 * Turns an `AonikError` into a response the UI can branch on, WITHOUT leaking
 * anything Aonik deliberately withholds — a 404 stays opaque about whether the
 * cart is unknown or simply not ours.
 */
function errorResponse(error: unknown) {
  // Demo mode: these routes are not the path in use. Say so plainly rather
  // than logging it as a fault.
  if (error instanceof CartUnavailableError) {
    return NextResponse.json({ error: error.message, code: 'cart.unavailable' }, { status: 503 });
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
    const { box, quote, changes } = error.drift;
    return mapBoxCart({ box, quote, changes, cartToken: null } as BoxCartDto);
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
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ action?: string[] }> }) {
  const { action = [] } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Body;

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
          await addBoxLine({
            slug: body.slug,
            quantity: body.quantity ?? 1,
            choices: body.choices,
          }),
        );

      case 'extras':
        if (!body.productVariantId) {
          return NextResponse.json({ error: 'productVariantId is required' }, { status: 400 });
        }
        return cartResponse(
          await addBoxExtra({
            productVariantId: body.productVariantId,
            quantity: body.quantity ?? 1,
            personalisation: body.personalisation,
          }),
        );

      case 'continue':
        return cartResponse(await continueBoxCart());

      // Not idempotent and the only call that creates durable state, so it is
      // never retried. A 409 drift falls to `errorResponse`, which forwards the
      // refreshed box for the review page to re-render from.
      case 'checkout': {
        const result = await checkoutBoxCart({ discountCode: body.discountCode });
        if (!result) {
          // The cart is gone or was never ours; there is nothing to check out.
          return NextResponse.json({ error: 'There is no box to check out.' }, { status: 404 });
        }
        return NextResponse.json({ order: result });
      }

      default:
        return NextResponse.json({ error: 'Unknown cart action' }, { status: 404 });
    }
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ action?: string[] }> }) {
  const { action = [] } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Body;

  try {
    // `size` and `lines/{lineId}` are the two patchable surfaces.
    if (action[0] === 'size') {
      if (typeof body.size !== 'number') {
        return NextResponse.json({ error: 'size is required' }, { status: 400 });
      }
      return cartResponse(await setBoxSize(body.size));
    }

    if (action[0] === 'lines' && action[1]) {
      return cartResponse(
        await updateBoxLine(action[1], {
          quantity: body.quantity,
          personalisation: body.personalisation,
          applyToUnits: body.applyToUnits,
        }),
      );
    }

    return NextResponse.json({ error: 'Unknown cart action' }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ action?: string[] }> }) {
  const { action = [] } = await context.params;

  try {
    if (action[0] === 'lines' && action[1]) {
      return cartResponse(await removeBoxLine(action[1]));
    }
    return NextResponse.json({ error: 'Unknown cart action' }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}
