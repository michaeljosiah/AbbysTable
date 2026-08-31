import assert from 'node:assert/strict';
import test from 'node:test';

import { AonikError } from '../src/lib/aonik/errors';
import { mapBoxQuote, type BoxCart, type BoxLine, type MappedOptionGroup } from '../src/lib/aonik/map';
import { CartMissingError, mapCartMissingError } from '../src/lib/cart/cartMissing';
import {
  afterCartMutation,
  cartExistsAfterProbe,
  projectAddOnLines,
  recordCartProjection,
} from '../src/lib/cart/convergence';
import { decodeDemoCart, extraLinePersonalisation } from '../src/lib/cart/demoStorage';
import {
  deleteExtra,
  patchDishPersonalisation,
  patchExtra,
  postExtra,
  type CartMutationRequest,
} from '../src/lib/cart/mutations';
import {
  admitCartRequest,
  adoptCartResponse,
  CartRequestError,
  processCartResponse,
  type CartResponse,
} from '../src/lib/cart/transport';

const cart = { cartId: 'cart-confirmed' } as BoxCart;
const repaired = { cartId: 'cart-repaired' } as BoxCart;

function runResponse(
  current: BoxCart | null,
  response: { ok: boolean; status: number },
  payload: CartResponse,
) {
  let projection = current;
  const events: string[] = [];
  let failure: unknown;

  try {
    processCartResponse(response, payload, (authoritative) => {
      projection = adoptCartResponse(projection, authoritative);
      events.push('adopt');
    });
    events.push('resolve');
  } catch (error) {
    failure = error;
    events.push('reject');
  }

  return { projection, events, failure };
}

test('production response processing adopts object/null/absence on success and error', () => {
  for (const [payload, expected] of [
    [{ cart: repaired }, repaired],
    [{ cart: null }, null],
    [{}, cart],
  ] as const) {
    const success = runResponse(cart, { ok: true, status: 200 }, payload);
    assert.equal(success.projection, expected);
    assert.deepEqual(success.events, ['adopt', 'resolve']);
    assert.equal(success.failure, undefined);

    const failed = runResponse(cart, { ok: false, status: 409 }, {
      ...payload,
      error: 'Mutation rejected',
      code: 'commerce.failure',
    });
    assert.equal(failed.projection, expected);
    assert.deepEqual(failed.events, ['adopt', 'reject']);
    assert.ok(failed.failure instanceof CartRequestError);
    assert.equal(failed.failure.code, 'commerce.failure');
  }
});

test('cart-missing HTTP mapping is non-2xx and carries authoritative null', () => {
  const mapped = mapCartMissingError(new CartMissingError('The projected box is stale.'));
  assert.ok(mapped.status < 200 || mapped.status >= 300);
  assert.deepEqual(mapped.payload, {
    cart: null,
    error: 'The projected box is stale.',
    code: 'cart.missing',
  });
});

test('CartProvider mutation seams invoke exact atomic dish and add-on requests once', async () => {
  const calls: Array<{ path: string; init: unknown }> = [];
  const request: CartMutationRequest = async (path, init) => {
    calls.push({ path, init });
  };

  await patchDishPersonalisation(
    request,
    'dish-line-1',
    { portion: 'full', protein: ['chicken', 'salmon'] },
    2,
  );
  await postExtra(request, 'extra-variant-1', 3, {
    sauces: ['pepper', 'ginger'],
  });
  await patchExtra(request, 'extra-line-1', {
    quantity: 4,
    personalisation: { sauces: ['pepper', 'ginger'] },
  });
  await deleteExtra(request, 'extra-line-1');

  assert.equal(calls.length, 4);
  assert.deepEqual(calls, [
    {
      path: '/lines/dish-line-1',
      init: {
        method: 'PATCH',
        body: {
          personalisation: { portion: 'full', protein: ['chicken', 'salmon'] },
          applyToUnits: 2,
        },
      },
    },
    {
      path: '/extras',
      init: {
        method: 'POST',
        body: {
          productVariantId: 'extra-variant-1',
          quantity: 3,
          personalisation: { sauces: ['pepper', 'ginger'] },
        },
      },
    },
    {
      path: '/lines/extra-line-1',
      init: {
        method: 'PATCH',
        body: {
          quantity: 4,
          personalisation: { sauces: ['pepper', 'ginger'] },
        },
      },
    },
    {
      path: '/lines/extra-line-1',
      init: { method: 'DELETE' },
    },
  ]);
});

test('synchronous production admission rejects a rapid second activation before operation', async () => {
  const queue = { current: Promise.resolve() as Promise<unknown> };
  const inFlight = { current: false };
  let operations = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const first = admitCartRequest(queue, inFlight, async () => {
    operations += 1;
    await gate;
    throw new Error('first rejected');
  });
  const duplicate = admitCartRequest(queue, inFlight, async () => {
    operations += 1;
  });

  await assert.rejects(
    duplicate,
    (error: unknown) =>
      error instanceof CartRequestError && error.code === 'cart.request_in_flight',
  );
  await Promise.resolve();
  assert.equal(operations, 1);

  release();
  await assert.rejects(first, /first rejected/);
  await admitCartRequest(queue, inFlight, async () => {
    operations += 1;
  });
  assert.equal(operations, 2, 'the queue remains usable after an admitted rejection');
});

