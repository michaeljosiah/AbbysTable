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

import { AonikError } from '@/lib/aonik/errors';
import type { PersonalisationSelection } from '@/lib/aonik/map';
import {
  CartUnavailableError,
  addBoxExtra,
  addBoxLine,
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
  productVariantId?: string;
  quantity?: number;
  personalisation?: PersonalisationSelection;
  applyToUnits?: number;
  lineId?: string;
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
        // Drift carries the repaired box so the UI can re-render from it.
        drift: error.drift,
      },
      { status: error.status },
    );
  }

  console.error('[api/cart] unexpected failure', error);
  return NextResponse.json({ error: 'The box could not be updated.' }, { status: 500 });
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

      case 'lines':
        if (!body.productVariantId) {
          return NextResponse.json({ error: 'productVariantId is required' }, { status: 400 });
        }
        return cartResponse(
          await addBoxLine({
            productVariantId: body.productVariantId,
            quantity: body.quantity ?? 1,
            personalisation: body.personalisation,
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