test('stale probe returns false only for Aonik not-found and rethrows inconclusive failures', async () => {
  assert.equal(
    await cartExistsAfterProbe(async () => {
      throw new AonikError({ status: 404, path: '/cart', message: 'not found' });
    }),
    false,
  );
  assert.equal(await cartExistsAfterProbe(async () => undefined), true);

  const unavailable = new AonikError({ status: 503, path: '/cart', message: 'unavailable' });
  await assert.rejects(
    cartExistsAfterProbe(async () => {
      throw unavailable;
    }),
    (error: unknown) => error === unavailable,
  );

  const network = new Error('network failed');
  await assert.rejects(
    cartExistsAfterProbe(async () => {
      throw network;
    }),
    (error: unknown) => error === network,
  );
});

test('failed repaired projection suppresses success and cannot announce when error clears', () => {
  const last = { current: null as string | null };
  const effects: string[] = [];
  const observe = (signature: string, failed: boolean) => {
    if (recordCartProjection(last, signature, failed) === 'succeeded') effects.push('success');
  };

  observe('line-1:1', false);
  observe('line-1:2', true);
  assert.equal(last.current, 'line-1:2');
  observe('line-1:2', false);
  assert.deepEqual(effects, []);

  observe('line-1:3', false);
  assert.deepEqual(effects, ['success']);
});

test('demo decoder safely retains v1 fixed dish and extra selections', () => {
  const decoded = decodeDemoCart({
    boxSize: 6,
    isCustom: false,
    lines: [
      {
        lineId: 'dish-1',
        dishId: 'dish',
        slug: 'dish-slug',
        title: 'Dish',
        imageUrl: '/dish.png',
        quantity: 2,
        surchargePence: 150,
        personalisation: {
          portion: 'full',
          protein: 'chicken',
          side: 'rice',
          heatStep: 3,
        },
      },
    ],
    extras: [{ extraId: 'extra-puffpuff', quantity: 1, optionKey: '12' }],
  });

  assert.ok(decoded);
  assert.deepEqual(decoded.lines[0]?.personalisation, {
    portion: 'full',
    protein: 'chicken',
    side: 'rice',
    heat: '3',
  });
  assert.deepEqual(decoded.extras[0], {
    lineId: 'extra-puffpuff-1',
    variantId: 'extra-puffpuff',
    quantity: 1,
    personalisation: undefined,
    unitPricePence: undefined,
    legacyOptionKey: '12',
  });

  const soleGroup: MappedOptionGroup[] = [
    {
      key: 'size',
      label: 'Size',
      selectionMode: 'One',
      defaultChoiceKey: '6',
      choices: [
        { key: '6', label: '6 pieces', pricePence: 0 },
        { key: '12', label: '12 pieces', pricePence: 350 },
      ],
    },
  ];
  assert.deepEqual(extraLinePersonalisation(decoded.extras[0]!, soleGroup), { size: '12' });
  assert.equal(decodeDemoCart({ boxSize: 6, lines: 'not-an-array' }), null);
});

test('add-on projection preserves distinct authoritative line identities', () => {
  const source = [
    {
      lineId: 'extra-line-1',
      productId: 'extra-product',
      variantId: 'variant-1',
      name: 'Extra',
      quantity: 1,
      personalisation: { size: 'small' },
      personalisationSummary: 'Small',
      isDefaultPersonalisation: true,
      personalisationAdjustmentPence: 0,
      unitSurchargePence: 0,
      kind: 'AddOn',
      isUnavailable: false,
    },
    {
      lineId: 'extra-line-2',
      productId: 'extra-product',
      variantId: 'variant-1',
      name: 'Extra',
      quantity: 2,
      personalisation: { size: 'large' },
      personalisationSummary: 'Large',
      isDefaultPersonalisation: false,
      personalisationAdjustmentPence: 200,
      unitSurchargePence: 0,
      kind: 'AddOn',
      isUnavailable: false,
    },
  ] satisfies BoxLine[];

  assert.deepEqual(
    projectAddOnLines(source).map(({ lineId, variantId, quantity, personalisation }) => ({
      lineId,
      variantId,
      quantity,
      personalisation,
    })),
    [
      {
        lineId: 'extra-line-1',
        variantId: 'variant-1',
        quantity: 1,
        personalisation: { size: 'small' },
      },
      {
        lineId: 'extra-line-2',
        variantId: 'variant-1',
        quantity: 2,
        personalisation: { size: 'large' },
      },
    ],
  );
});

test('caller success seam does not navigate, close or announce after rejection', async () => {
  const effects: string[] = [];
  await assert.rejects(
    afterCartMutation(
      async () => {
        throw new Error('write rejected');
      },
      () => effects.push('success'),
    ),
    /write rejected/,
  );
  assert.deepEqual(effects, []);
});

test('server quote mapping preserves component order and signed amounts', () => {
  const quote = mapBoxQuote({
    components: [
      { key: 'boxPrice', amount: 95 },
      { key: 'personalisation', amount: -2 },
      { key: 'discount', amount: -5 },
    ],
    deliveryList: 10,
    total: 88,
    currency: 'GBP',
    unitsSelected: 6,
    boxSize: 6,
    spacesLeft: 0,
    isFull: true,
  });

  assert.deepEqual(quote.components, [
    { key: 'boxPrice', amountPence: 9500 },
    { key: 'personalisation', amountPence: -200 },
    { key: 'discount', amountPence: -500 },
  ]);
  assert.equal(quote.totalPence, 8800);
});
